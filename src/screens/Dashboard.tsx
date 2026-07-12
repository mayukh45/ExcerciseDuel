// Main screen: scoreboard + rope bar, two player cards, today's check-in, favor
// ledger. Port of renderDashboard(). Mutations go through the store (optimistic
// local + AWS sync).
import React, { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { C, F } from "../theme";
import { Card } from "../components/ui";
import { RopeBar } from "../components/RopeBar";
import { ProgressRing } from "../components/ProgressRing";
import { FavorModal, FavorDirection } from "./FavorModal";
import {
  allTimeCount,
  currentStreak,
  getWeekStart,
  newFavorId,
  other,
  todayStr,
  weeklyCount,
} from "../logic";
import { AppState, Favor, PersonId } from "../types";
import { useDuel } from "../store";

export function Dashboard({
  onEditSetup,
  onSwitchIdentity,
}: {
  onEditSetup: () => void;
  onSwitchIdentity: () => void;
}) {
  const { state, identity, mutate, refresh, syncing, error } = useDuel();
  const [tab, setTab] = useState<"to-me" | "from-me">("to-me");
  const [modal, setModal] = useState(false);

  const me = identity!;
  const s = state!;

  const derived = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const wA = weeklyCount(s.log, weekStart, "person1");
    const wB = weeklyCount(s.log, weekStart, "person2");
    const total = wA + wB;
    return {
      weekStart,
      wA,
      wB,
      pctA: total === 0 ? 50 : Math.round((wA / total) * 100),
      allA: allTimeCount(s.log, "person1"),
      allB: allTimeCount(s.log, "person2"),
      streakA: currentStreak(s.log, "person1"),
      streakB: currentStreak(s.log, "person2"),
    };
  }, [s]);

  const doneToday = !!(s.log[todayStr()] && s.log[todayStr()][me]);

  const favorsToMe = s.favors
    .filter((f) => f.owed === me)
    .sort((a, b) => sortFavors(a, b));
  const favorsFromMe = s.favors
    .filter((f) => f.ower === me)
    .sort((a, b) => sortFavors(a, b));
  const active = tab === "to-me" ? favorsToMe : favorsFromMe;

  const toggleToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mutate((prev) => {
      const key = todayStr();
      const log = { ...prev.log, [key]: { ...prev.log[key] } };
      log[key][me] = !log[key][me];
      return { ...prev, log };
    });
  };

  const toggleFavor = (id: string) =>
    mutate((prev) => ({
      ...prev,
      favors: prev.favors.map((f) =>
        f.id === id ? { ...f, status: f.status === "pending" ? "done" : "pending" } : f
      ),
    }));

  const addFavor = (direction: FavorDirection, text: string) => {
    const ower: PersonId = direction === "i-owe" ? me : other(me);
    const owed: PersonId = direction === "i-owe" ? other(me) : me;
    const favor: Favor = {
      id: newFavorId(Date.now(), Math.random()),
      ower,
      owed,
      text,
      status: "pending",
      createdAt: Date.now(),
      auto: false,
    };
    setModal(false);
    mutate((prev) => ({ ...prev, favors: [...prev.favors, favor] }));
  };

  const weekLabel = derived.weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={C.chalkDim} />
        }
      >
        {/* scoreboard */}
        <View style={st.scoreboard}>
          <View style={st.vsNames}>
            <Text style={[st.name, { color: C.playerALight }]}>{s.profiles.person1.name}</Text>
            <Text style={st.vsTag}>VS</Text>
            <Text style={[st.name, { color: C.playerBLight }]}>{s.profiles.person2.name}</Text>
          </View>
          <Text style={st.weekLabel}>Week of {weekLabel}</Text>
          <View style={{ marginTop: 14, marginHorizontal: 4 }}>
            <RopeBar pctA={derived.pctA} />
          </View>
          <View style={st.ropePts}>
            <Text style={st.ropePt}>{derived.wA} pts</Text>
            <Text style={st.ropePt}>{derived.wB} pts</Text>
          </View>
        </View>

        {/* player cards */}
        <View style={st.playersRow}>
          <PlayerCard
            person="person1"
            profile={s.profiles.person1}
            week={derived.wA}
            all={derived.allA}
            streak={derived.streakA}
            color={C.playerA}
            me={me}
          />
          <PlayerCard
            person="person2"
            profile={s.profiles.person2}
            week={derived.wB}
            all={derived.allB}
            streak={derived.streakB}
            color={C.playerB}
            me={me}
          />
        </View>

        {/* check-in */}
        <Card style={{ gap: 10 }}>
          <Text style={st.checkinTitle}>Today, {s.profiles[me].name}...</Text>
          <Pressable
            onPress={toggleToday}
            style={({ pressed }) => [
              st.checkinBtn,
              { backgroundColor: doneToday ? C.streak : C.chalk },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={st.checkinBtnText}>
              {doneToday ? "Done today ✓ (tap to undo)" : "Mark today's workout done"}
            </Text>
          </Pressable>
        </Card>

        {/* favor ledger */}
        <View>
          <View style={st.sectionHead}>
            <Text style={st.sectionTitle}>Favor ledger</Text>
            <Pressable onPress={() => setModal(true)} style={st.addFavorBtn}>
              <Text style={st.addFavorText}>+ Add favor</Text>
            </Pressable>
          </View>
          <View style={st.favorTabs}>
            <FavorTab
              label={`Owed to me (${favorsToMe.filter((f) => f.status === "pending").length})`}
              active={tab === "to-me"}
              onPress={() => setTab("to-me")}
            />
            <FavorTab
              label={`I owe (${favorsFromMe.filter((f) => f.status === "pending").length})`}
              active={tab === "from-me"}
              onPress={() => setTab("from-me")}
            />
          </View>
          <View style={{ gap: 8, marginTop: 12 }}>
            {active.length === 0 ? (
              <Text style={st.empty}>Nothing here. Keep it that way.</Text>
            ) : (
              active.map((f) => (
                <FavorItem key={f.id} favor={f} me={me} state={s} onToggle={toggleFavor} />
              ))
            )}
          </View>
        </View>

        {error && <Text style={st.syncNote}>{error}</Text>}

        <View style={st.footer}>
          <Pressable onPress={onEditSetup}>
            <Text style={st.footerLink}>Edit names & goals</Text>
          </Pressable>
          <Pressable onPress={onSwitchIdentity}>
            <Text style={st.footerLink}>Switch profile</Text>
          </Pressable>
        </View>
      </ScrollView>

      <FavorModal
        visible={modal}
        otherName={s.profiles[other(me)].name}
        onClose={() => setModal(false)}
        onSubmit={addFavor}
      />
    </>
  );
}

// Pending first, then done; newest first within each group.
function sortFavors(a: Favor, b: Favor): number {
  if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
  return b.createdAt - a.createdAt;
}

function PlayerCard({
  person,
  profile,
  week,
  all,
  streak,
  color,
  me,
}: {
  person: PersonId;
  profile: { name: string; goal: number };
  week: number;
  all: number;
  streak: number;
  color: string;
  me: PersonId;
}) {
  const isMe = person === me;
  const topColor = person === "person1" ? C.playerA : C.playerB;
  return (
    <View
      style={[
        st.playerCard,
        { borderTopColor: topColor, borderTopWidth: 3 },
        isMe && { backgroundColor: C.surfaceRaised },
      ]}
    >
      {isMe && <Text style={st.meTag}>You</Text>}
      <View style={st.ringWrap}>
        <ProgressRing pct={Math.min(1, week / profile.goal)} color={color} />
        <View style={st.ringCenter}>
          <Text style={st.ringFrac}>
            {week}/{profile.goal}
          </Text>
        </View>
      </View>
      <Text style={st.playerName}>{profile.name}</Text>
      <View style={st.stats}>
        <Stat num={streak} label="Streak" numColor={C.streak} />
        <Stat num={all} label="All-time" />
      </View>
    </View>
  );
}

function Stat({ num, label, numColor }: { num: number; label: string; numColor?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={[st.statNum, numColor && { color: numColor }]}>{num}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function FavorTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[st.favorTab, active && st.favorTabActive]}>
      <Text style={[st.favorTabText, active && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

function FavorItem({
  favor,
  me,
  state,
  onToggle,
}: {
  favor: Favor;
  me: PersonId;
  state: AppState;
  onToggle: (id: string) => void;
}) {
  const done = favor.status === "done";
  const otherName =
    favor.ower === me ? state.profiles[favor.owed].name : state.profiles[favor.ower].name;
  const direction = favor.ower === me ? `You owe ${otherName}` : `${otherName} owes you`;
  const canMark = favor.ower === me; // only the ower can mark done

  return (
    <View style={[st.favorItem, done && { opacity: 0.5 }]}>
      <View style={[st.favorDot, { backgroundColor: done ? C.streak : C.favor }]} />
      <View style={{ flex: 1 }}>
        <Text style={[st.favorText, done && { textDecorationLine: "line-through" }]}>
          {favor.text}
        </Text>
        <Text style={st.favorMeta}>{direction}</Text>
      </View>
      {canMark && (
        <Pressable onPress={() => onToggle(favor.id)} style={st.favorBtn}>
          <Text style={st.favorBtnText}>{done ? "Undo" : "Mark done"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 18, paddingVertical: 8 },
  scoreboard: { alignItems: "center", paddingTop: 6 },
  vsNames: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontFamily: F.display, fontSize: 30, letterSpacing: 0.4 },
  vsTag: { fontFamily: F.mono, fontSize: 13, color: C.chalkFaint, letterSpacing: 1.3 },
  weekLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.chalkFaint,
    marginTop: 4,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  ropePts: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: 2 },
  ropePt: { fontFamily: F.mono, fontSize: 12, color: C.chalkDim },

  playersRow: { flexDirection: "row", gap: 12 },
  playerCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    alignItems: "center",
    gap: 8,
  },
  meTag: {
    position: "absolute",
    top: 10,
    right: 10,
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: C.chalkFaint,
    textTransform: "uppercase",
  },
  ringWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  ringFrac: { fontFamily: F.monoMed, fontSize: 15, color: C.chalk },
  playerName: { fontFamily: F.bodyBold, fontSize: 15, color: C.chalk },
  stats: { flexDirection: "row", gap: 14, marginTop: 2 },
  statNum: { fontFamily: F.display, fontSize: 20, color: C.chalk },
  statLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.chalkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  checkinTitle: { fontSize: 15, color: C.chalkDim, fontFamily: F.body },
  checkinBtn: { paddingVertical: 18, borderRadius: 14, alignItems: "center" },
  checkinBtnText: { fontFamily: F.display, fontSize: 19, color: C.ink, letterSpacing: 0.4 },

  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: F.display, fontSize: 17, color: C.chalk, letterSpacing: 0.4 },
  addFavorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    backgroundColor: "transparent",
  },
  addFavorText: { fontFamily: F.bodySemi, fontSize: 13, color: C.chalkDim },
  favorTabs: { flexDirection: "row", gap: 8, marginTop: 10 },
  favorTab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    alignItems: "center",
  },
  favorTabActive: { backgroundColor: C.chalk, borderColor: C.chalk },
  favorTabText: { fontSize: 13, fontFamily: F.bodySemi, color: C.chalkDim },
  favorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  favorDot: { width: 8, height: 8, borderRadius: 4 },
  favorText: { fontSize: 14, lineHeight: 18, color: C.chalk, fontFamily: F.body },
  favorMeta: { fontFamily: F.mono, fontSize: 10, color: C.chalkFaint, marginTop: 2 },
  favorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.ink,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  favorBtnText: { fontSize: 12, color: C.chalkDim, fontFamily: F.body },
  empty: { color: C.chalkFaint, fontSize: 13, textAlign: "center", paddingVertical: 18, fontFamily: F.body },

  syncNote: { color: C.chalkFaint, fontSize: 11, textAlign: "center", fontFamily: F.mono },
  footer: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 8 },
  footerLink: { fontFamily: F.mono, fontSize: 11, color: C.chalkFaint, textDecorationLine: "underline" },
});
