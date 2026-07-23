// Shared weekly-progress bar (couply rework of the old tug-of-war rope). Instead
// of two players pulling a knot against each other, both partners' workouts fill
// one track together, toward their combined weekly goal. Coral grows from the
// left, teal continues it — a full bar means you both hit your goals this week.
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { C } from "../theme";

const TRACK_H = 14;

export function TeamBar({
  wA,
  wB,
  goalA,
  goalB,
}: {
  wA: number;
  wB: number;
  goalA: number;
  goalB: number;
}) {
  const combinedGoal = Math.max(1, goalA + goalB);
  // Each partner's share of the shared goal; capped so the two never overflow.
  const aFrac = Math.max(0, Math.min(1, wA / combinedGoal));
  const bFrac = Math.max(0, Math.min(1 - aFrac, wB / combinedGoal));

  const aAnim = useRef(new Animated.Value(aFrac)).current;
  const bAnim = useRef(new Animated.Value(bFrac)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(aAnim, {
        toValue: aFrac,
        duration: 550,
        easing: Easing.bezier(0.2, 0.9, 0.3, 1),
        useNativeDriver: false,
      }),
      Animated.timing(bAnim, {
        toValue: bFrac,
        duration: 550,
        easing: Easing.bezier(0.2, 0.9, 0.3, 1),
        useNativeDriver: false,
      }),
    ]).start();
  }, [aFrac, bFrac, aAnim, bAnim]);

  const toWidth = (a: Animated.Value) =>
    a.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View
      style={{
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        overflow: "hidden",
        backgroundColor: C.surfaceRaised,
        borderWidth: 1,
        borderColor: C.surfaceBorder,
        flexDirection: "row",
      }}
    >
      <Animated.View style={{ width: toWidth(aAnim), backgroundColor: C.playerA }} />
      <Animated.View style={{ width: toWidth(bAnim), backgroundColor: C.playerB }} />
    </View>
  );
}
