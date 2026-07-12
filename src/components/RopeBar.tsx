// Signature tug-of-war rope bar (§5). A horizontal rope-textured track filled
// from each side in that player's color, meeting at a sliding knot whose
// position reflects this week's point ratio. Animates on value change.
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, LayoutChangeEvent } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { C } from "../theme";

const TRACK_H = 10;
const KNOT = 22;

// Diagonal rope stripes: base color with a lighter/darker slash pattern, echoing
// the prototype's repeating-linear-gradient(-45deg,...).
function RopeFill({ id, base, alt }: { id: string; base: string; alt: string }) {
  return (
    <Pattern id={id} patternUnits="userSpaceOnUse" width={16} height={16}
      patternTransform="rotate(-45)">
      <Rect width={16} height={16} fill={base} />
      <Rect x={0} width={8} height={16} fill={alt} />
    </Pattern>
  );
}

export function RopeBar({ pctA }: { pctA: number }) {
  // pctA = player A's share of the week's points, 0..100 (50 when tied/empty).
  const clamped = Math.max(0, Math.min(100, pctA));
  const [w, setW] = useState(0);
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 500,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const fillAWidth = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, w],
  });
  const knotLeft = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [-KNOT / 2, w - KNOT / 2],
  });

  return (
    <View onLayout={onLayout} style={{ height: 34, justifyContent: "center" }}>
      {/* track */}
      <View
        style={{
          height: TRACK_H,
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: C.surfaceRaised,
          borderWidth: 1,
          borderColor: C.surfaceBorder,
          flexDirection: "row",
        }}
      >
        {w > 0 && (
          <Svg width={w} height={TRACK_H}>
            <Defs>
              <RopeFill id="ra" base={C.playerA} alt={C.playerAAlt} />
              <RopeFill id="rb" base={C.playerB} alt={C.playerBAlt} />
            </Defs>
            {/* B fills the whole track; A overlays from the left up to the knot */}
            <Rect x={0} y={0} width={w} height={TRACK_H} fill="url(#rb)" />
            <AnimatedRect x={0} y={0} height={TRACK_H} fill="url(#ra)" widthAnim={fillAWidth} />
          </Svg>
        )}
      </View>
      {/* knot */}
      <Animated.View
        style={{
          position: "absolute",
          top: "50%",
          marginTop: -KNOT / 2,
          left: knotLeft,
          width: KNOT,
          height: KNOT,
          borderRadius: KNOT / 2,
          backgroundColor: C.chalk,
          borderWidth: 3,
          borderColor: C.ink,
        }}
      />
    </View>
  );
}

// Animated <Rect width> wrapper (react-native-svg exposes width as an animatable prop).
const RectAnimated = Animated.createAnimatedComponent(Rect);
function AnimatedRect({
  widthAnim,
  ...props
}: { widthAnim: Animated.AnimatedInterpolation<number> } & React.ComponentProps<typeof Rect>) {
  return <RectAnimated {...props} width={widthAnim as unknown as number} />;
}
