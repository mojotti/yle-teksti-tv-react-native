import React, { useContext, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { acceptedBlue, bodyTextLinkColor, lightGray } from "../utils/colors";
import { SwitchCmp } from "./switch";
import { Divider } from "./divider";
import { SettingKey, SettingsContext } from "../providers/settings";
import { CheckBoxCmp } from "./checkbox";
import { BackNavigationHOC } from "./back-navigation-hoc";
import Icon from "react-native-vector-icons/Ionicons";
import { isValidPage } from "../utils";
import { Button } from "./button";
import packageJson from "../../package.json";

const screenRatioHelp = `Kuvasuhteella on merkitystä ainoastaan, kun sovellusta käytetään pystyasennossa.
            
Laitteesi näytön koko saattaa vaikuttaa kuvasuhteen toteutumiseen.`;

export const Settings = () => {
  const { settings, storeValue } = useContext(SettingsContext);
  const [favoriteToAdd, setFavoriteToAdd] = useState<string>("");

  const ratio = settings.screenRatio;

  const canAddFavorite =
    favoriteToAdd !== "" &&
    isValidPage(favoriteToAdd) &&
    !settings.favorites.includes(favoriteToAdd) &&
    settings.favorites.length <= 20;

  const addFavorite = () => {
    if (canAddFavorite) {
      storeValue(
        "favorites",
        [...new Set([...settings.favorites, favoriteToAdd])].sort(),
      );

      setFavoriteToAdd("");
    }
  };

  const deleteFavorite = (favorite: string) => {
    storeValue("favorites", [
      ...new Set([...settings.favorites.filter((f) => f !== favorite)].sort()),
    ]);
  };

  const clickCheckBox = (key: SettingKey, value: string) => {
    if (settings[key] !== value) {
      storeValue(key, value);
    }
  };

  return (
    <BackNavigationHOC>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          keyboardShouldPersistTaps={"handled"}>
          <Text style={styles.title}>{`Suosikit`}</Text>

          <Text style={{ ...styles.body, ...styles.marginBottom }}>
            Valitse suosikkisivusi (max 20 kpl).
          </Text>

          <Text
            style={{
              ...styles.body,
              ...styles.marginBottom,
              ...styles.italic,
            }}>
            Mikäli valitset suosikkeja, linkkipalkin sisältö korvautuu
            suosikkisivuilla.
          </Text>

          <View>
            <View style={{ flexDirection: "row" }}>
              <TextInput
                maxLength={3}
                placeholder={"Lisää suosikki..."}
                placeholderTextColor={"#505050"}
                onChangeText={(text) => setFavoriteToAdd(text)}
                value={favoriteToAdd}
                keyboardType="number-pad"
                onSubmitEditing={addFavorite}
                style={{
                  ...styles.body,
                  ...styles.input,
                }}
              />
              <TouchableOpacity
                onPress={addFavorite}
                style={{
                  ...styles.addFavButton,
                  backgroundColor: canAddFavorite ? acceptedBlue : "#898989",
                }}
                disabled={!canAddFavorite}>
                <Text style={{ ...styles.body, color: "#FFFFFF" }}>
                  {"LISÄÄ"}
                </Text>
              </TouchableOpacity>
            </View>
            {favoriteToAdd.length >= 3 &&
              settings.favorites.includes(favoriteToAdd) && (
                <Text style={{ color: "#ff432e" }}>
                  {"Olet jo lisännyt tämän suosikin"}
                </Text>
              )}

            {favoriteToAdd.length >= 3 && !isValidPage(favoriteToAdd) && (
              <Text style={{ color: "#ff432e" }}>
                {"Sivu ei ole Teksti-TV sivu"}
              </Text>
            )}

            {favoriteToAdd.length >= 3 && settings.favorites.length >= 20 && (
              <Text style={{ color: "#ff432e" }}>
                {"Olet jo valinnut 20 suosikkia"}
              </Text>
            )}
          </View>

          <View style={styles.favContainer}>
            {settings.favorites.sort().map((favorite) => (
              <View key={favorite} style={styles.favorite}>
                <Text style={styles.favName}>{favorite}</Text>
                <TouchableOpacity onPress={() => deleteFavorite(favorite)}>
                  <Icon
                    style={styles.deleteIcon}
                    name="trash-outline"
                    size={28}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {settings.favorites.length > 0 && (
            <View>
              <Text
                style={{
                  ...styles.body,
                  marginBottom: 15,
                  marginTop: 20,
                }}>
                Suosikkien kuvake
              </Text>

              <CheckBoxCmp
                isEnabled={settings.favoriteIcon === "heart"}
                label={"Sydän"}
                onPress={() => clickCheckBox("favoriteIcon", "heart")}
              />

              <CheckBoxCmp
                isEnabled={settings.favoriteIcon === "star"}
                label={"Tähti"}
                onPress={() => clickCheckBox("favoriteIcon", "star")}
              />

              <CheckBoxCmp
                isEnabled={settings.favoriteIcon === "none"}
                label={"Ei kuvaketta"}
                onPress={() => clickCheckBox("favoriteIcon", "none")}
              />
            </View>
          )}

          <Divider />

          <Text style={styles.title}>{`Kuvasuhde`}</Text>

          <Text style={{ ...styles.body, ...styles.marginBottom }}>
            Valitse Teksti-TV -sivun kuvasuhde (leveys : korkeus).
          </Text>

          <Text
            style={{
              ...styles.body,
              ...styles.marginBottom,
              ...styles.italic,
            }}>
            {screenRatioHelp}
          </Text>

          <CheckBoxCmp
            isEnabled={ratio === "full"}
            label={"Koko näyttö"}
            onPress={() => clickCheckBox("screenRatio", "full")}
          />

          <CheckBoxCmp
            isEnabled={ratio === "16:9"}
            label={"9:16 (0,56:1)"}
            onPress={() => clickCheckBox("screenRatio", "16:9")}
          />

          <CheckBoxCmp
            isEnabled={ratio === "goldenRatio"}
            label={"Kultainen leikkaus (0,62:1)"}
            onPress={() => clickCheckBox("screenRatio", "goldenRatio")}
          />

          <CheckBoxCmp
            isEnabled={ratio === "3:2"}
            label={"2:3 (0,67:1)"}
            onPress={() => clickCheckBox("screenRatio", "3:2")}
          />

          <CheckBoxCmp
            isEnabled={ratio === "4:3"}
            label={"3:4 (0,75:1)"}
            onPress={() => clickCheckBox("screenRatio", "4:3")}
          />

          <CheckBoxCmp
            isEnabled={ratio === "1:1"}
            label={"1:1"}
            onPress={() => clickCheckBox("screenRatio", "1:1")}
          />

          <Divider />

          <Text style={styles.title}>{`Linkit`}</Text>

          <Text style={{ ...styles.body, ...styles.marginBottom }}>
            Linkkejä muodostetaan Teksti-TV -sivun sisällön perusteella.
          </Text>

          <Text style={{ ...styles.body, ...styles.marginBottom }}>
            Voit klikata linkkiä suoraan Teksti-TV-sivulta tai linkkipalkista.
          </Text>

          <View style={styles.smallMarginBottom} />

          <SwitchCmp
            isEnabled={settings.highlightScreenLinks}
            label={"Korosta sivun linkkejä"}
            onPress={() => {
              storeValue(
                "highlightScreenLinks",
                !settings.highlightScreenLinks,
              );
            }}
          />

          <Divider />

          <Text style={styles.title}>{`Tietoa sovelluksesta`}</Text>
          <Text
            style={{
              ...styles.body,
              marginBottom: 14,
            }}>{`Tämä sovellus näyttää YLE Teksti-TV:n sisältöä.`}</Text>
          <Text
            style={{
              ...styles.body,
              marginBottom: 14,
            }}>{`Lisätietoja: `}</Text>
          <Text
            style={{ ...styles.body, ...styles.link, ...styles.indent }}
            onPress={() => Linking.openURL("http://yle.fi")}>
            YLE
          </Text>
          <Text
            style={{ ...styles.body, ...styles.link, ...styles.indent }}
            onPress={() => Linking.openURL("https://yle.fi/aihe/tekstitv")}>
            YLE Teksti-TV
          </Text>

          <Divider />
          <Text style={styles.title}>{`Palaute`}</Text>
          <Text style={styles.body}>
            {"Auta Teksti-TV -sovelluksen kehitystä ja lähetä palautetta!"}
          </Text>
          <Button
            label={"Lähetä palautetta"}
            styles={{ marginTop: 16, marginBottom: 10 }}
            onPress={() =>
              Linking.openURL(
                `mailto:tekstitvmobile@gmail.com?subject=Palautetta Teksti-TV:stä&body=Sovelluksen versio: ${packageJson.version}`,
              )
            }
          />
          <Divider />

          <Text style={styles.title}>{`Versio`}</Text>
          <Text
            style={{
              ...styles.body,
              marginBottom: 60,
            }}>{`Sovelluksen versio: ${packageJson.version}`}</Text>
        </ScrollView>
      </View>
    </BackNavigationHOC>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  title: {
    fontFamily: Platform.OS === "ios" ? undefined : "sans-serif-thin",
    fontSize: 35,
    color: lightGray,
    marginBottom: 30,
  },
  body: {
    fontFamily: Platform.OS === "ios" ? undefined : "Roboto",
    fontSize: 20,
    color: lightGray,
  },
  marginBottom: {
    marginBottom: 20,
  },
  smallMarginBottom: {
    marginBottom: 12,
  },
  italic: {
    fontStyle: "italic",
  },
  input: {
    flexGrow: 1,
    marginRight: 20,
    borderBottomColor: "#FFFFFF",
    borderBottomWidth: 1,
    color: lightGray,
  },
  addFavButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
  },
  favContainer: {
    flexGrow: 0,
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 10,
  },
  favorite: {
    backgroundColor: acceptedBlue,
    flexGrow: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 15,
    marginTop: 15,
  },
  favName: {
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? undefined : "monospace",
    fontSize: 24,
  },
  deleteIcon: {
    marginLeft: 10,
    alignSelf: "center",
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "bold",
    color: bodyTextLinkColor,
    marginBottom: 10,
  },
  indent: {
    paddingLeft: 14,
  },
});
