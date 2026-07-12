// "Who's holding this phone?" — runs once per device (local identity, never synced).
// Also reachable via "Switch profile".
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { C, F } from "../theme";
import { Eyebrow } from "../components/ui";
import { AppState, PersonId } from "../types";

export function IdentityPicker({
  state,
  onPick,
}: {
  state: AppState;
  onPick: (id: PersonId) => void;
}) {
  return (
    <View style={s.wrap}>
      <Eyebrow>One-time, on this phone</Eyebrow>
      <Text style={s.title}>Who's holding{"\n"}this phone?</Text>
      <IdBtn accent={C.playerA} name={state.profiles.person1.name} onPress={() => onPick("person1")} />
      <IdBtn accent={C.playerB} name={state.profiles.person2.name} onPress={() => onPick("person2")} />
    </View>
  );
}

function IdBtn({ accent, name, onPress }: { accent: string; name: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { borderColor: accent },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={s.btnText}>{name}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: 16, paddingTop: 80 },
  title: {
    fontFamily: F.display,
    fontSize: 30,
    lineHeight: 32,
    color: C.chalk,
    textAlign: "center",
  },
  btn: {
    width: "100%",
    maxWidth: 340,
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: C.surface,
    alignItems: "center",
  },
  btnText: { fontFamily: F.display, fontSize: 26, color: C.chalk, letterSpacing: 0.5 },
});
