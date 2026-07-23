// Main screen: scoreboard + rope bar, two player cards, today's check-in, favor
// ledger. Port of renderDashboard(). Mutations go through the store (optimistic
// local + AWS sync).
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { C, F } from "../theme";
import { Card } from "../components/ui";
import { TeamBar } from "../components/TeamBar";
import { ProgressRing } from "../components/ProgressRing";
import { FavorModal, FavorDirection } from "./FavorModal";
import {
  addDays,
  allTimeCount,
  currentStreak,
  fmt,
  getWeekStart,
  newFavorId,
  other,
  prunePhotos,
  todayStr,
  weeklyCount,
} from "../logic";
import { AppState, Favor, PersonId, Photo } from "../types";
import { capturePhoto } from "../photo";
import { useDuel } from "../store";

export function Dashboard({
  onEditSetup,
  onSwitchIdentity,
}: {
  onEditSetup: () => void;
  onSwitchIdentity: () => void;
}) {
  const { state, identity, code, mutate, refresh, syncing, error } = useDuel();
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"to-me" | "from-me">("to-me");
  const [modal, setModal] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [viewer, setViewer] = useState<{ photo: Photo; caption: string } | null>(null);

  const me = identity!;
  const s = state!;

  const derived = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const wA = weeklyCount(s.log, weekStart, "person1");
    const wB = weeklyCount(s.log, weekStart, "person2");
    return {
      weekStart,
      wA,
      wB,
      allA: allTimeCount(s.log, "person1"),
      allB: allTimeCount(s.log, "person2"),
      streakA: currentStreak(s.log, "person1"),
      streakB: currentStreak(s.log, "person2"),
    };
  }, [s]);

  const doneToday = !!(s.log[todayStr()] && s.log[todayStr()][me]);
  const myPhotoToday = s.photos?.[todayStr()]?.[me] ?? null;

  // This week's proof photos for both partners, chronological.
  const weekProofs = useMemo(() => {
    const out: { key: string; date: string; person: PersonId; photo: Photo }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = fmt(addDays(derived.weekStart, i));
      const day = s.photos?.[date];
      if (!day) continue;
      (["person1", "person2"] as PersonId[]).forEach((person) => {
        const photo = day[person];
        if (photo) out.push({ key: `${date}-${person}`, date, person, photo });
      });
    }
    return out;
  }, [s.photos, derived.weekStart]);

  const openViewer = (photo: Photo, person: PersonId, date: string) => {
    const when = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    setViewer({ photo, caption: `${s.profiles[person].name} · ${when}` });
  };

  const favorsToMe = s.favors
    .filter((f) => f.owed === me)
    .sort((a, b) => sortFavors(a, b));
  const favorsFromMe = s.favors
    .filter((f) => f.ower === me)
    .sort((a, b) => sortFavors(a, b));
  const active = tab === "to-me" ? favorsToMe : favorsFromMe;

  // Proof-gated check-in: you can only mark today done by snapping a photo.
  const markTodayWithProof = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await capturePhoto();
      if (!photo) return; // cancelled — stay un-done
      const key = todayStr();
      mutate((prev) => {
        const log = { ...prev.log, [key]: { ...prev.log[key], [me]: true } };
        const photos = JSON.parse(JSON.stringify(prev.photos ?? {})) as NonNullable<
          AppState["photos"]
        >;
        photos[key] = { ...(photos[key] ?? {}), [me]: photo };
        const next = { ...prev, log, photos };
        prunePhotos(next);
        return next;
      });
    } finally {
      setCapturing(false);
    }
  };

  const undoToday = () => {
    const key = todayStr();
    mutate((prev) => {
      const log = { ...prev.log, [key]: { ...prev.log[key] } };
      delete log[key][me];
      const photos = { ...(prev.photos ?? {}) };
      if (photos[key]) {
        photos[key] = { ...photos[key] };
        delete photos[key][me];
        if (Object.keys(photos[key]).length === 0) delete photos[key];
      }
      return { ...prev, log, photos };
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
          <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={C.inkDim} />
        }
      >
        {/* shared weekly progress */}
        <View style={st.scoreboard}>
          <View style={st.vsNames}>
            <Text style={[st.name, { color: C.playerA }]}>{s.profiles.person1.name}</Text>
            <Text style={st.ampTag}>&</Text>
            <Text style={[st.name, { color: C.playerB }]}>{s.profiles.person2.name}</Text>
          </View>
          <Text style={st.weekLabel}>Week of {weekLabel}</Text>
          <View style={{ marginTop: 14, marginHorizontal: 4, alignSelf: "stretch" }}>
            <TeamBar
              wA={derived.wA}
              wB={derived.wB}
              goalA={s.profiles.person1.goal}
              goalB={s.profiles.person2.goal}
            />
          </View>
          <Text style={st.togetherLine}>
            {derived.wA + derived.wB} workout{derived.wA + derived.wB === 1 ? "" : "s"} together this week
          </Text>
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

        {/* check-in (proof-gated) */}
        <Card style={{ gap: 10 }}>
          <Text style={st.checkinTitle}>Today, {s.profiles[me].name}...</Text>
          {doneToday ? (
            <View style={st.checkinDone}>
              {myPhotoToday && (
                <Pressable onPress={() => openViewer(myPhotoToday, me, todayStr())}>
                  <Image source={{ uri: myPhotoToday.uri }} style={st.checkinProof} />
                </Pressable>
              )}
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={st.checkinDoneText}>Proof logged for today ✓</Text>
                <Pressable onPress={undoToday} style={st.undoBtn}>
                  <Text style={st.undoBtnText}>Undo</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={markTodayWithProof}
              disabled={capturing}
              style={({ pressed }) => [
                st.checkinBtn,
                { backgroundColor: C.ink },
                (pressed || capturing) && { transform: [{ scale: 0.98 }], opacity: 0.9 },
              ]}
            >
              <Text style={st.checkinBtnText}>
                {capturing ? "Opening camera…" : "Snap today's proof 📸"}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* this week's proof */}
        {weekProofs.length > 0 && (
          <View>
            <Text style={st.sectionTitle}>This week's proof</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.proofRow}
            >
              {weekProofs.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => openViewer(p.photo, p.person, p.date)}
                  style={[
                    st.proofThumbWrap,
                    { borderColor: p.person === "person1" ? C.playerA : C.playerB },
                  ]}
                >
                  <Image source={{ uri: p.photo.uri }} style={st.proofThumb} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* favor ledger */}
        <View>
          <View style={st.sectionHead}>
            <Text style={st.sectionTitle}>Little favors</Text>
            <Pressable onPress={() => setModal(true)} style={st.addFavorBtn}>
              <Text style={st.addFavorText}>+ Add favor</Text>
            </Pressable>
          </View>
          <View style={st.favorTabs}>
            <FavorTab
              label={`For me (${favorsToMe.filter((f) => f.status === "pending").length})`}
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
              <Text style={st.empty}>All caught up — sweet. 💛</Text>
            ) : (
              active.map((f) => (
                <FavorItem key={f.id} favor={f} me={me} state={s} onToggle={toggleFavor} />
              ))
            )}
          </View>
        </View>

        {error && <Text style={st.syncNote}>{error}</Text>}

        {code && code !== "local" && (
          <Pressable
            style={st.codeCard}
            onPress={() => {
              (globalThis as any).navigator?.clipboard?.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Text style={st.codeLabel}>Pairing code — share with your partner to sync</Text>
            <Text style={st.codeValue}>{copied ? "Copied ✓" : code}</Text>
          </Pressable>
        )}

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

      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <Pressable style={st.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer && (
            <>
              <Image source={{ uri: viewer.photo.uri }} style={st.viewerImage} resizeMode="contain" />
              <Text style={st.viewerCaption}>{viewer.caption}</Text>
              <Text style={st.viewerHint}>Tap anywhere to close</Text>
            </>
          )}
        </Pressable>
      </Modal>
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
      <Text style={[st.favorTabText, active && { color: C.paper }]}>{label}</Text>
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
  const direction = favor.ower === me ? `Your treat for ${otherName}` : `${otherName}'s treat for you`;
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
  ampTag: { fontFamily: F.display, fontSize: 24, color: C.inkFaint },
  weekLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.inkFaint,
    marginTop: 4,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  togetherLine: {
    fontFamily: F.bodyMed,
    fontSize: 13,
    color: C.inkDim,
    marginTop: 10,
    textAlign: "center",
  },

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
    color: C.inkFaint,
    textTransform: "uppercase",
  },
  ringWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  ringFrac: { fontFamily: F.monoMed, fontSize: 15, color: C.ink },
  playerName: { fontFamily: F.bodyBold, fontSize: 15, color: C.ink },
  stats: { flexDirection: "row", gap: 14, marginTop: 2 },
  statNum: { fontFamily: F.display, fontSize: 20, color: C.ink },
  statLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.inkFaint,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 3,
  },

  checkinTitle: { fontSize: 15, color: C.inkDim, fontFamily: F.body },
  checkinBtn: { paddingVertical: 18, borderRadius: 14, alignItems: "center" },
  checkinBtnText: { fontFamily: F.display, fontSize: 19, color: C.paper, letterSpacing: 0.4 },
  checkinDone: { flexDirection: "row", alignItems: "center", gap: 14 },
  checkinProof: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.streak,
    backgroundColor: C.surfaceRaised,
  },
  checkinDoneText: { fontFamily: F.display, fontSize: 18, color: C.streak, letterSpacing: 0.3 },
  undoBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  undoBtnText: { fontFamily: F.bodySemi, fontSize: 12, color: C.inkDim },
  proofRow: { gap: 10, paddingVertical: 10, paddingRight: 8 },
  proofThumbWrap: { borderRadius: 12, borderWidth: 2, padding: 2 },
  proofThumb: { width: 56, height: 56, borderRadius: 9, backgroundColor: C.surfaceRaised },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 14,
  },
  viewerImage: { width: "100%", height: "72%", borderRadius: 14 },
  viewerCaption: { fontFamily: F.display, fontSize: 18, color: C.paper, letterSpacing: 0.3 },
  viewerHint: { fontFamily: F.mono, fontSize: 11, color: "rgba(255,255,255,0.55)" },

  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: F.display, fontSize: 17, color: C.ink, letterSpacing: 0.4 },
  addFavorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    backgroundColor: "transparent",
  },
  addFavorText: { fontFamily: F.bodySemi, fontSize: 13, color: C.inkDim },
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
  favorTabActive: { backgroundColor: C.ink, borderColor: C.ink },
  favorTabText: { fontSize: 13, fontFamily: F.bodySemi, color: C.inkDim },
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
  favorText: { fontSize: 14, lineHeight: 18, color: C.ink, fontFamily: F.body },
  favorMeta: { fontFamily: F.mono, fontSize: 10, color: C.inkFaint, marginTop: 2 },
  favorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  favorBtnText: { fontSize: 12, color: C.inkDim, fontFamily: F.body },
  empty: { color: C.inkFaint, fontSize: 13, textAlign: "center", paddingVertical: 18, fontFamily: F.body },

  codeCard: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    backgroundColor: C.surfaceRaised,
  },
  codeLabel: { fontFamily: F.mono, fontSize: 10, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.8 },
  codeValue: { fontFamily: F.display, fontSize: 26, color: C.ink, letterSpacing: 4 },

  syncNote: { color: C.inkFaint, fontSize: 11, textAlign: "center", fontFamily: F.mono },
  footer: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 8 },
  footerLink: { fontFamily: F.mono, fontSize: 11, color: C.inkFaint, textDecorationLine: "underline" },
});
