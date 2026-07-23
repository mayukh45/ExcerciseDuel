// Small shared primitives (button, card, eyebrow, goal stepper) matching the
// prototype's .btn/.card/.eyebrow classes. Kept tiny — no component library.
import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { C, F } from "../theme";

type BtnVariant = "primary" | "default" | "ghost";

export function Button({
  label,
  onPress,
  variant = "default",
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" && s.btnPrimary,
        variant === "ghost" && s.btnGhost,
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      <Text
        style={[
          s.btnText,
          variant === "primary" && { color: C.paper },
          variant === "ghost" && { color: C.inkDim },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function GoalStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(1, Math.min(7, v));
  return (
    <View style={s.stepper}>
      <Pressable onPress={() => onChange(clamp(value - 1))} style={s.stepBtn} hitSlop={8}>
        <Text style={s.stepBtnText}>−</Text>
      </Pressable>
      <Text style={s.stepNum}>{value}</Text>
      <Pressable onPress={() => onChange(clamp(value + 1))} style={s.stepBtn} hitSlop={8}>
        <Text style={s.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  btnPrimary: { backgroundColor: C.ink, borderColor: C.ink },
  btnGhost: { backgroundColor: "transparent", borderColor: C.surfaceBorder },
  btnText: { fontFamily: F.bodySemi, fontSize: 15, color: C.ink },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    borderRadius: 16,
    padding: 18,
  },
  eyebrow: {
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.inkFaint,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: C.ink, fontSize: 20, fontFamily: F.body },
  stepNum: {
    fontFamily: F.mono,
    fontSize: 18,
    color: C.ink,
    minWidth: 22,
    textAlign: "center",
  },
});
