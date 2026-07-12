// Color + font tokens — ported from the prototype's :root vars and §5 of design.md.
export const C = {
  ink: "#1B1A17",
  surface: "#252320",
  surfaceRaised: "#2E2B27",
  surfaceBorder: "#3A362F",
  chalk: "#F4F0E6",
  chalkDim: "#B8B2A6",
  chalkFaint: "#7A7568",
  playerA: "#4C7EA8",
  playerALight: "#8FB6D6",
  playerAAlt: "#3E6E96", // rope stripe
  playerB: "#E0A23D",
  playerBLight: "#F0C878",
  playerBAlt: "#CC8F2E", // rope stripe
  streak: "#A8D14C",
  favor: "#B84B3C",
  favorLight: "#D98B7E",
} as const;

// Font family keys registered by useFonts (see App.tsx). Anton = display,
// Space Grotesk = body, IBM Plex Mono = utility/labels.
export const F = {
  display: "Anton_400Regular",
  body: "SpaceGrotesk_400Regular",
  bodyMed: "SpaceGrotesk_500Medium",
  bodySemi: "SpaceGrotesk_600SemiBold",
  bodyBold: "SpaceGrotesk_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMed: "IBMPlexMono_500Medium",
} as const;
