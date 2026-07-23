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
    onSubmit(name1.trim() || "You", goal1, name2.trim() || "Partner", goal2);

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <View>
        <Eyebrow>Set your goals, together</Eyebrow>
        <Text style={s.title}>Move{"\n"}Together</Text>
        <Text style={s.sub}>
          Pick a weekly goal each, then show up for your workouts and cheer each
          other on. Miss a week? You treat your partner to a little favor. 💛
        </Text>
      </View>

      <PersonSetup
        accent={C.playerA}
        label="You"
        name={name1}
        setName={setName1}
        placeholder="Your name"
        goal={goal1}
        setGoal={setGoal1}
      />
      <PersonSetup
        accent={C.playerB}
        label="Your partner"
        name={name2}
        setName={setName2}
        placeholder="Their name"
        goal={goal2}
        setGoal={setGoal2}
      />

      <Button
        variant="primary"
        label={prefill ? "Save changes" : "Start moving together"}
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
        placeholderTextColor={C.inkFaint}
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
    color: C.ink,
    marginTop: 4,
  },
  sub: { color: C.inkDim, fontSize: 15, lineHeight: 22, marginTop: 10, fontFamily: F.body },
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
    color: C.inkFaint,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 16,
    fontFamily: F.body,
  },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
});
