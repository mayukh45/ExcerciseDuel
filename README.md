# Exercise Duel

A two-player exercise-accountability app for couples, built with Expo — a
**web app** (Expo Router / React Native Web) hosted on AWS. Each person sets a
weekly workout goal; logging a workout earns a point, missing your weekly goal
auto-creates a "favor" you owe your partner. Ported from the web prototype in
`~/Downloads/excercise/` (see `design.md` for the game design).

## Run it

```bash
npm install
npm start          # expo start --web → http://localhost:8081
```

Without a backend configured, the app runs **local-only** on one device (no
cross-phone sync) — good for trying it out. For the real two-phone duel, set up
sync below.

## Sync backend (AWS)

Lightweight and ~free: one DynamoDB table + one Lambda behind a Function URL —
no API Gateway, no servers. The Lambda stores one shared JSON state blob per
6-char duel code, guarded by a shared API key and a `rev` counter for
last-write-wins concurrency.

Deploy it to **your own** AWS account:

```bash
AWS_PROFILE=you AWS_REGION=us-west-2 ./infra/deploy.sh
```

It prints two values. Put them in `.env` at the project root:

```bash
cp .env.example .env
# EXPO_PUBLIC_API_BASE=https://xxxx.lambda-url.us-west-2.on.aws
# EXPO_PUBLIC_API_KEY=<generated key>
```

Restart `npm start` after editing `.env`. Now the app shows a **duel code**
screen: one partner taps "Start a new duel" (gets a code + does onboarding),
the other taps "Join with a code". Both phones then pick "who's holding this
phone" and share state.

Cost: DynamoDB on-demand + Lambda free tier ≈ $0 for two users.

## Layout

```
App.tsx                  routing (connect → onboard → identity → dashboard)
src/logic.ts             pure business logic (ported verbatim), + logic.test.ts
src/types.ts             data model
src/store.tsx            local (AsyncStorage) + AWS sync behind one hook
src/remote.ts            sync client (GET/PUT /state, rev conflict handling)
src/config.ts            reads EXPO_PUBLIC_* env; syncEnabled()
src/theme.ts             color + font tokens
src/photo.ts             camera capture + compress (proof photos); prune lives in logic.ts
src/components/          TeamBar (shared weekly progress), ProgressRing, ui primitives
src/screens/             Onboarding, IdentityPicker, Connect, Dashboard, FavorModal
infra/backend-template.yaml   CloudFormation (DynamoDB + Lambda + Function URL)
infra/backend.js         editable copy of the Lambda handler
infra/deploy.sh          deploy to your AWS account, prints the env values
```

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run test:logic   # assert-based self-check of week/streak/rollover logic
```

## Notes / not built (yet)

- **Auth** is a shared duel code + API key — the whole model for a private
  2-person app. Add real accounts only if it grows past couples.
- Sync is foreground-pull + pull-to-refresh (no realtime push) — enough for two
  people. Auto-favors for a missed week evaluate only the single most-recent
  elapsed week (matches the prototype; no backfill).
- **Proof photos**: marking a workout done requires a camera snap. Photos are
  downscaled/compressed to small thumbnails (`src/photo.ts`) and stored *inline*
  in the synced state blob, kept to the last 30 days and capped by a byte budget
  (`prunePhotos` in `logic.ts`) so the single DynamoDB item stays under its 400KB
  limit. For a guaranteed full-res archive, move the bytes to S3 and keep only
  keys in the blob.
- **Web-only.** iOS/Android targets were removed — hosted as a web app (add to
  home screen for an app-like feel). No native push/widgets.
