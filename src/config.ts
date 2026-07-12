// Sync backend config. Filled after deploying the AWS backend (see infra/ + README).
// Set via Expo public env vars (EXPO_PUBLIC_* are inlined into the client bundle).
// If unset, the app runs local-only on one device (no cross-phone sync).
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE ?? "").replace(/\/+$/, "");
export const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

export const syncEnabled = (): boolean => API_BASE.length > 0 && API_KEY.length > 0;
