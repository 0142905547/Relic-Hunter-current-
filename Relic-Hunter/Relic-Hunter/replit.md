# Relic Hunter: The Daily Dungeon — replit.md

## Overview

Relic Hunter is a gamified productivity mobile app built with Expo (React Native). It transforms daily tasks and goals into a fantasy RPG experience — users create "quests" (tasks) that map to enemy types (Critters, Elites, Bosses, Hazards), earn XP and gold by completing them, level up hero stats, and spend gold in a shop on real-world rewards. The app includes a "Tavern Mode" for recovery/self-care prompts when the user is overwhelmed.

The project runs on Expo with a lightweight Express.js backend. Most game state currently lives in React Context + AsyncStorage on the client. A PostgreSQL database with Drizzle ORM is provisioned for server-side persistence (currently only a `users` table is defined, with room to expand).

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with Expo Router v6 for file-based navigation.
- **Navigation structure**:
  - `app/(tabs)/` — main tab screens: Dungeon (quest list), Hero (stats/profile), Base (village management), Shop (rewards store).
  - `app/add-quest.tsx` — modal screen for creating new quests.
  - `app/_layout.tsx` — root layout wrapping everything in providers + `expo-notifications` handler init.
- **State management**: `GameContext` (React Context + `useState`/`useEffect`) handles all core game logic — quests, hero stats, gold, XP, shop, tavern mode. Game state is persisted locally using `AsyncStorage`.
- **Server communication**: `@tanstack/react-query` + a custom `apiRequest` helper in `lib/query-client.ts`. The API base URL is resolved from `EXPO_PUBLIC_DOMAIN` environment variable.
- **Fonts**: Cinzel (fantasy/title) and Inter (body) loaded via `@expo-google-fonts`.
- **Animations**: `react-native-reanimated` for progress bars and transitions. `expo-haptics` for tactile feedback on actions.
- **UI libraries**: `expo-linear-gradient`, `expo-blur`, `expo-glass-effect`, `@expo/vector-icons` (Ionicons, MaterialCommunityIcons, Feather).
- **Platform support**: iOS and Android primary targets. Portrait orientation only. Web supported but treated as secondary.

### Backend (Express.js)

- **Framework**: Express 5 running via `tsx` (dev) or compiled with `esbuild` (prod).
- **Entry point**: `server/index.ts` — sets up CORS (allowing Replit dev/prod domains and localhost), mounts routes, serves the static Expo web build in production.
- **Routes**: Defined in `server/routes.ts`. Currently minimal (placeholder). All routes should be prefixed with `/api`.
- **Storage layer**: `server/storage.ts` defines an `IStorage` interface. Default implementation is `MemStorage` (in-memory). Intended to be swapped out for a database-backed implementation as features grow.

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Config**: `drizzle.config.ts` points to `./shared/schema.ts` and requires `DATABASE_URL` environment variable.
- **Schema** (`shared/schema.ts`):
  - `users` table: `id` (UUID, primary key), `username` (unique text), `password` (text).
  - Zod validation schemas generated via `drizzle-zod`.
- **Migrations**: Output to `./migrations/` directory. Run with `npm run db:push`.
- The game data model (quests, hero stats, etc.) is currently client-side only and not yet in the database.

### Game Data Model (Client-side, in GameContext)

Key types:
- `Quest`: id, title, description, type (`critter | elite | boss | hazard`), statCategory, estimatedMinutes, xpReward, goldReward, hp/maxHp (boss battles), isHabit, habitStreak.
- `Hero`: name, stats (strength, intelligence, endurance, agility, wisdom — each with level/xp/xpToNext), stamina, mana, gold, class.
- `HeroStats`: per-stat level tracking.
- `ShopItem` / `Purchase`: shop inventory and purchase history.

### Core Game Mechanics

- **Cast Timer**: Tapping any non-boss quest opens `CastTimerModal` — a stopwatch that counts up. User can claim reward after 30s minimum. If claimed before 50% of estimated time, reward multiplier drops to 0.2× (cheese cap). Boss quests still use direct hit-to-defeat attack flow.
- **Resource Gate**: Before opening Cast Timer, `checkResourcesForQuest()` verifies stamina > 0 for physical stats (strength/endurance/agility) and mana > 0 for mental stats (intelligence/wisdom). Depleted resources show an alert.
- **Anti-Guilt Tavern**: Tavern button (mug icon) in the dungeon header activates `tavernMode`. TavernOverlay replaces the quest list with 10 self-care recovery tasks (water, walk, breathe, etc.). Habit streaks are frozen while in Tavern. Tap "Return to the Dungeon" to exit.
- **Daily Reset**: AppState listener triggers at day boundary — incomplete habits apply HP penalty (5 × hero.level per missed habit, 2× for class-betrayal habits). All resources fully restore.
- **Class Passives**: Five stat classes unlock at Stat Level 5. Artificer (intelligence) gives 5% shop discount. Tank (endurance) reduces stamina costs 15%. Mage (wisdom) reduces mana costs 15%.
- **Reward Formula**: XP = T × D × 0.5, Gold = T × D × 0.15, where D = critter:1.0, elite:2.5, boss:5.0, hazard:1.5, T = estimatedMinutes.

### Shared Code

- `shared/schema.ts` is shared between frontend and backend via TypeScript path alias `@shared/*`.

### Build & Deployment

- **Dev**: `npm run expo:dev` starts Expo with Replit proxy URLs. `npm run server:dev` starts Express with `tsx`.
- **Prod build**: `scripts/build.js` orchestrates a Metro static bundle, then Express serves it.
- **Replit-specific**: CORS and domain resolution uses `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` env vars. `EXPO_PUBLIC_DOMAIN` is set to the Replit dev domain for API routing.

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** (via `pg`) | Relational database for server-side persistence. Requires `DATABASE_URL` env var. |
| **Drizzle ORM** | Type-safe SQL query builder and schema management for PostgreSQL. |
| **Expo ecosystem** | Expo Router (navigation), expo-haptics, expo-linear-gradient, expo-blur, expo-image-picker, expo-location, expo-font, expo-splash-screen, expo-glass-effect. |
| **AsyncStorage** | Local on-device persistence for game state (no server round-trip needed for core game loop). |
| **TanStack React Query** | Server state management and API data fetching. |
| **react-native-reanimated** | Smooth animations for progress bars and UI transitions. |
| **react-native-gesture-handler** | Touch/gesture support. |
| **react-native-keyboard-controller** | Keyboard-aware scroll views. |
| **@expo-google-fonts/cinzel & inter** | Custom fonts: Cinzel for fantasy titles, Inter for body text. |
| **expo-linear-gradient** | Gradient backgrounds for cards and UI elements. |
| **esbuild** | Server bundle for production deployment. |
| **Zod + drizzle-zod** | Runtime schema validation for API inputs. |

### Environment Variables Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `EXPO_PUBLIC_DOMAIN` | Public domain for API base URL (auto-set in Replit dev) |
| `REPLIT_DEV_DOMAIN` | Replit dev tunnel domain (used for CORS and Expo proxy) |
| `REPLIT_DOMAINS` | Comma-separated list of production Replit domains (used for CORS) |