import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  MAX_FAVORITES,
  ScreenRatio,
  Settings,
  SettingsContext,
} from "../providers/settings";
import { PageContext } from "../providers/page";
import { prettyTitle, ratioHeights } from "../utils";
import { formatClock } from "../utils/offline";
import { ThemeName, themeLabels, themes, tt, useTheme } from "../theme/theme";
import {
  Footnote,
  Group,
  GroupHeader,
  Icon,
  IconButton,
  Row,
  Segmented,
  Toggle,
} from "../components/ui";
import { Keypad } from "../components/home/keypad";
import { version as appVersion } from "../../package.json";
import { addFavorite } from "./home-model";
import type { HomeScreenNavigationProp } from "../../App";

const FEEDBACK_EMAIL = "tekstitvmobile@gmail.com";

export const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { settings, update } = useContext(SettingsContext);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string>();
  const { lookupPage, pageNames } = useContext(PageContext);
  const latestFavorites = useRef(settings.favorites);
  latestFavorites.current = settings.favorites;

  // Favourites without a title (older ones, or added before a lookup
  // finished) get one when settings opens.
  useEffect(() => {
    settings.favorites
      .filter((p) => !pageNames[p])
      .forEach((p) => lookupPage(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set =
    <K extends keyof Settings>(key: K) =>
    (value: Settings[K]) =>
      update({ [key]: value } as Partial<Settings>);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <GroupHeader title="Suosikit" />
        <Favorites onAdd={() => setAdding(true)} />
        {addError && (
          <Text style={[styles.addError, { color: tt.red }]}>{addError}</Text>
        )}
        <Footnote text="Suosikit näkyvät alapalkissa tässä järjestyksessä. Sivun voi lisätä suosikiksi myös yläpalkin sydämestä." />
        <View style={styles.gap} />
        <Group>
          <Row
            label="Piilota sivun linkit"
            detail="Alapalkissa näytetään vain suosikit"
          >
            <Toggle
              value={settings.favoritesReplaceLinks}
              onChange={set("favoritesReplaceLinks")}
            />
          </Row>
          <Row
            label="Aloitusnäkymä"
            detail="Näkymä, joka avautuu sovelluksen käynnistyessä"
            disabled={!settings.favorites.length}
          >
            <Segmented
              value={settings.startView}
              onChange={set("startView")}
              options={[
                { value: "front", label: "Etusivu" },
                { value: "favorites", label: "Suosikit" },
              ]}
            />
          </Row>
          <Row label="Suosikkikuvake" detail="Kuvake alapalkin suosikeissa">
            <Segmented
              value={settings.favoriteIcon}
              onChange={set("favoriteIcon")}
              options={[
                { value: "heart", label: "Sydän" },
                { value: "star", label: "Tähti" },
                { value: "none", label: "Ei" },
              ]}
            />
          </Row>
        </Group>

        <GroupHeader title="Ulkoasu" />
        <Group>
          <ThemePicker value={settings.theme} onChange={set("theme")} />
          {settings.theme === "glass" && (
            <Row label="Taustan hehku" detail="Sivun värit sumeana taustalla">
              <Toggle
                value={settings.ambientGlow}
                onChange={set("ambientGlow")}
              />
            </Row>
          )}
          <SizePicker
            value={settings.screenRatio}
            onChange={set("screenRatio")}
          />
        </Group>
        <Footnote text="Koko vaikuttaa pystyasentoon. Vaaka-asennossa sivu näytetään aina television 4:3-kuvasuhteessa." />

        <GroupHeader title="Selaaminen" />
        <Group>
          <Row
            label="Pyyhkäisy"
            detail={
              settings.swipe === "pagesHorizontal"
                ? "Sivu vaihtuu sivuttain, alasivu pystysuunnassa"
                : "Sivu vaihtuu pystysuunnassa, alasivu sivuttain"
            }
          >
            <Segmented
              value={settings.swipe}
              onChange={set("swipe")}
              options={[
                { value: "pagesHorizontal", label: "Sivut ↔" },
                { value: "pagesVertical", label: "Sivut ↕" },
              ]}
            />
          </Row>
          <Row
            label="Sivunumerot linkkeinä"
            detail="Sivulla näkyvän numeron napautus avaa sen sivun"
          >
            <Toggle value={settings.pageLinks} onChange={set("pageLinks")} />
          </Row>
          <Row label="Korosta linkit sivulla" disabled={!settings.pageLinks}>
            <Toggle
              value={settings.highlightScreenLinks}
              onChange={set("highlightScreenLinks")}
              disabled={!settings.pageLinks}
            />
          </Row>
          <Row label="Alapalkki" detail="Suosikit ja sivun linkit sivun alla">
            <Segmented
              value={settings.showDock ? "show" : "hide"}
              onChange={(v) => update({ showDock: v === "show" })}
              options={[
                { value: "show", label: "Näytä" },
                { value: "hide", label: "Piilota" },
              ]}
            />
          </Row>
          <Row
            label="Alasivupalkki"
            detail="Alasivujen nuolet ja laskuri sivun alla"
          >
            <Segmented
              value={settings.showSubpageRow ? "show" : "hide"}
              onChange={(v) => update({ showSubpageRow: v === "show" })}
              options={[
                { value: "show", label: "Näytä" },
                { value: "hide", label: "Piilota" },
              ]}
            />
          </Row>
          <Row label="Näytön suunta">
            <Segmented
              value={settings.orientationLock}
              onChange={set("orientationLock")}
              options={[
                { value: "auto", label: "Vapaa" },
                { value: "portrait", label: "Pysty" },
              ]}
            />
          </Row>
        </Group>

        <GroupHeader title="Ilman yhteyttä" />
        <OfflineGroup />
        <Footnote text="Suosikit alasivuineen tallennetaan puhelimeen, joten voit lukea niitä myös ilman verkkoyhteyttä, esimerkiksi lentokoneessa." />

        <GroupHeader title="Tietoa" />
        <Group>
          <Row
            label="Näytä ohje"
            onPress={() => {
              update({ onboardingDone: false });
              navigation.goBack();
            }}
          >
            <Icon name="chevron-forward" size={18} color={theme.textMuted} />
          </Row>
          <Row
            label="Yle Teksti-TV verkossa"
            onPress={() => Linking.openURL("https://yle.fi/aihe/tekstitv")}
          >
            <Icon name="open-outline" size={18} color={theme.textMuted} />
          </Row>
          <Row
            label="Lähetä palautetta"
            detail={FEEDBACK_EMAIL}
            onPress={() =>
              Linking.openURL(
                `mailto:${FEEDBACK_EMAIL}?subject=Palautetta Teksti-TV:stä&body=Sovelluksen versio: ${appVersion}`,
              )
            }
          >
            <Icon name="mail-outline" size={18} color={theme.textMuted} />
          </Row>
          <Row label="Versio">
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>
              {appVersion}
            </Text>
          </Row>
        </Group>
        <Footnote text="Sovellus näyttää Yle Teksti-TV:n sisältöä Ylen avoimen rajapinnan kautta." />
      </ScrollView>
      <Keypad
        visible={adding}
        title="Lisää suosikki"
        homeKey={false}
        onClose={() => setAdding(false)}
        onSubmit={async (page) => {
          setAdding(false);
          setAddError(undefined);
          if (
            settings.favorites.includes(page) ||
            settings.favorites.length >= MAX_FAVORITES
          ) {
            return;
          }
          // Fetch the page once to get its title and check that it exists.
          const result = await lookupPage(page);
          if (result === "missing") {
            setAddError(
              `Sivua ${page} ei ole olemassa, joten sitä ei lisätty.`,
            );
            return;
          }
          update({
            favorites: addFavorite(
              latestFavorites.current,
              page,
              MAX_FAVORITES,
            ),
          });
        }}
      />
    </View>
  );
};

const OfflineGroup: React.FC = () => {
  const theme = useTheme();
  const { settings, update } = useContext(SettingsContext);
  const { offline } = useContext(PageContext);
  const { summary, progress } = offline;
  const none = !settings.favorites.length;

  const status = progress
    ? `Ladataan ${progress.done}/${progress.total}…`
    : summary
      ? `${summary.pages} sivua · ${summary.subPages} alasivua · ${Math.max(1, Math.round(summary.bytes / 1024))} kt`
      : "Ei ladattuja sivuja";

  return (
    <Group>
      <Row
        label="Lataa automaattisesti Wi-Fissä"
        detail="Enintään kerran tunnissa, kun sovellus avataan"
      >
        <Toggle
          value={settings.offlineAutoDownload}
          onChange={(v) => update({ offlineAutoDownload: v })}
          disabled={none}
        />
      </Row>
      <Row
        label={
          summary && !progress
            ? `Ladattu ${formatClock(summary.savedAt)}`
            : "Ladatut sivut"
        }
        detail={status}
      >
        {summary && !progress ? (
          <Pressable
            onPress={offline.clear}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>Poista</Text>
          </Pressable>
        ) : null}
      </Row>
      <Row
        label={progress ? "Ladataan…" : "Lataa nyt"}
        onPress={offline.download}
        disabled={none || !!progress}
      >
        <Icon name="cloud-download-outline" size={20} color={theme.textMuted} />
      </Row>
    </Group>
  );
};

const isSorted = (list: string[]) =>
  list.every((x, i) => i === 0 || list[i - 1] <= x);

const Favorites: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const theme = useTheme();
  const { settings, update } = useContext(SettingsContext);
  const { pageNames } = useContext(PageContext);
  const favorites = settings.favorites;

  const move = (index: number, by: number) => {
    const next = [...favorites];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    update({ favorites: next });
  };

  return (
    <Group>
      {favorites.map((page, i) => (
        <View key={page} style={styles.favRow}>
          <Text style={[theme.number(28), { color: theme.text, minWidth: 48 }]}>
            {page}
          </Text>
          <Text
            style={[styles.favName, { color: theme.textMuted }]}
            numberOfLines={2}
          >
            {prettyTitle(pageNames[page] ?? "")}
          </Text>
          <IconButton
            name="chevron-up"
            label={`Siirrä ${page} ylös`}
            size={20}
            disabled={i === 0}
            onPress={() => move(i, -1)}
          />
          <IconButton
            name="chevron-down"
            label={`Siirrä ${page} alas`}
            size={20}
            disabled={i === favorites.length - 1}
            onPress={() => move(i, 1)}
          />
          <IconButton
            name="close"
            label={`Poista ${page}`}
            size={20}
            color={theme.textMuted}
            onPress={() =>
              update({ favorites: favorites.filter((f) => f !== page) })
            }
          />
        </View>
      ))}
      {!isSorted(favorites) && (
        <Row
          label="Järjestä numerojärjestykseen"
          onPress={() => update({ favorites: [...favorites].sort() })}
        >
          <Icon name="swap-vertical" size={18} color={theme.textMuted} />
        </Row>
      )}
      <Row
        label={
          favorites.length >= MAX_FAVORITES
            ? `Enintään ${MAX_FAVORITES} suosikkia`
            : "+ Lisää suosikki"
        }
        onPress={onAdd}
        disabled={favorites.length >= MAX_FAVORITES}
      >
        <Text
          style={{ color: theme.textMuted }}
        >{`${favorites.length}/${MAX_FAVORITES}`}</Text>
      </Row>
    </Group>
  );
};

const ThemePicker: React.FC<{
  value: ThemeName;
  onChange: (v: ThemeName) => void;
}> = ({ value, onChange }) => {
  const { imgSrc } = useContext(PageContext);
  return (
    <View style={styles.tiles}>
      {(["teletext", "glass"] as ThemeName[]).map((name) => {
        const t = themes[name];
        const on = value === name;
        return (
          <Pressable
            key={name}
            onPress={() => onChange(name)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={styles.tile}
          >
            <View
              style={[
                styles.preview,
                {
                  borderColor: on ? tt.yellow : "#2c3038",
                  backgroundColor: t.bg,
                },
              ]}
            >
              {t.glass && imgSrc ? (
                <Image
                  source={{ uri: imgSrc }}
                  blurRadius={20}
                  style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
                />
              ) : null}
              <View
                style={[
                  styles.previewBar,
                  {
                    backgroundColor: t.glass
                      ? "rgba(255,255,255,0.16)"
                      : t.chrome,
                    borderRadius: t.glass ? 8 : 3,
                  },
                ]}
              />
              {imgSrc ? (
                <Image
                  source={{ uri: imgSrc }}
                  resizeMode="stretch"
                  style={[
                    styles.previewPage,
                    { borderRadius: t.glass ? 5 : 0 },
                  ]}
                />
              ) : (
                <View
                  style={[styles.previewPage, { backgroundColor: tt.blue }]}
                />
              )}
              <View style={styles.flex} />

              <View style={styles.previewKeys}>
                {[tt.red, tt.green, tt.yellow, tt.cyan].map((color) => (
                  <View
                    key={color}
                    style={[
                      styles.previewKey,
                      t.glass
                        ? {
                            backgroundColor: "rgba(255,255,255,0.14)",
                            borderBottomWidth: 2,
                            borderBottomColor: color,
                            borderRadius: 4,
                          }
                        : { backgroundColor: color },
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.tileLabel}>
              <View style={[styles.radio, on && styles.radioOn]} />
              <Text style={{ color: "#fff", fontSize: 14 }}>
                {themeLabels[name]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const SIZES: { value: ScreenRatio; label: string }[] = [
  { value: "tv", label: "TV 4:3" },
  { value: "square", label: "Neliö" },
  { value: "tall", label: "Korkea" },
  { value: "full", label: "Koko näyttö" },
];

const SizePicker: React.FC<{
  value: ScreenRatio;
  onChange: (v: ScreenRatio) => void;
}> = ({ value, onChange }) => {
  const theme = useTheme();
  return (
    <View>
      <Text style={[styles.pickerLabel, { color: theme.text }]}>
        Sivun koko
      </Text>
      <View style={styles.sizes}>
        {SIZES.map((s) => {
          const on = s.value === value;
          const share = s.value === "full" ? 1 : ratioHeights[s.value] / 1.9;
          return (
            <Pressable
              key={s.value}
              onPress={() => onChange(s.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={styles.size}
            >
              <View
                style={[
                  styles.frame,
                  { borderColor: on ? tt.yellow : "#3a3e46" },
                ]}
              >
                <View
                  style={[
                    styles.frameFill,
                    { height: `${Math.round(share * 100)}%` },
                  ]}
                />
              </View>
              <Text
                style={{
                  color: on ? theme.text : theme.textMuted,
                  fontSize: 12,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  gap: {
    height: 12,
  },
  addError: {
    fontSize: 14,
    marginTop: 8,
    marginHorizontal: 6,
  },
  flex: {
    flex: 1,
  },
  favRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 48,
  },
  favName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    paddingRight: 4,
  },
  tiles: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  tile: {
    flex: 1,
    gap: 8,
  },
  preview: {
    aspectRatio: 3 / 4.2,
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden",
    padding: 6,
    gap: 4,
  },
  previewBar: {
    height: 12,
  },
  previewPage: {
    width: "100%",
    aspectRatio: 1.2,
  },
  previewKeys: {
    flexDirection: "row",
    gap: 3,
  },
  previewKey: {
    flex: 1,
    height: 9,
    borderRadius: 2,
  },
  tileLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#5a5f69",
  },
  radioOn: {
    borderWidth: 5,
    borderColor: tt.yellow,
  },
  pickerLabel: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  sizes: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  size: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  frame: {
    width: 40,
    height: 66,
    borderWidth: 2,
    borderRadius: 6,
    padding: 3,
  },
  frameFill: {
    backgroundColor: tt.blue,
    borderRadius: 2,
  },
});
