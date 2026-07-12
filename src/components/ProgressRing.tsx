// Circular progress ring — port of ringSvg() from the prototype. Animates the
// stroke dashoffset on value change (§5 motion notes).
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 88;
const R = 38;
const CIRC = 2 * Math.PI * R;

export function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(1, pct));
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // dashoffset isn't native-drivable
    }).start();
  }, [clamped, anim]);

  const dashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });

  return (
    <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle
        cx={44}
        cy={44}
        r={R}
        fill="none"
        stroke={C.surfaceBorder}
        strokeWidth={8}
      />
      <AnimatedCircle
        cx={44}
        cy={44}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={dashoffset}
      />
    </Svg>
  );
}
