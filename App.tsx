// Root: loads fonts, provides the duel store, and routes between screens based on
// whether shared state + a device identity exist yet. Mirrors the prototype's boot().
import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";

import { C, F } from "./src/theme";
import { DuelProvider, useDuel } from "./src/store";
import { syncEnabled } from "./src/config";
import { newState } from "./src/logic";
import { AppState, PersonId } from "./src/types";
import { Onboarding } from "./src/screens/Onboarding";
import { IdentityPicker } from "./src/screens/IdentityPicker";
import { Dashboard } from "./src/screens/Dashboard";
import { Connect } from "./src/screens/Connect";

type Route =
  | { name: "connect" }
  | { name: "onboard"; prefill: AppState | null; editing: boolean }
  | { name: "identity" }
  | { name: "dashboard" };

function Router() {
  const { loading, state, identity, code, setIdentity, bootWithCode, mutate } = useDuel();
  const [override, setOverride] = useState<Route | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.inkFaint} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  // Explicit navigation (edit setup / switch profile / connect flow) wins.
  const route: Route = override ?? deriveRoute(state, identity, code);

  switch (route.name) {
    case "connect":
      return (
        <Connect
          onCreate={(newCode) => {
            // Create flow: set the code, then onboard to build fresh shared state.
            bootWithCode(newCode, null);
            setOverride({ name: "onboard", prefill: null, editing: false });
          }}
          onJoin={async (joinCode) => {
            const resolved = await bootWithCode(joinCode, null);
            if (!resolved) {
              // No such duel yet — treat as create so the joiner can seed it.
              setOverride({ name: "onboard", prefill: null, editing: false });
            } else {
              setOverride(null); // -> identity picker via derived route
            }
          }}
        />
      );

    case "onboard":
      return (
        <Onboarding
          prefill={route.prefill}
          onCancel={route.editing ? () => setOverride(null) : undefined}
          onSubmit={async (n1, g1, n2, g2) => {
            if (route.editing && state) {
              await mutate((prev) => ({
                ...prev,
                profiles: {
                  person1: { name: n1, goal: g1 },
                  person2: { name: n2, goal: g2 },
                },
              }));
              setOverride(null);
            } else {
              const fresh = newState(n1, g1, n2, g2);
              // Persist/seed under the current code (sync) or standalone (local-only).
              await bootWithCode(code ?? "local", fresh);
              setOverride(null); // -> identity picker
            }
          }}
        />
      );

    case "identity":
      return (
        <IdentityPicker
          state={state!}
          onPick={async (id: PersonId) => {
            await setIdentity(id);
            setOverride(null);
          }}
        />
      );

    case "dashboard":
      return (
        <Dashboard
          onEditSetup={() => setOverride({ name: "onboard", prefill: state, editing: true })}
          onSwitchIdentity={() => setOverride({ name: "identity" })}
        />
      );
  }
}

// Which screen to show given persisted state (matches prototype boot() order,
// plus a Connect step when sync is enabled and no code is set yet).
function deriveRoute(
  state: AppState | null,
  identity: PersonId | null,
  code: string | null
): Route {
  if (syncEnabled() && !code) return { name: "connect" };
  if (!state) return { name: "onboard", prefill: null, editing: false };
  if (!identity) return { name: "identity" };
  return { name: "dashboard" };
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {fontsLoaded ? (
        <View style={styles.app}>
          <DuelProvider>
            <Router />
          </DuelProvider>
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={C.inkFaint} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  app: { flex: 1, maxWidth: 720, width: "100%", alignSelf: "center", paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: C.inkFaint, fontFamily: F.mono, fontSize: 13 },
});
