// App state store: local persistence (AsyncStorage) + optional AWS sync, behind
// one hook. Mutations apply a pure updater to the current state, persist locally,
// then push to the backend with pull-and-replay on rev conflict so two phones
// converge without a lost update.
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState as RNAppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, PersonId } from "./types";
import { checkWeekRollover } from "./logic";
import { syncEnabled } from "./config";
import { ConflictError, getRemote, putRemote, RemoteState } from "./remote";

const K = {
  identity: "duel.identity",
  code: "duel.code",
  state: "duel.state",
  rev: "duel.rev",
};

type Updater = (s: AppState) => AppState;

interface Store {
  loading: boolean;
  syncing: boolean;
  error: string | null;
  state: AppState | null;
  identity: PersonId | null;
  code: string | null;
  setIdentity: (id: PersonId) => Promise<void>;
  /** Create or join a shared duel by code. Returns the resolved state (remote wins if it exists). */
  bootWithCode: (code: string, initial: AppState | null) => Promise<AppState | null>;
  mutate: (fn: Updater) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useDuel = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDuel outside provider");
  return c;
};

export function DuelProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [identity, setIdentityState] = useState<PersonId | null>(null);
  const [code, setCode] = useState<string | null>(null);

  // rev of the last remote sync we know about; 0 means "not yet on server".
  const revRef = useRef(0);
  const codeRef = useRef<string | null>(null);

  const persistLocal = useCallback(async (s: AppState, rev: number) => {
    await AsyncStorage.multiSet([
      [K.state, JSON.stringify(s)],
      [K.rev, String(rev)],
    ]);
  }, []);

  // Persist + broadcast a freshly-synced remote snapshot.
  const adoptRemote = useCallback(
    async (r: RemoteState) => {
      revRef.current = r.rev;
      setState(r.state);
      await persistLocal(r.state, r.rev);
    },
    [persistLocal]
  );

  const bootWithCode = useCallback(
    async (c: string, initial: AppState | null): Promise<AppState | null> => {
      setCode(c);
      codeRef.current = c;
      await AsyncStorage.setItem(K.code, c);

      if (!syncEnabled()) {
        // Local-only: use initial (onboarding) or whatever we already cached.
        const s = initial ?? state;
        if (s) {
          revRef.current = 0;
          setState(s);
          await persistLocal(s, 0);
        }
        return s;
      }

      setSyncing(true);
      try {
        const remote = await getRemote(c);
        if (remote) {
          await adoptRemote(remote);
          return remote.state;
        }
        if (initial) {
          const created = await putRemote(c, initial, 0);
          await adoptRemote(created);
          return created.state;
        }
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [adoptRemote, persistLocal, state]
  );

  const mutate = useCallback(
    async (fn: Updater) => {
      if (!state) return;
      const next = fn(state);
      setState(next); // optimistic
      const c = codeRef.current;

      if (!syncEnabled() || !c) {
        await persistLocal(next, revRef.current);
        return;
      }

      setSyncing(true);
      try {
        try {
          const saved = await putRemote(c, next, revRef.current);
          await adoptRemote(saved);
        } catch (e) {
          if (e instanceof ConflictError) {
            // Someone else wrote first: replay our mutation onto their latest.
            const replayed = fn(e.latest.state);
            const saved = await putRemote(c, replayed, e.latest.rev);
            await adoptRemote(saved);
          } else {
            throw e;
          }
        }
        setError(null);
      } catch (e: any) {
        // Keep the optimistic local change; surface a soft error, retry on refresh.
        await persistLocal(next, revRef.current);
        setError("Offline — changes saved on this phone, will sync when online.");
      } finally {
        setSyncing(false);
      }
    },
    [state, adoptRemote, persistLocal]
  );

  const refresh = useCallback(async () => {
    const c = codeRef.current;
    if (!syncEnabled() || !c) {
      // Local rollover only.
      if (state) {
        const s = structuredCopy(state);
        if (checkWeekRollover(s)) {
          setState(s);
          await persistLocal(s, revRef.current);
        }
      }
      return;
    }
    setSyncing(true);
    try {
      const remote = await getRemote(c);
      if (remote) {
        const s = structuredCopy(remote.state);
        if (checkWeekRollover(s)) {
          const saved = await putRemote(c, s, remote.rev);
          await adoptRemote(saved);
        } else {
          await adoptRemote(remote);
        }
      }
      setError(null);
    } catch {
      setError("Couldn't reach sync server — showing last known state.");
    } finally {
      setSyncing(false);
    }
  }, [state, adoptRemote, persistLocal]);

  const setIdentity = useCallback(async (id: PersonId) => {
    setIdentityState(id);
    await AsyncStorage.setItem(K.identity, id);
  }, []);

  // Boot: load local cache, resolve code, sync, run rollover once.
  useEffect(() => {
    (async () => {
      try {
        const [id, savedCode, savedState, savedRev] = await AsyncStorage.multiGet([
          K.identity,
          K.code,
          K.state,
          K.rev,
        ]);
        if (id[1]) setIdentityState(id[1] as PersonId);
        revRef.current = savedRev[1] ? parseInt(savedRev[1], 10) : 0;

        const cached: AppState | null = savedState[1]
          ? JSON.parse(savedState[1])
          : null;
        if (cached) setState(cached);

        const c = savedCode[1];
        if (c) {
          codeRef.current = c;
          setCode(c);
          const resolved = await bootWithCode(c, cached);
          const s = structuredCopy((resolved ?? cached)!);
          if (s && checkWeekRollover(s)) {
            setState(s);
            if (syncEnabled() && c) {
              try {
                const saved = await putRemote(c, s, revRef.current);
                await adoptRemote(saved);
              } catch {
                await persistLocal(s, revRef.current);
              }
            } else {
              await persistLocal(s, revRef.current);
            }
          }
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull latest + re-run rollover when the app returns to foreground.
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active" && !loading) refresh();
    });
    return () => sub.remove();
  }, [loading, refresh]);

  const value = useMemo<Store>(
    () => ({
      loading,
      syncing,
      error,
      state,
      identity,
      code,
      setIdentity,
      bootWithCode,
      mutate,
      refresh,
    }),
    [loading, syncing, error, state, identity, code, setIdentity, bootWithCode, mutate, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Deep clone so rollover mutations don't touch React state in place.
function structuredCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
