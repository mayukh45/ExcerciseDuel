// Add-favor sheet: direction toggle, preset chips, custom text. Bottom sheet on
// phones (RN Modal, slide up). Port of openFavorModal().
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { C, F } from "../theme";
import { Button } from "../components/ui";
import { PRESET_FAVORS } from "../logic";

export type FavorDirection = "i-owe" | "they-owe";

export function FavorModal({
  visible,
  otherName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  otherName: string;
  onClose: () => void;
  onSubmit: (direction: FavorDirection, text: string) => void;
}) {
  const [direction, setDirection] = useState<FavorDirection>("i-owe");
  const [choice, setChoice] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const reset = () => {
    setDirection("i-owe");
    setChoice(null);
    setCustom("");
  };

  const submit = () => {
    const text = custom.trim() || choice;
    if (!text) return;
    onSubmit(direction, text);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={s.title}>Add a favor</Text>

            <View style={s.dirRow}>
              <DirOpt
                label={`I owe ${otherName}`}
                active={direction === "i-owe"}
                onPress={() => setDirection("i-owe")}
              />
              <DirOpt
                label={`${otherName} owes me`}
                active={direction === "they-owe"}
                onPress={() => setDirection("they-owe")}
              />
            </View>

            <Text style={s.fieldLabel}>Pick one or write your own</Text>
            <View style={s.chips}>
              {PRESET_FAVORS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => {
                    setChoice(p);
                    setCustom("");
                  }}
                  style={[s.chip, choice === p && s.chipActive]}
                >
                  <Text style={[s.chipText, choice === p && { color: C.ink }]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.input}
              value={custom}
              onChangeText={(t) => {
                setCustom(t);
                if (t) setChoice(null);
              }}
              placeholder="Or type a custom favor..."
              placeholderTextColor={C.chalkFaint}
            />

            <View style={s.actions}>
              <Button variant="ghost" label="Cancel" onPress={onClose} style={{ flex: 1 }} />
              <Button variant="primary" label="Add favor" onPress={submit} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DirOpt({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.dirOpt, active && s.dirOptActive]}>
      <Text style={[s.dirText, active && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 34,
    maxHeight: "82%",
  },
  title: { fontFamily: F.display, fontSize: 22, color: C.chalk, marginBottom: 14 },
  dirRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  dirOpt: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    alignItems: "center",
  },
  dirOptActive: { backgroundColor: C.chalk, borderColor: C.chalk },
  dirText: { fontSize: 13, color: C.chalkDim, fontFamily: F.body },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: C.chalkFaint,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  chipActive: { backgroundColor: C.playerB, borderColor: C.playerB },
  chipText: { fontSize: 13, color: C.chalkDim, fontFamily: F.body },
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
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
