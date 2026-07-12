// Onboarding / edit names & goals. First launch collects both names + weekly
// goals; also reachable later to edit in place (prefill).
import React, { useState } from "react";
import { ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { C, F } from "../theme";
import { Button, Eyebrow, GoalStepper } from "../components/ui";
import { AppState } from "../types";

export function Onboarding({
  prefill,
  onSubmit,
  onCancel,
}: {
  prefill: AppState | null;
  onSubmit: (name1: string, goal1: number, name2: string, goal2: number) => void;
  onCancel?: () => void;
}) {
  const [name1, setName1] = useState(prefill?.profiles.person1.name ?? "");
  const [name2, setName2] = useState(prefill?.profiles.person2.name ?? "");
  const [goal1, setGoal1] = useState(prefill?.profiles.person1.goal ?? 3);
  const [goal2, setGoal2] = useState(prefill?.profiles.person2.goal ?? 3);

  const submit = () =>
    onSubmit(name1.trim() || "Player One", goal1, name2.trim() || "Player Two", goal2);

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <View>
        <Eyebrow>Set the terms</Eyebrow>
        <Text style={s.title}>Exercise{"\n"}Duel</Text>
        <Text style={s.sub}>
          Two names, two weekly goals. Miss yours, owe a favor. Hit it, rack up points.
        </Text>
      </View>

      <PersonSetup
        accent={C.playerA}
        label="Player one"
        name={name1}
        setName={setName1}
        placeholder="Your name"
        goal={goal1}
        setGoal={setGoal1}
      />
      <PersonSetup
        accent={C.playerB}
        label="Player two"
        name={name2}
        setName={setName2}
        placeholder="Their name"
        goal={goal2}
        setGoal={setGoal2}
      />

      <Button
        variant="primary"
        label={prefill ? "Save changes" : "Let's go"}
        onPress={submit}
      />
      {onCancel && <Button variant="ghost" label="Cancel" onPress={onCancel} />}
    </ScrollView>
  );
}

function PersonSetup({
  accent,
  label,
  name,
  setName,
  placeholder,
  goal,
  setGoal,
}: {
  accent: string;
  label: string;
  name: string;
  setName: (v: string) => void;
  placeholder: string;
  goal: number;
  setGoal: (v: number) => void;
}) {
  return (
    <View style={[s.person, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={C.chalkFaint}
      />
      <View style={s.goalRow}>
        <Text style={s.fieldLabel}>Days / week</Text>
        <GoalStepper value={goal} onChange={setGoal} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 22, paddingTop: 40, paddingBottom: 40 },
  title: {
    fontFamily: F.display,
    fontSize: 44,
    lineHeight: 46,
    color: C.chalk,
    marginTop: 4,
  },
  sub: { color: C.chalkDim, fontSize: 15, lineHeight: 22, marginTop: 10, fontFamily: F.body },
  person: {
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    borderRadius: 14,
    padding: 16,
    backgroundColor: C.surface,
  },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: C.chalkFaint,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.ink,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: C.chalk,
    fontSize: 16,
    fontFamily: F.body,
  },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
});
