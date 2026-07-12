// Duel code screen — the join point for two-phone sync. One partner creates a
// duel (generates a code + does onboarding); the other joins with that code and
// pulls the shared state. Only shown when sync is enabled and no code is set yet.
import React, { useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { C, F } from "../theme";
import { Button, Card, Eyebrow } from "../components/ui";

// Short, unambiguous, hard-to-guess code (no 0/O/1/I). ~30 bits over 6 chars.
// ponytail: shared-secret code is the whole auth model for a 2-person app.
// Upgrade to per-user accounts only if this ever grows past couples.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++)
    c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}

export function Connect({
  onCreate,
  onJoin,
}: {
  onCreate: (code: string) => void; // -> goes to onboarding
  onJoin: (code: string) => void; // -> pulls existing shared state
}) {
  const [mode, setMode] = useState<"pick" | "join">("pick");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (mode === "join") {
    return (
      <View style={s.wrap}>
        <Eyebrow>Join your partner</Eyebrow>
        <Text style={s.title}>Enter duel code</Text>
        <Card>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
            placeholder="e.g. K7PQX4"
            placeholderTextColor={C.chalkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
        </Card>
        {err && <Text style={s.err}>{err}</Text>}
        <Button
          variant="primary"
          label="Join duel"
          onPress={() => {
            if (code.length < 6) return setErr("Codes are 6 characters.");
            onJoin(code);
          }}
        />
        <Button variant="ghost" label="Back" onPress={() => setMode("pick")} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Eyebrow>Set the terms</Eyebrow>
      <Text style={s.title}>Exercise{"\n"}Duel</Text>
      <Text style={s.sub}>
        Start a new duel and share the code with your partner, or join theirs.
      </Text>
      <Button variant="primary" label="Start a new duel" onPress={() => onCreate(genCode())} />
      <Button label="Join with a code" onPress={() => setMode("join")} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, gap: 16, paddingTop: 80 },
  title: { fontFamily: F.display, fontSize: 40, lineHeight: 42, color: C.chalk },
  sub: { color: C.chalkDim, fontSize: 15, lineHeight: 22, fontFamily: F.body },
  input: {
    color: C.chalk,
    fontFamily: F.mono,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: "center",
    paddingVertical: 6,
  },
  err: { color: C.favorLight, fontFamily: F.mono, fontSize: 12 },
});
