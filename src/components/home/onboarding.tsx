import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tt } from "../../theme/theme";

type Rect = { x: number; y: number; width: number; height: number };
export type TargetId =
  | "pill"
  | "fastext"
  | "home"
  | "refresh"
  | "share"
  | "favorite"
  | "menu";

const CoachContext = createContext<{
  rects: Partial<Record<TargetId, Rect>>;
  setRect: (id: TargetId, rect: Rect) => void;
}>({ rects: {}, setRect: () => {} });

export const CoachProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [rects, setRects] = useState<Partial<Record<TargetId, Rect>>>({});
  const setRect = useCallback((id: TargetId, rect: Rect) => {
    setRects((r) => {
      const old = r[id];
      if (
        old &&
        old.x === rect.x &&
        old.y === rect.y &&
        old.width === rect.width &&
        old.height === rect.height
      ) {
        return r;
      }
      return { ...r, [id]: rect };
    });
  }, []);
  return (
    <CoachContext.Provider value={{ rects, setRect }}>
      {children}
    </CoachContext.Provider>
  );
};

/** Lets the guide find an element on screen. */
export const useCoachTarget = (id: TargetId) => {
  const { setRect } = useContext(CoachContext);
  const ref = useRef<View>(null);
  const onLayout = useCallback(() => {
    // Wait a frame so the window position is final.
    requestAnimationFrame(() =>
      ref.current?.measureInWindow((x, y, width, height) =>
        setRect(id, { x, y, width, height }),
      ),
    );
  }, [id, setRect]);
  return { ref, onLayout };
};

export const STEPS: { target: TargetId; title: string; text: string }[] = [
  {
    target: "pill",
    title: "Siirry sivulle",
    text: "Napauta sivunumeroa ja kirjoita uusi numero. Myös sivun napauttaminen avaa numeronäppäimistön.",
  },
  {
    target: "fastext",
    title: "Värinäppäimet",
    text: "Punainen ja vihreä vievät edelliselle ja seuraavalle sivulle, keltainen ja syaani vaihtavat alasivua. Saman voi tehdä pyyhkäisemällä sivua.",
  },
  {
    target: "home",
    title: "Etusivu",
    text: "Talon kuvasta pääset aina etusivulle 100.",
  },
  {
    target: "refresh",
    title: "Päivitä",
    text: "Hakee sivun uusimman version.",
  },
  {
    target: "share",
    title: "Jaa",
    text: "Jaa sivu kuvana tai linkkinä, tai tallenna se puhelimen kuviin.",
  },
  {
    target: "favorite",
    title: "Suosikit",
    text: "Sydämestä sivu lisätään suosikkeihin. Suosikit näkyvät alapalkissa.",
  },
  {
    target: "menu",
    title: "Lisää toimintoja",
    text: "Kolmen pisteen valikosta löydät asetukset, suosikkinäkymän ja tämän ohjeen.",
  },
];

/** Three-step first-run guide. Steps whose target isn't on screen are skipped. */
export const Onboarding: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { rects } = useContext(CoachContext);
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState<{
    x: number;
    y: number;
    height: number;
  } | null>(null);
  const rootRef = useRef<View>(null);

  const steps = STEPS.filter((s) => rects[s.target]);
  const current = steps[Math.min(step, steps.length - 1)];
  const rect = current && rects[current.target];

  if (!current || !rect) {
    return null;
  }

  const last = step >= steps.length - 1;
  const pad = 6;
  const ring = origin && {
    left: rect.x - origin.x - pad,
    top: rect.y - origin.y - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
  const below = ring ? ring.top + ring.height < origin!.height * 0.55 : true;

  return (
    <View
      ref={rootRef}
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        requestAnimationFrame(() =>
          rootRef.current?.measureInWindow((x, y, _w, height) =>
            setOrigin({ x, y, height }),
          ),
        )
      }
    >
      {ring && (
        <>
          <View style={[styles.ring, ring]} pointerEvents="none" />
          <View
            style={[
              styles.bubble,
              below
                ? { top: ring.top + ring.height + 12 }
                : { bottom: origin!.height - ring.top + 12 },
            ]}
          >
            <Text style={styles.step}>{`${step + 1}/${steps.length}`}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.text}>{current.text}</Text>
            <View style={styles.buttons}>
              {!last && (
                <Pressable
                  onPress={onDone}
                  style={[styles.button, styles.skip]}
                  accessibilityRole="button"
                >
                  <Text style={styles.skipText}>Ohita</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => (last ? onDone() : setStep(step + 1))}
                style={[styles.button, styles.next]}
                accessibilityRole="button"
              >
                <Text style={styles.nextText}>
                  {last ? "Valmis" : "Seuraava"}
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: tt.yellow,
    borderRadius: 12,
    // A huge spread darkens everything outside the ring.
    shadowColor: "#000",
    shadowOpacity: 0,
    boxShadow: "0 0 0 2000px rgba(0,0,0,0.65)",
  },
  bubble: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: tt.yellow,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  step: {
    position: "absolute",
    top: 10,
    right: 14,
    fontSize: 12,
    color: "rgba(0,0,0,0.5)",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: "#000",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skip: {
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  skipText: {
    color: "#000",
    fontWeight: "600",
  },
  next: {
    backgroundColor: "#000",
  },
  nextText: {
    color: tt.yellow,
    fontWeight: "700",
  },
});
