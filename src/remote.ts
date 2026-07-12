// Thin AWS sync client. The backend stores one shared JSON state blob per duel
// code, with a monotonic `rev` for optimistic concurrency (see infra/backend.js).
import { API_BASE, API_KEY } from "./config";
import { AppState } from "./types";

export class ConflictError extends Error {
  constructor(public latest: RemoteState) {
    super("rev conflict");
  }
}

export interface RemoteState {
  state: AppState;
  rev: number;
}

const headers = () => ({
  "content-type": "application/json",
  "x-api-key": API_KEY,
});

/** Returns null if no shared state exists yet for this code. */
export async function getRemote(code: string): Promise<RemoteState | null> {
  const r = await fetch(`${API_BASE}/state?code=${encodeURIComponent(code)}`, {
    headers: headers(),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getRemote ${r.status}`);
  return (await r.json()) as RemoteState;
}

/**
 * Writes state. Pass the rev you based your edit on (0 to create). On a
 * concurrent write the server returns 409 with the latest state — surfaced as
 * ConflictError so the caller can replay its mutation onto the fresh state.
 */
export async function putRemote(
  code: string,
  state: AppState,
  rev: number
): Promise<RemoteState> {
  const r = await fetch(`${API_BASE}/state`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ code, state, rev }),
  });
  if (r.status === 409) throw new ConflictError((await r.json()) as RemoteState);
  if (!r.ok) throw new Error(`putRemote ${r.status}`);
  return (await r.json()) as RemoteState;
}
