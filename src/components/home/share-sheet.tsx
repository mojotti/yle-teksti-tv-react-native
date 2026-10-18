import React, { useContext, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import Share from "react-native-share";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import Clipboard from "@react-native-clipboard/clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageContext } from "../../providers/page";
import { getPageImgSrc, getPageWebUrl } from "../../utils";
import { fetchDataUri } from "../../utils/offline";
import { useTheme } from "../../theme/theme";
import { Icon, Segmented } from "../ui";

/** Teletext page images are 720 × 432. */
const IMAGE_RATIO = 432 / 720;
const CAPTION_HEIGHT = 36;

const formatTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return `${d.getDate()}.${d.getMonth() + 1}. klo ${d.getHours()}.${String(d.getMinutes()).padStart(2, "0")}`;
};

const ensureSavePermission = async () => {
  if (Platform.OS !== "android" || Platform.Version >= 29) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Shares or saves the page as an image with a caption strip, so a forwarded
 * picture still says which page and when. Multi-page pages can share all
 * subpages at once.
 */
export const ShareSheet: React.FC<{
  visible: boolean;
  page: string;
  subPage: string;
  onClose: () => void;
}> = ({ visible, page, subPage, onClose }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { textTvResponse } = useContext(PageContext);
  const [scope, setScope] = useState<"one" | "all">("one");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  // The image currently rendered into the capture view.
  const [renderSub, setRenderSub] = useState(subPage);
  const shotRef = useRef<View>(null);
  const loaded = useRef<(() => void) | null>(null);
  const stamp = useRef(Date.now());
  // Images as local data URIs: drawing a network image into a snapshot can
  // come out black (react-native-view-shot on the new architecture).
  const [uris, setUris] = useState<Record<string, string>>({});
  const urisRef = useRef<Record<string, string>>({});

  const count = Number(textTvResponse?.page.subPageCount || 1);
  // Subpage "time" is a rotation interval; the page's time is its update.
  const pageTime = textTvResponse?.page.time;

  useEffect(() => {
    if (visible) {
      stamp.current = Date.now();
      urisRef.current = {};
      setUris({});
      setRenderSub(subPage);
      setScope("one");
      setMessage(undefined);
      ensureUri(subPage).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, subPage]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const remote = (n: string) =>
    `${getPageImgSrc(page, n)}&cacheValid=${stamp.current}`;

  async function ensureUri(n: string) {
    if (urisRef.current[n]) {
      return;
    }
    const uri = await fetchDataUri(remote(n));
    urisRef.current = { ...urisRef.current, [n]: uri };
    setUris(urisRef.current);
  }

  if (!visible) {
    return null;
  }

  /** Renders subpage `n` into the capture view and returns its PNG file. */
  const capture = async (n: string): Promise<string> => {
    if (!urisRef.current[n] || n !== renderSub) {
      await new Promise<void>((resolve, reject) => {
        loaded.current = () => resolve();
        ensureUri(n)
          .then(() => setRenderSub(n))
          .catch(reject);
      });
    }
    // Let the decoded image reach the screen before the snapshot.
    await new Promise<void>((r) => setTimeout(() => r(), 80));
    const file = await captureRef(shotRef, {
      format: "png",
      quality: 1,
      width: 1080,
      result: "tmpfile",
      useRenderInContext: Platform.OS === "ios",
    });
    return file.startsWith("file://") ? file : `file://${file}`;
  };

  const captureAll = async () => {
    const subs =
      scope === "all"
        ? Array.from({ length: count }, (_, i) => String(i + 1))
        : [subPage];
    const files: string[] = [];
    for (const n of subs) {
      files.push(await capture(n));
    }
    if (renderSub !== subPage) {
      setRenderSub(subPage);
    }
    return files;
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await action();
    } catch {
      setMessage("Kuvan tekeminen epäonnistui. Yritä uudelleen.");
    } finally {
      setBusy(false);
    }
  };

  const shareImages = () =>
    run(async () => {
      const files = await captureAll();
      const urls = files.map((f) =>
        f.startsWith("file://") ? f : `file://${f}`,
      );
      await Share.open({
        urls,
        type: "image/png",
        title: `Teksti-TV ${page}`,
        failOnCancel: false,
      });
    });

  const saveImages = () =>
    run(async () => {
      if (!(await ensureSavePermission())) {
        setMessage("Kuvien tallentamiseen tarvitaan lupa asetuksista.");
        return;
      }
      const files = await captureAll();
      for (const f of files) {
        await CameraRoll.saveAsset(f, { type: "photo", album: "Teksti-TV" });
      }
      setMessage(
        files.length > 1
          ? `${files.length} kuvaa tallennettu albumiin Teksti-TV.`
          : "Tallennettu kuviin, albumiin Teksti-TV.",
      );
    });

  const copyLink = () => {
    Clipboard.setString(getPageWebUrl(page));
    setMessage("Linkki kopioitu.");
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        onPress={onClose}
        accessibilityLabel="Sulje"
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.sheet,
            borderColor: theme.surfaceBorder,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
        <View style={styles.grab} />
        <View ref={shotRef} collapsable={false} style={styles.shot}>
          <Image
            source={{ uri: uris[renderSub] ?? remote(renderSub) }}
            resizeMode="stretch"
            // No Android fade-in: captures taken mid-fade came out dimmed.
            fadeDuration={0}
            style={styles.shotImage}
            onLoadEnd={() => {
              loaded.current?.();
              loaded.current = null;
            }}
          />
          <View style={styles.caption}>
            <Text
              style={[theme.number(22), styles.captionText]}
            >{`Yle Teksti-TV ${page}${count > 1 ? ` · ${renderSub}/${count}` : ""}`}</Text>
            <Text style={[theme.number(22), styles.captionText]}>
              {formatTime(pageTime)}
            </Text>
          </View>
        </View>
        {count > 1 && (
          <View style={styles.center}>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: "one", label: "Tämä alasivu" },
                { value: "all", label: `Kaikki (${count})` },
              ]}
            />
          </View>
        )}
        <View style={styles.actions}>
          <Action
            icon="share-social-outline"
            label="Jaa kuvana…"
            onPress={shareImages}
            disabled={busy}
          />
          <Action
            icon="image-outline"
            label="Tallenna kuviin"
            onPress={saveImages}
            disabled={busy}
          />
          <Action
            icon="link-outline"
            label="Kopioi linkki"
            onPress={copyLink}
            disabled={busy}
          />
        </View>
        <Text style={[styles.message, { color: theme.textMuted }]}>
          {busy ? "Valmistellaan kuvaa…" : (message ?? getPageWebUrl(page))}
        </Text>
      </View>
    </View>
  );
};

const Action: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ icon, label, onPress, disabled }) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.glass ? "rgba(255,255,255,0.1)" : "#1d2026",
          borderRadius: theme.glass ? 16 : 10,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon
        name={icon}
        size={24}
        color={theme.accent === "#ffffff" ? "#fff" : theme.accent}
      />
      <Text style={[styles.actionText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3a3e46",
    alignSelf: "center",
  },
  shot: {
    alignSelf: "center",
    width: "86%",
    backgroundColor: "#000",
    borderRadius: 4,
    overflow: "hidden",
  },
  shotImage: {
    width: "100%",
    aspectRatio: 1 / IMAGE_RATIO,
  },
  caption: {
    height: CAPTION_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#07080a",
  },
  captionText: {
    color: "#a7abb3",
  },
  center: {
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 13,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    fontSize: 13,
  },
});
