#!/usr/bin/env node
/**
 * Uploads to Google Play with the Play Developer API. No dependencies.
 *
 *   node scripts/play-publish.mjs check     access test, changes nothing
 *   node scripts/play-publish.mjs bundle    release AAB to the internal track
 *   node scripts/play-publish.mjs listing   store texts, screenshots, feature graphic
 *
 * Key: ~/.android/play-service-account.json (or PLAY_KEY=path). The service
 * account needs "Release apps to testing tracks" and, for listing, "Manage
 * store presence" in Play Console. Texts and release notes come from
 * store/texts-fi.md, images from store/out/android (store/make-screens.py).
 *
 * Note: listing changes are public as soon as they are committed, whatever
 * track the new version is on.
 */
import { createSign } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE = "com.teksti_tv_mobile";
const ROOT = new URL("..", import.meta.url).pathname;
const AAB = join(ROOT, "android/app/build/outputs/bundle/release/app-release.aab");
const IMAGES = join(ROOT, "store/out/android");
const TEXTS = join(ROOT, "store/texts-fi.md");
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}`;

const key = JSON.parse(
  readFileSync(process.env.PLAY_KEY ?? join(homedir(), ".android/play-service-account.json"), "utf8"),
);

const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

const getToken = async () => {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
};

const token = await getToken();

const call = async (method, url, body, contentType = "application/json") => {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": contentType } : {}) },
    body: body && contentType === "application/json" ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.replace(API, "").replace(UPLOAD, "")}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
};

/** The fenced block that follows a "**Label**" line in texts-fi.md. */
const textBlock = (section, label) => {
  const md = readFileSync(TEXTS, "utf8");
  const part = md.slice(md.indexOf(`## ${section}`));
  const m = part.slice(part.indexOf(`**${label}**`)).match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`texts-fi.md: no "${label}" under ${section}`);
  return m[1].trim();
};

/** Runs fn inside an edit; commits it only when commit is true. */
const withEdit = async (commit, fn) => {
  const edit = await call("POST", `${API}/edits`);
  const url = `${API}/edits/${edit.id}`;
  try {
    await fn(url, `${UPLOAD}/edits/${edit.id}`);
    if (commit) {
      await call("POST", `${url}:commit`);
      console.log("Committed.");
    }
  } finally {
    if (!commit) await call("DELETE", url).catch(() => {});
  }
};

const check = () =>
  withEdit(false, async (url) => {
    const details = await call("GET", `${url}/details`);
    console.log("Default language:", details.defaultLanguage);
    const { tracks = [] } = await call("GET", `${url}/tracks`);
    for (const t of tracks) {
      for (const r of t.releases ?? []) {
        console.log(`${t.track}: ${r.name ?? ""} ${r.versionCodes?.join(",") ?? ""} ${r.status}`);
      }
    }
    const { listings = [] } = await call("GET", `${url}/listings`);
    console.log("Listings:", listings.map((l) => `${l.language} "${l.title}"`).join(", "));
  });

const bundle = () =>
  withEdit(true, async (url, upload) => {
    const { defaultLanguage } = await call("GET", `${url}/details`);
    console.log("Uploading", AAB);
    const b = await call("POST", `${upload}/bundles?uploadType=media`, readFileSync(AAB), "application/octet-stream");
    console.log("Uploaded version code", b.versionCode);
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    await call("PUT", `${url}/tracks/internal`, {
      track: "internal",
      releases: [
        {
          name: `${pkg.version} (${b.versionCode})`,
          versionCodes: [String(b.versionCode)],
          status: "completed",
          releaseNotes: [{ language: defaultLanguage, text: textBlock("Google Play", "Release notes") }],
        },
      ],
    });
    console.log("Internal track:", pkg.version, b.versionCode);
  });

const listing = () =>
  withEdit(true, async (url, upload) => {
    const { defaultLanguage: lang } = await call("GET", `${url}/details`);
    await call("PATCH", `${url}/listings/${lang}`, {
      title: textBlock("Google Play", "App name"),
      shortDescription: textBlock("Google Play", "Short description"),
      fullDescription: textBlock("App Store", "Description"),
    });
    console.log("Texts updated for", lang);
    const png = (f) => readFileSync(join(IMAGES, f));
    await call("DELETE", `${url}/listings/${lang}/phoneScreenshots`);
    const shots = readdirSync(IMAGES).filter((f) => /^\d+-.*\.png$/.test(f)).sort();
    for (const f of shots) {
      await call("POST", `${upload}/listings/${lang}/phoneScreenshots?uploadType=media`, png(f), "image/png");
      console.log("Screenshot", f);
    }
    await call("DELETE", `${url}/listings/${lang}/featureGraphic`);
    await call("POST", `${upload}/listings/${lang}/featureGraphic?uploadType=media`, png("feature-graphic.png"), "image/png");
    console.log("Feature graphic");
  });

const commands = { check, bundle, listing };
const cmd = commands[process.argv[2]];
if (!cmd) {
  console.error(`Usage: node scripts/play-publish.mjs ${Object.keys(commands).join("|")}`);
  process.exit(1);
}
await cmd();
