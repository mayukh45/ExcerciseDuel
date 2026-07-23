// Color + font tokens. Warm "paper" theme — cozy, couply: espresso ink on cream,
// coral + teal for the two partners, dusty rose for favors, sage for wins.
export const C = {
  paper: "#FBF4EA", // app background — warm cream
  surface: "#FFFDF8", // cards
  surfaceRaised: "#F3E9D8", // raised chips / tabs / "you" card — warm sand
  surfaceBorder: "#E7D8C1", // soft warm hairline
  ink: "#3D322B", // primary text — warm espresso
  inkDim: "#6E6157", // secondary text — muted brown
  inkFaint: "#A99A88", // tertiary text / labels — soft taupe
  playerA: "#E4785B", // partner one — warm coral
  playerALight: "#EF9C86",
  playerAAlt: "#D2694D",
  playerB: "#3FA79A", // partner two — warm teal
  playerBLight: "#79C6BB",
  playerBAlt: "#348C81",
  streak: "#7B9E5B", // wins / streaks — warm sage
  favor: "#C97B6E", // favors — gentle dusty rose (not a punishing red)
  favorLight: "#DDA093",
} as const;

// Font family keys registered by useFonts (see App.tsx). Fredoka = rounded,
// friendly display; Space Grotesk = body; IBM Plex Mono = small utility labels.
export const F = {
  display: "Fredoka_600SemiBold",
  displayBold: "Fredoka_700Bold",
  body: "SpaceGrotesk_400Regular",
  bodyMed: "SpaceGrotesk_500Medium",
  bodySemi: "SpaceGrotesk_600SemiBold",
  bodyBold: "SpaceGrotesk_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMed: "IBMPlexMono_500Medium",
} as const;
