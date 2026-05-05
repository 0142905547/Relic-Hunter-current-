import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";

export type QuestType = "critter" | "elite" | "boss" | "hazard";
export type StatCategory = "strength" | "intelligence" | "endurance" | "agility" | "wisdom";

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  statCategory: StatCategory;
  estimatedMinutes: number;
  xpReward: number;
  goldReward: number;
  completed: boolean;
  completedAt?: number;
  hp: number;
  maxHp: number;
  createdAt: number;
  isHabit: boolean;
  habitStreak: number;
}

export interface StatInfo {
  level: number;
  xp: number;
  xpToNext: number;
}

export interface HeroStats {
  strength: StatInfo;
  intelligence: StatInfo;
  endurance: StatInfo;
  agility: StatInfo;
  wisdom: StatInfo;
}

export interface Hero {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  gold: number;
  totalGoldEarned: number;
  stats: HeroStats;
  unlockedClasses: StatCategory[];
  questsCompleted: number;
  bossesDefeated: number;
  perfectDays: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: "digital" | "real";
  icon: string;
  purchased: boolean;
  purchasedAt?: number;
  usesLeft: number;
  maxUses: number;
  section?: "base";
  builderPoints?: number;
  targetBuilding?: BuildingKey;
}

export type BuildingKey = "townHall" | "barracks" | "temple" | "walls" | "windmill";

export interface BuildingData {
  tier: number;
  builderPoints: number;
}

export const TIER_THRESHOLDS = [0, 1000, 4000, 8000, 15000];

export function getTierFromPoints(points: number): number {
  return Math.min(5, TIER_THRESHOLDS.reduce((t, threshold, i) => points >= threshold ? i + 1 : t, 1));
}

export function addBuilderPointsToBase(bd: BaseData, building: BuildingKey, pts: number): BaseData {
  const current = bd.buildings[building];
  const newPoints = current.builderPoints + pts;
  const newTier = getTierFromPoints(newPoints);
  return {
    ...bd,
    buildings: {
      ...bd.buildings,
      [building]: { tier: newTier, builderPoints: newPoints },
    },
  };
}

export interface Purchase {
  id: string;
  itemId: string;
  itemName: string;
  cost: number;
  timestamp: number;
}

export interface ShadowRaid {
  date: string;
  goldLost: number;
  deflected: boolean;
}

export interface BaseData {
  pendingBubbles: Partial<Record<StatCategory, { gold: number; xp: number }>>;
  lootCart: { gold: number; xp: number } | null;
  lootCartDate: string;
  monuments: string[];
  builderHuts: number;
  lanternCharges: number;
  clearedArea: number;
  shadowRaids: ShadowRaid[];
  brokenBuildings: StatCategory[];
  raidShields: number;
  lootMultiplier: number;
  buildings: Record<BuildingKey, BuildingData>;
}

// ─── Class Config (exported for use in UI) ──────────────────────────────────
export const CLASS_CONFIG: Record<StatCategory, {
  name: string;
  building: string;
  passive: string;
  passiveDesc: string;
  callToAdventure: string;
  color: string;
  icon: string;
  xpBonusMultiplier: number;
  goldBonusMultiplier: number;
  unlockLevel: number;
}> = {
  strength: {
    name: "The Warrior",
    building: "The Forge",
    passive: "Reckless Strike",
    passiveDesc: "+20% XP on Strength tasks. Chance to instantly clear Critters.",
    callToAdventure: "The weight of your goals would crush a lesser soul. But you do not seek a lighter load; you seek broader shoulders. Stand tall, grip the day, and break through the barriers by force of will.",
    color: "#C42B2B",
    icon: "sword",
    xpBonusMultiplier: 1.20,
    goldBonusMultiplier: 1.0,
    unlockLevel: 5,
  },
  intelligence: {
    name: "The Artificer",
    building: "The Workshop",
    passive: "Optimization",
    passiveDesc: "+20% Gold on Intelligence tasks. Reduces all Shop prices by 5%.",
    callToAdventure: "The world is a machine of gears and logic, but it has grown rusty with your procrastination. You have found the blueprints to a better life. Pick up your tools; it is time to re-engineer your reality.",
    color: "#7B4FD6",
    icon: "cog",
    xpBonusMultiplier: 1.0,
    goldBonusMultiplier: 1.20,
    unlockLevel: 5,
  },
  endurance: {
    name: "The Tank",
    building: "The Bastion",
    passive: "Iron Will",
    passiveDesc: "+25% XP on long tasks (2+ hours). Reduces Stamina cost by 15%.",
    callToAdventure: "The storm of the Daily Grind breaks against you like waves upon a cliff. You are the wall that does not crumble. Let the hours pass; you will still be standing when the sun sets.",
    color: "#3A7D44",
    icon: "shield",
    xpBonusMultiplier: 1.25,
    goldBonusMultiplier: 1.0,
    unlockLevel: 5,
  },
  agility: {
    name: "The Paladin",
    building: "The Cathedral",
    passive: "Divine Reflex",
    passiveDesc: "+50% XP bonus on completed Habits. Holy light trails on the UI.",
    callToAdventure: "Chaos moves fast, but you must move faster. Discipline is your armor, and your habits are your blade. Do not hesitate — strike down the distractions before they take root.",
    color: "#D4A017",
    icon: "lightning-bolt",
    xpBonusMultiplier: 1.50,
    goldBonusMultiplier: 1.0,
    unlockLevel: 5,
  },
  wisdom: {
    name: "The Mage",
    building: "The Sanctum",
    passive: "Mind's Eye",
    passiveDesc: "+20% Mana recovered on Wisdom tasks. Reveals hidden loot after deep work.",
    callToAdventure: "You have peered into the stillness of the mind and found a font of power. Your focus is a spell that reshapes the world. Quiet the noise, look deep into the task, and manifest your vision.",
    color: "#4A90D9",
    icon: "eye-circle",
    xpBonusMultiplier: 1.0,
    goldBonusMultiplier: 1.0,
    unlockLevel: 5,
  },
};

// ─── 15-Tier Class Trees ─────────────────────────────────────────────────────
export interface ClassTier {
  tier: number;
  name: string;
  description: string;
}

export const CLASS_TIERS: Record<StatCategory, ClassTier[]> = {
  strength: [
    { tier: 1, name: "Coin of War",       description: "+5% Gold reward on all completed tasks." },
    { tier: 2, name: "Heavy Hand",        description: "The screen shakes when you slay an enemy — feel the impact." },
    { tier: 3, name: "War Discipline",    description: "+5% Strength XP on all Strength tasks." },
    { tier: 4, name: "Momentum: I",       description: "Completing 2 tasks back-to-back within 10 minutes grants +10% XP on the second." },
    { tier: 5, name: "Momentum: II",      description: "Back-to-back chains of 3+ tasks give +15% XP on each subsequent task." },
    { tier: 6, name: "Relentless Drive",  description: "Killing 5+ tasks in a day refills 20 Stamina as bonus." },
    { tier: 7, name: "Sunder: I",         description: "Bosses lose 5% of their HP when you complete a warm-up task before fighting." },
    { tier: 8, name: "Sunder: II",        description: "Bosses start with 10% less HP if you have completed at least one task today." },
    { tier: 9, name: "Warlord's Scar",    description: "Defeating a Boss permanently increases your max Stamina by 5." },
    { tier: 10, name: "Adrenaline: I",    description: "Slaying a task instantly refills 5% of your Stamina." },
    { tier: 11, name: "Adrenaline: II",   description: "Stamina refill on slay scales to 10% for Elites and Bosses." },
    { tier: 12, name: "Berserker's Edge", description: "While Stamina is above 80%, all Strength XP gains are increased by 10%." },
    { tier: 13, name: "God of Might: I",  description: "Critter tasks can be completed without opening the timer (instant slay)." },
    { tier: 14, name: "God of Might: II", description: "Strength tasks with 5+ minutes estimated give +10% bonus Gold." },
    { tier: 15, name: "Titan's Throne",   description: "Your Gold bonus from the Warrior class permanently increases to +25% on Strength tasks." },
  ],
  intelligence: [
    { tier: 1, name: "Bargain Theory",    description: "-5% Shop prices on all purchases." },
    { tier: 2, name: "Blueprint",         description: "Reward preview displays full XP/Gold details before you start a task." },
    { tier: 3, name: "Rapid Study",       description: "+5% Intelligence XP on all Intelligence tasks." },
    { tier: 4, name: "Resource Loop: I",  description: "Every Shop purchase has a 10% chance to refund half the gold cost." },
    { tier: 5, name: "Resource Loop: II", description: "Refund chance increases to 15%, and can now trigger on any gold spent." },
    { tier: 6, name: "Circuit Efficiency",description: "Each completed Intelligence task reduces the cost of the next Shop item by 2% (stacks up to 10%)." },
    { tier: 7, name: "Auto-Repair: I",    description: "Missed habits deal 10% less HP damage per missed day." },
    { tier: 8, name: "Auto-Repair: II",   description: "HP penalty reduction increases to 20%. Your base always holds." },
    { tier: 9, name: "Redundancy Protocol",description: "Completing 3 Intelligence tasks in one day restores 15 HP." },
    { tier: 10, name: "Master Tinkerer: I",description: "Shop discounts and refunds stack with each other." },
    { tier: 11, name: "Master Tinkerer: II",description: "Any item purchased twice in a row costs 20% less on the second purchase." },
    { tier: 12, name: "Overclock",        description: "+10% XP on all Intelligence tasks while Mana is above 50%." },
    { tier: 13, name: "The Singularity: I",description: "Once per day, you may convert any task type to earn Intelligence XP instead." },
    { tier: 14, name: "The Singularity: II",description: "The daily conversion also grants a +20% XP bonus on that converted task." },
    { tier: 15, name: "Infinite Loop",    description: "Intelligence Gold bonus permanently increases to +30% on all Intelligence tasks." },
  ],
  endurance: [
    { tier: 1, name: "Thick Skin",        description: "+10 Max HP permanently." },
    { tier: 2, name: "Gravel Road",       description: "+5% Endurance XP on all Endurance tasks." },
    { tier: 3, name: "Stone Bars",        description: "HP and Stamina bars display with a reinforced stone texture." },
    { tier: 4, name: "Plating: I",        description: "Missed tasks deal 10% less damage to your HP." },
    { tier: 5, name: "Plating: II",       description: "Damage reduction from missed tasks increases to 20%." },
    { tier: 6, name: "Fortified Will",    description: "If you complete at least one task, missed habit penalties are halved that day." },
    { tier: 7, name: "Second Wind: I",    description: "When Stamina hits 0, you gain a temporary +10 Stamina once per day." },
    { tier: 8, name: "Second Wind: II",   description: "Emergency Stamina reserve increases to +20, activates when Stamina drops below 10." },
    { tier: 9, name: "Iron Resolve",      description: "Completing a 2+ hour task immediately restores 15 Stamina." },
    { tier: 10, name: "Immovable Object: I",description: "Multi-day Bosses retain full progress even if you skip one day." },
    { tier: 11, name: "Immovable Object: II",description: "Boss progress now persists for up to 3 skipped days before decaying." },
    { tier: 12, name: "Bastion's Gift",   description: "Every 10 Endurance tasks completed permanently increases max Stamina by 5." },
    { tier: 13, name: "The Juggernaut: I",description: "You are immune to the visibility restriction on Fog of War — all tasks always visible." },
    { tier: 14, name: "The Juggernaut: II",description: "Stamina costs on all tasks reduced by an additional 15% (stacks with base reduction)." },
    { tier: 15, name: "Last Man Standing", description: "Endurance XP bonus on 2+ hour tasks permanently increases to +35%." },
  ],
  agility: [
    { tier: 1, name: "Swift Foot",        description: "+5% Agility XP on all Agility tasks." },
    { tier: 2, name: "Swift Justice",     description: "Tasks completed in under 15 minutes receive an additional +5% XP bonus." },
    { tier: 3, name: "Holy Light",        description: "Completed task buttons have a brief glowing trail effect." },
    { tier: 4, name: "Cleanse: I",        description: "Completing any Agility task heals 3% of your total HP." },
    { tier: 5, name: "Cleanse: II",       description: "HP recovery on Agility tasks increases to 5% of max HP." },
    { tier: 6, name: "Grace of Motion",   description: "Habit streaks of 3+ days add a +5% XP bonus to all tasks that day." },
    { tier: 7, name: "Holy Shield: I",    description: "The first missed habit each day deals 0 HP damage (shielded)." },
    { tier: 8, name: "Holy Shield: II",   description: "The first two missed habits each day are shielded from HP damage." },
    { tier: 9, name: "Radiant Guard",     description: "Completing a full day's habits triggers a 20 Mana restoration bonus." },
    { tier: 10, name: "Consecration: I",  description: "Each day of an active habit streak adds +1% Gold bonus (max +15%)." },
    { tier: 11, name: "Consecration: II", description: "Gold bonus from streaks doubles, up to a cap of +30%." },
    { tier: 12, name: "Virtue's Reward",  description: "A perfect day (all habits done) permanently increases max Agility XP rate by 5%." },
    { tier: 13, name: "Eternal Light: I", description: "Missing a single task does not break your perfect day streak." },
    { tier: 14, name: "Eternal Light: II",description: "Even 2 missed tasks in a day do not break the perfect day streak." },
    { tier: 15, name: "Divine Champion",  description: "Habit XP bonus permanently increases to +65% on all Hazard/Habit tasks." },
  ],
  wisdom: [
    { tier: 1, name: "Mind's Clarity",    description: "+5% Wisdom XP on all Wisdom tasks." },
    { tier: 2, name: "Focus Pulse",       description: "While a Cast Timer is running, the UI softly dims everything else." },
    { tier: 3, name: "Mana Well",         description: "+5% Max Mana permanently." },
    { tier: 4, name: "Transmutation: I",  description: "10% of daily XP earned from tasks converts into bonus Gold." },
    { tier: 5, name: "Transmutation: II", description: "Conversion rate increases to 15% of daily XP." },
    { tier: 6, name: "Deep Thought",      description: "Intelligence and Wisdom tasks with 30+ minutes estimated get +8% XP." },
    { tier: 7, name: "Astral Pause: I",   description: "Each Cast Timer can be paused for up to 5 minutes once without penalty." },
    { tier: 8, name: "Astral Pause: II",  description: "Pause time extends to 10 minutes, and can be used twice per task." },
    { tier: 9, name: "Serenity",          description: "Completing a Wisdom task restores 5 Mana in addition to normal Mana recovery." },
    { tier: 10, name: "Clarity: I",       description: "While the Cast Timer is active, Mana regeneration is 50% faster." },
    { tier: 11, name: "Clarity: II",      description: "Mana regen while timing doubles — focus refills the well." },
    { tier: 12, name: "Astral Weave",     description: "+10% XP on all Wisdom tasks while Mana is above 60%." },
    { tier: 13, name: "Archmage's Insight: I",description: "Completing a World Boss instantly completes all active Critter tasks." },
    { tier: 14, name: "Archmage's Insight: II",description: "Critters completed via Archmage's Insight grant 50% of their normal XP." },
    { tier: 15, name: "The Infinite Mind", description: "Mana recovery on Wisdom tasks permanently increases to +35% of max Mana." },
  ],
};

// ─── Difficulty multipliers from the PDF ────────────────────────────────────
const DIFFICULTY: Record<QuestType, number> = {
  critter: 1.0,
  elite: 2.5,
  boss: 5.0,
  hazard: 1.5,
};

// XP = T × D × 0.5   Gold = T × D × 0.15  (balanced for Level 1→2 ≈ 1 day)
function calcXpReward(type: QuestType, estimatedMinutes: number): number {
  return Math.max(5, Math.round(estimatedMinutes * DIFFICULTY[type] * 0.5));
}
function calcGoldReward(type: QuestType, estimatedMinutes: number): number {
  return Math.max(1, Math.round(estimatedMinutes * DIFFICULTY[type] * 0.15));
}

function calcBossHp(estimatedMinutes: number): number {
  return Math.max(3, Math.ceil(estimatedMinutes / 30));
}

// Level 1→2 = 100 XP, Level 9→10 ≈ 2000 XP  (matches PDF)
function calcStatXpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.45, level - 1));
}

function calcAverageLevel(stats: HeroStats): number {
  const levels = Object.values(stats).map((s: StatInfo) => s.level);
  return Math.max(1, Math.round(levels.reduce((a, b) => a + b, 0) / levels.length));
}

function calcMaxHp(level: number): number {
  return 100 + level * 10;
}

function makeStatInfo(level = 1): StatInfo {
  return { level, xp: 0, xpToNext: calcStatXpToNext(level) };
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT_HERO: Hero = {
  name: "Wanderer",
  level: 1,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  mana: 100,
  maxMana: 100,
  gold: 50,
  totalGoldEarned: 0,
  stats: {
    strength: makeStatInfo(1),
    intelligence: makeStatInfo(1),
    endurance: makeStatInfo(1),
    agility: makeStatInfo(1),
    wisdom: makeStatInfo(1),
  },
  unlockedClasses: [],
  questsCompleted: 0,
  bossesDefeated: 0,
  perfectDays: 0,
};

function migrateHero(raw: any): Hero {
  const STAT_KEYS: StatCategory[] = ["strength", "intelligence", "endurance", "agility", "wisdom"];
  const stats: HeroStats = {
    strength: makeStatInfo(1), intelligence: makeStatInfo(1),
    endurance: makeStatInfo(1), agility: makeStatInfo(1), wisdom: makeStatInfo(1),
  };

  for (const key of STAT_KEYS) {
    const rs = raw.stats?.[key];
    if (rs == null) stats[key] = makeStatInfo(1);
    else if (typeof rs === "number") stats[key] = makeStatInfo(Math.max(1, rs));
    else if (typeof rs === "object" && "level" in rs) stats[key] = rs as StatInfo;
    else stats[key] = makeStatInfo(1);
  }

  const level = calcAverageLevel(stats);
  const unlockedClasses: StatCategory[] = raw.unlockedClasses ??
    STAT_KEYS.filter(k => stats[k].level >= 5);

  return {
    name: raw.name ?? DEFAULT_HERO.name,
    level,
    hp: raw.hp ?? calcMaxHp(level),
    maxHp: raw.maxHp ?? calcMaxHp(level),
    stamina: raw.stamina ?? DEFAULT_HERO.stamina,
    maxStamina: raw.maxStamina ?? DEFAULT_HERO.maxStamina,
    mana: raw.mana ?? DEFAULT_HERO.mana,
    maxMana: raw.maxMana ?? DEFAULT_HERO.maxMana,
    gold: raw.gold ?? DEFAULT_HERO.gold,
    totalGoldEarned: raw.totalGoldEarned ?? 0,
    stats,
    unlockedClasses,
    questsCompleted: raw.questsCompleted ?? 0,
    bossesDefeated: raw.bossesDefeated ?? 0,
    perfectDays: raw.perfectDays ?? 0,
  };
}

const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id: "stamina_potion", name: "Stamina Elixir", description: "Restore full Stamina instantly.", cost: 80, type: "digital", icon: "flask", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "mana_crystal", name: "Mana Crystal", description: "Restore full Mana instantly.", cost: 80, type: "digital", icon: "diamond", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "xp_boost", name: "Tome of Knowledge", description: "Double XP gain for the next 3 quests.", cost: 120, type: "digital", icon: "book", purchased: false, usesLeft: 0, maxUses: 3 },
  { id: "skip_scroll", name: "Scroll of Evasion", description: "Skip one quest guilt-free.", cost: 150, type: "digital", icon: "scroll", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "gold_magnet", name: "Merchant's Charm", description: "Double gold gain for your next 5 quests.", cost: 200, type: "digital", icon: "magnet", purchased: false, usesLeft: 0, maxUses: 5 },
  { id: "stamina_mega", name: "Warrior's Brew", description: "Restore 50 Stamina instantly.", cost: 50, type: "digital", icon: "flask-outline", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "mana_mega", name: "Arcane Draught", description: "Restore 50 Mana instantly.", cost: 50, type: "digital", icon: "bottle-tonic", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "full_restore", name: "Phoenix Feather", description: "Fully restore both Stamina and Mana.", cost: 250, type: "digital", icon: "fire", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "xp_surge", name: "Rune of Power", description: "Triple XP on your next completed quest.", cost: 300, type: "digital", icon: "auto-fix", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "gold_rush", name: "Goblin Purse", description: "Gain 100 bonus gold immediately.", cost: 80, type: "digital", icon: "bag-personal", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "hp_flask", name: "Healing Flask", description: "Restore 50 HP instantly.", cost: 60, type: "digital", icon: "flask-round-bottom", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "full_heal", name: "Resurrection Stone", description: "Restore HP to full.", cost: 200, type: "digital", icon: "heart", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "title_champion", name: "Title: The Champion", description: "Unlock the Champion hero title.", cost: 500, type: "digital", icon: "trophy", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "title_shadow", name: "Title: Shadow Walker", description: "Unlock the Shadow Walker hero title.", cost: 500, type: "digital", icon: "eye-off", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "streak_shield", name: "Streak Shield", description: "Protect your habit streak from a missed day.", cost: 350, type: "digital", icon: "shield-star", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "luck_coin", name: "Coin of Fortune", description: "Your next quest rewards 1.5× gold and XP.", cost: 160, type: "digital", icon: "circle-half-full", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "critter_bonus", name: "Critter Slayer Seal", description: "Critter quests give +50% XP for one day.", cost: 140, type: "digital", icon: "sword-cross", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "elite_bonus", name: "Elite Hunter's Mark", description: "Elite quests give +50% gold for one day.", cost: 200, type: "digital", icon: "target", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "daily_loot", name: "Daily Loot Box", description: "Gain 75 XP and 20 gold instantly.", cost: 60, type: "digital", icon: "gift", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "rest_voucher", name: "Hammock of Sloth", description: "Log a rest without losing Stamina.", cost: 90, type: "digital", icon: "weather-night", purchased: false, usesLeft: 0, maxUses: 1 },
  { id: "break_15", name: "15-Min Break", description: "A guilt-free 15-minute pause.", cost: 60, type: "real", icon: "timer", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "break_30", name: "30-Min Break", description: "Half an hour of total freedom.", cost: 100, type: "real", icon: "coffee", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "break_60", name: "1-Hour Recharge", description: "A full hour off the clock.", cost: 200, type: "real", icon: "clock-outline", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "nap", name: "Power Nap", description: "A 20-minute nap, no guilt.", cost: 120, type: "real", icon: "sleep", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "coffee", name: "Artisan Coffee", description: "Treat yourself to your favorite coffee.", cost: 80, type: "real", icon: "coffee-maker", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "snack", name: "Victory Snack", description: "Your favorite snack, guilt-free.", cost: 70, type: "real", icon: "food-apple", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "fav_meal", name: "Feast of Champions", description: "Order or cook your favorite meal.", cost: 250, type: "real", icon: "food", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "dessert", name: "Sweet Indulgence", description: "Ice cream, cake — your choice.", cost: 130, type: "real", icon: "ice-cream", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "dinner_out", name: "Dinner Out", description: "Eat at a restaurant of your choice.", cost: 600, type: "real", icon: "silverware-fork-knife", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "show_ep", name: "Episode Pass", description: "Watch one TV episode, no strings.", cost: 100, type: "real", icon: "television-play", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "movie_night", name: "Movie Night", description: "A full movie viewing session.", cost: 350, type: "real", icon: "film", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "game_hour", name: "Game Session", description: "1 hour of your favorite video game.", cost: 180, type: "real", icon: "gamepad-variant", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "music_session", name: "Playlist & Chill", description: "30 minutes of pure music listening.", cost: 90, type: "real", icon: "music", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "social_night", name: "Game Night", description: "An evening with friends or family.", cost: 800, type: "real", icon: "account-group", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "book_time", name: "Reading Hour", description: "An hour lost in a good book.", cost: 150, type: "real", icon: "book-open-page-variant", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "bath", name: "Ritual Bath", description: "A long, luxurious bath or shower.", cost: 160, type: "real", icon: "shower", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "walk", name: "Leisure Walk", description: "A 30-minute walk with no destination.", cost: 80, type: "real", icon: "walk", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "massage", name: "Massage Session", description: "Book a massage or give yourself one.", cost: 900, type: "real", icon: "hand-heart", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "shopping", name: "Shopping Spree", description: "Buy yourself something you have been eyeing.", cost: 1500, type: "real", icon: "shopping", purchased: false, usesLeft: 0, maxUses: 99 },
  { id: "day_off", name: "Legendary Day Off", description: "A full day off with zero obligations.", cost: 2000, type: "real", icon: "calendar-star", purchased: false, usesLeft: 0, maxUses: 99 },
  // ─── Base Building (Tier 1+, all available from start) ─────────────────────
  { id: "wooden_planks",    name: "Wooden Planks",      description: "Fresh-cut lumber planks for framing and construction. Apply to any building.",           cost: 40,  type: "digital", icon: "hammer",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 5  },
  { id: "iron_nails",       name: "Iron Nails",         description: "A satchel of iron nails for fastening beams and boards. Apply to any building.",          cost: 35,  type: "digital", icon: "wrench",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 5  },
  { id: "builders_rope",    name: "Builder's Rope",     description: "Heavy braided rope for scaffolding and rigging. Apply to any building.",                   cost: 50,  type: "digital", icon: "link-variant",     purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 6  },
  { id: "builders_hammer",  name: "Builder's Hammer",   description: "A balanced hammer for framing and finishing. Apply to any building.",                      cost: 45,  type: "digital", icon: "hammer",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 6  },
  { id: "stone_blocks",     name: "Stone Blocks",       description: "Quarried stone blocks — the foundation of any great structure. Apply to any building.",     cost: 60,  type: "digital", icon: "wall",             purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 7  },
  { id: "iron_bolts",       name: "Iron Bolts",         description: "Heavy iron bolts for joining structural beams. Apply to any building.",                     cost: 65,  type: "digital", icon: "tools",            purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 7  },
  { id: "carpenters_saw",   name: "Carpenter's Saw",    description: "A finely sharpened saw for precision woodwork. Apply to any building.",                    cost: 70,  type: "digital", icon: "saw-blade",        purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 8  },
  { id: "trowel_mortar",    name: "Trowel & Mortar",    description: "A mason's essentials for laying stone and brick. Apply to any building.",                   cost: 75,  type: "digital", icon: "trowel",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 8  },
  { id: "timber_frame",     name: "Timber Frame",       description: "Pre-cut timber framing to speed construction. Apply to any building.",                      cost: 80,  type: "digital", icon: "home-outline",     purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 9  },
  { id: "brick_kiln",       name: "Brick Kiln",         description: "A portable kiln for crafting bricks from raw clay. Apply to any building.",                 cost: 85,  type: "digital", icon: "fire",             purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 9  },
  { id: "pulley_block",     name: "Pulley & Block",     description: "Mechanical advantage for lifting heavy materials. Apply to any building.",                  cost: 90,  type: "digital", icon: "cogs",             purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 9  },
  { id: "scaffold_poles",   name: "Scaffold Poles",     description: "Iron poles for reaching heights and supporting workers. Apply to any building.",            cost: 95,  type: "digital", icon: "ladder",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 10 },
  { id: "arch_stones",      name: "Arch Stones",        description: "Precision-cut keystone set for vaulted arches. Apply to any building.",                     cost: 105, type: "digital", icon: "arch",             purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 11 },
  { id: "masons_toolkit",   name: "Mason's Toolkit",    description: "Professional mason's chisels, squares, and levels. Apply to any building.",                 cost: 115, type: "digital", icon: "briefcase-outline", purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 11 },
  { id: "blueprint_draft",  name: "Blueprint Draft",    description: "Detailed plans that optimize construction efficiency. Apply to any building.",               cost: 110, type: "digital", icon: "file-document",   purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 10 },
  { id: "iron_ingots",      name: "Iron Ingots",        description: "Smelted iron ingots for structural reinforcement. Apply to any building.",                  cost: 130, type: "digital", icon: "anvil",            purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 12 },
  { id: "quarry_access",    name: "Quarry Access",      description: "A deed granting access to premium stone quarries. Apply to any building.",                  cost: 140, type: "digital", icon: "pickaxe",          purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 12 },
  { id: "supply_cart",      name: "Supply Cart",        description: "A fully-loaded supply cart delivering raw materials. Apply to any building.",                cost: 100, type: "digital", icon: "cart",             purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 10 },
  { id: "guild_contract",   name: "Guild Contract",     description: "A contract with the Builder's Guild for premium skilled labour. Apply to any building.",     cost: 180, type: "digital", icon: "handshake",        purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 13 },
  { id: "architects_plans", name: "Architect's Plans",  description: "Master blueprints that dramatically accelerate construction. Apply to any building.",        cost: 200, type: "digital", icon: "ruler-square",     purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 13 },
  { id: "repair_kit",       name: "Repair Kit",         description: "Repairs all broken buildings instantly. Also grants builder points to chosen building.",      cost: 100, type: "digital", icon: "wrench-outline",   purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 9  },
  { id: "surveyor_torch",   name: "Surveyor's Torch",   description: "Grants 2 Lantern Charges for fog exploration. Also grants builder points.",                  cost: 80,  type: "digital", icon: "torch",            purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 8  },
  { id: "lantern_oil",      name: "Lantern Oil",        description: "Grants 3 Lantern Charges instantly. Also grants builder points.",                            cost: 65,  type: "digital", icon: "lantern",          purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 8  },
  { id: "ancient_flare",    name: "Ancient Flare",      description: "Grants 6 Lantern Charges at once. Also grants builder points.",                              cost: 110, type: "digital", icon: "star-four-points", purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 10 },
  { id: "ward_rune",        name: "Ward Rune",          description: "Deflects the next Shadow Raid. Also grants builder points.",                                 cost: 150, type: "digital", icon: "shield-check",     purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 11 },
  { id: "hired_laborer",    name: "Hired Laborer",      description: "Adds 1 permanent Builder Hut to your Base. Also grants builder points.",                     cost: 120, type: "digital", icon: "account-hard-hat", purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 10 },
  { id: "surveyor_map",     name: "Surveyor's Map",     description: "Reveals the next fog area without Lantern Charges. Also grants builder points.",             cost: 200, type: "digital", icon: "map-search",       purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 12 },
  { id: "master_craftsman", name: "Master Craftsman",   description: "Adds 2 permanent Builder Huts. Also grants builder points.",                                 cost: 280, type: "digital", icon: "hammer-wrench",    purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 13 },
  { id: "bastion_wards",    name: "Bastion Wards",      description: "Deflects the next 3 Shadow Raids. Also grants builder points.",                              cost: 400, type: "digital", icon: "castle",           purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 14 },
  { id: "royal_charter",    name: "Royal Charter",      description: "A royal decree granting grand construction rights. Reveals all fog. Grants builder points.", cost: 550, type: "digital", icon: "crown",            purchased: false, usesLeft: 0, maxUses: 1, section: "base", builderPoints: 15 },
];

interface GameContextValue {
  hero: Hero;
  quests: Quest[];
  shopItems: ShopItem[];
  purchases: Purchase[];
  tavernMode: boolean;
  activeQuests: Quest[];
  completedQuests: Quest[];
  habitQuests: Quest[];
  isLoaded: boolean;
  xpBoostActive: boolean;
  xpBoostUsesLeft: number;
  lastResetDate: string;
  newlyUnlockedClass: StatCategory | null;
  dismissClassUnlock: () => void;
  artificerDiscount: number;
  baseData: BaseData;
  addQuest: (q: Omit<Quest, "id" | "createdAt" | "completed" | "completedAt" | "hp" | "xpReward" | "goldReward" | "habitStreak">) => void;
  deleteQuest: (id: string) => void;
  attackBoss: (id: string) => void;
  completeQuest: (id: string, rewardMultiplier?: number) => void;
  purchaseItem: (id: string) => void;
  useItem: (id: string, buildingKey?: BuildingKey) => void;
  updateHeroName: (name: string) => void;
  restHero: () => void;
  resetDay: () => void;
  activateTavern: () => void;
  exitTavern: () => void;
  checkResourcesForQuest: (quest: Quest) => { canStart: boolean; reason: string };
  performance: number;
  collectBubble: (key: StatCategory) => void;
  collectLootCart: () => void;
  clearFog: () => void;
  repairBuilding: (key: StatCategory) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const DEFAULT_BUILDINGS: Record<BuildingKey, BuildingData> = {
  townHall:   { tier: 1, builderPoints: 0 },
  barracks:   { tier: 1, builderPoints: 0 },
  temple:     { tier: 1, builderPoints: 0 },
  walls:      { tier: 1, builderPoints: 0 },
  windmill:   { tier: 1, builderPoints: 0 },
};

const DEFAULT_BASE_DATA: BaseData = {
  pendingBubbles: {},
  lootCart: null,
  lootCartDate: "",
  monuments: [],
  builderHuts: 2,
  lanternCharges: 0,
  clearedArea: 0,
  shadowRaids: [],
  brokenBuildings: [],
  raidShields: 0,
  lootMultiplier: 1,
  buildings: DEFAULT_BUILDINGS,
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<Hero>(DEFAULT_HERO);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>(DEFAULT_SHOP_ITEMS);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [baseData, setBaseData] = useState<BaseData>(DEFAULT_BASE_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string>("");
  const [newlyUnlockedClass, setNewlyUnlockedClass] = useState<StatCategory | null>(null);
  const [tavernMode, setTavernMode] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        setLastResetDate(prev => {
          const today = getTodayDateString();
          if (prev && prev !== today) {
            triggerDailyReset(today);
          }
          return prev;
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isLoaded || !lastResetDate) return;
    const today = getTodayDateString();
    if (lastResetDate !== today) triggerDailyReset(today);
  }, [isLoaded]);

  const loadData = async () => {
    try {
      const [heroJson, questsJson, shopJson, purchasesJson, savedDate, baseJson] = await Promise.all([
        AsyncStorage.getItem("hero_v2"),
        AsyncStorage.getItem("quests"),
        AsyncStorage.getItem("shopItems_v2"),
        AsyncStorage.getItem("purchases"),
        AsyncStorage.getItem("lastResetDate"),
        AsyncStorage.getItem("base_v1"),
      ]);

      if (heroJson) setHero(migrateHero(JSON.parse(heroJson)));
      else {
        const old = await AsyncStorage.getItem("hero");
        if (old) setHero(migrateHero(JSON.parse(old)));
      }

      if (questsJson) setQuests(JSON.parse(questsJson));

      if (shopJson) {
        const saved: ShopItem[] = JSON.parse(shopJson);
        const merged = DEFAULT_SHOP_ITEMS.map(def => saved.find(s => s.id === def.id) ?? def);
        setShopItems(merged);
      }

      if (purchasesJson) setPurchases(JSON.parse(purchasesJson));

      if (baseJson) {
        const parsed = JSON.parse(baseJson);
        setBaseData({
          ...DEFAULT_BASE_DATA,
          ...parsed,
          buildings: {
            ...DEFAULT_BUILDINGS,
            ...(parsed.buildings ?? {}),
          },
        });
      }

      const today = getTodayDateString();
      setLastResetDate(savedDate || today);
      if (!savedDate) await AsyncStorage.setItem("lastResetDate", today);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveHero = useCallback(async (h: Hero) => { await AsyncStorage.setItem("hero_v2", JSON.stringify(h)); }, []);
  const saveQuests = useCallback(async (q: Quest[]) => { await AsyncStorage.setItem("quests", JSON.stringify(q)); }, []);
  const saveShop = useCallback(async (s: ShopItem[]) => { await AsyncStorage.setItem("shopItems_v2", JSON.stringify(s)); }, []);
  const savePurchases = useCallback(async (p: Purchase[]) => { await AsyncStorage.setItem("purchases", JSON.stringify(p)); }, []);
  const saveBase = useCallback(async (b: BaseData) => { await AsyncStorage.setItem("base_v1", JSON.stringify(b)); }, []);

  const clearFog = useCallback(() => {
    setBaseData(prev => {
      if (prev.lanternCharges < 3 || prev.clearedArea >= 5) return prev;
      const updated = { ...prev, lanternCharges: prev.lanternCharges - 3, clearedArea: prev.clearedArea + 1 };
      saveBase(updated);
      return updated;
    });
  }, [saveBase]);

  const repairBuilding = useCallback((key: StatCategory) => {
    setBaseData(prev => {
      if (!prev.brokenBuildings.includes(key)) return prev;
      const updated = { ...prev, brokenBuildings: prev.brokenBuildings.filter(b => b !== key) };
      saveBase(updated);
      return updated;
    });
  }, [saveBase]);

  const dismissClassUnlock = useCallback(() => setNewlyUnlockedClass(null), []);

  // Artificer discount: 5% if Intelligence >= 5
  const artificerDiscount = useMemo(() => {
    return hero.stats.intelligence.level >= CLASS_CONFIG.intelligence.unlockLevel ? 0.05 : 0;
  }, [hero.stats.intelligence.level]);

  const xpBoostActive = useMemo(() => (shopItems.find(s => s.id === "xp_boost")?.usesLeft ?? 0) > 0, [shopItems]);
  const xpBoostUsesLeft = useMemo(() => shopItems.find(s => s.id === "xp_boost")?.usesLeft ?? 0, [shopItems]);

  const decrementXpBoost = useCallback(() => {
    setShopItems(prev => {
      const u = prev.map(s => s.id === "xp_boost" ? { ...s, usesLeft: Math.max(0, s.usesLeft - 1) } : s);
      saveShop(u);
      return u;
    });
  }, [saveShop]);

  /** Apply class bonuses from PDF — Warrior/Artificer/Tank/Paladin/Mage */
  function applyClassBonus(
    xp: number,
    gold: number,
    stat: StatCategory,
    questType: QuestType,
    estimatedMinutes: number,
    isHabit: boolean,
    unlockedClasses: StatCategory[],
    mana: number,
    maxMana: number
  ): { xp: number; gold: number; bonusMana: number } {
    let finalXp = xp;
    let finalGold = gold;
    let bonusMana = 0;

    // Warrior: +20% XP on Strength tasks
    if (stat === "strength" && unlockedClasses.includes("strength")) {
      finalXp = Math.round(finalXp * CLASS_CONFIG.strength.xpBonusMultiplier);
    }
    // Artificer: +20% Gold on Intelligence tasks
    if (stat === "intelligence" && unlockedClasses.includes("intelligence")) {
      finalGold = Math.round(finalGold * CLASS_CONFIG.intelligence.goldBonusMultiplier);
    }
    // Tank: +25% XP on Endurance tasks 2+ hours (120+ min)
    if (stat === "endurance" && estimatedMinutes >= 120 && unlockedClasses.includes("endurance")) {
      finalXp = Math.round(finalXp * CLASS_CONFIG.endurance.xpBonusMultiplier);
    }
    // Paladin: +50% XP on Hazard/Habit tasks
    if (isHabit && unlockedClasses.includes("agility")) {
      finalXp = Math.round(finalXp * CLASS_CONFIG.agility.xpBonusMultiplier);
    }
    // Mage: +20% Mana recovery on Wisdom tasks
    if (stat === "wisdom" && unlockedClasses.includes("wisdom")) {
      bonusMana = Math.round(maxMana * 0.20);
    }

    return { xp: finalXp, gold: finalGold, bonusMana };
  }

  const awardStatXpAndGold = useCallback((
    currentHero: Hero,
    xp: number,
    gold: number,
    stat: StatCategory,
    isBoss: boolean,
    useXpBoost: boolean,
    questType: QuestType,
    estimatedMinutes: number,
    isHabit: boolean,
  ): { hero: Hero; newlyUnlocked: StatCategory | null } => {
    const actualXp = useXpBoost ? xp * 2 : xp;

    const { xp: bonusXp, gold: bonusGold, bonusMana } = applyClassBonus(
      actualXp, gold, stat, questType, estimatedMinutes,
      isHabit, currentHero.unlockedClasses, currentHero.mana, currentHero.maxMana
    );

    const currentStat = currentHero.stats[stat];
    let statXp = currentStat.xp + bonusXp;
    let statLevel = currentStat.level;
    let statXpToNext = currentStat.xpToNext;

    while (statXp >= statXpToNext) {
      statXp -= statXpToNext;
      statLevel++;
      statXpToNext = calcStatXpToNext(statLevel);
    }

    const newStats: HeroStats = { ...currentHero.stats, [stat]: { level: statLevel, xp: statXp, xpToNext: statXpToNext } };
    const newLevel = calcAverageLevel(newStats);

    // Check class unlock at Level 5
    const classUnlockLevel = CLASS_CONFIG[stat].unlockLevel;
    let newlyUnlocked: StatCategory | null = null;
    const wasUnlocked = currentHero.unlockedClasses.includes(stat);
    const isNowUnlocked = statLevel >= classUnlockLevel;
    if (isNowUnlocked && !wasUnlocked) newlyUnlocked = stat;

    const unlockedClasses = newlyUnlocked
      ? [...currentHero.unlockedClasses, newlyUnlocked]
      : currentHero.unlockedClasses;

    const newHero: Hero = {
      ...currentHero,
      level: newLevel,
      maxHp: calcMaxHp(newLevel),
      hp: Math.min(currentHero.hp, calcMaxHp(newLevel)),
      mana: Math.min(currentHero.maxMana, currentHero.mana + bonusMana),
      gold: currentHero.gold + bonusGold,
      totalGoldEarned: currentHero.totalGoldEarned + bonusGold,
      stats: newStats,
      unlockedClasses,
      questsCompleted: currentHero.questsCompleted + 1,
      bossesDefeated: isBoss ? currentHero.bossesDefeated + 1 : currentHero.bossesDefeated,
    };

    return { hero: newHero, newlyUnlocked };
  }, []);

  const collectBubble = useCallback((key: StatCategory) => {
    setBaseData(prev => {
      const bubble = prev.pendingBubbles[key];
      if (!bubble) return prev;
      setHero(h => {
        const { hero: awarded } = awardStatXpAndGold(h, bubble.xp, bubble.gold, key, false, false, "critter", 0, false);
        saveHero(awarded);
        return awarded;
      });
      const updated = { ...prev, pendingBubbles: { ...prev.pendingBubbles } };
      delete updated.pendingBubbles[key];
      saveBase(updated);
      return updated;
    });
  }, [awardStatXpAndGold, saveHero, saveBase]);

  const collectLootCart = useCallback(() => {
    setBaseData(prev => {
      if (!prev.lootCart) return prev;
      const mult = prev.lootMultiplier ?? 1;
      const gold = Math.round(prev.lootCart.gold * mult);
      setHero(h => {
        const u = { ...h, gold: h.gold + gold, totalGoldEarned: h.totalGoldEarned + gold };
        saveHero(u);
        return u;
      });
      const updated = { ...prev, lootCart: null, lootMultiplier: 1 };
      saveBase(updated);
      return updated;
    });
  }, [saveHero, saveBase]);

  const addQuest = useCallback((
    q: Omit<Quest, "id" | "createdAt" | "completed" | "completedAt" | "hp" | "xpReward" | "goldReward" | "habitStreak">
  ) => {
    const maxHp = q.type === "boss" ? calcBossHp(q.estimatedMinutes) : 1;
    const newQuest: Quest = {
      ...q,
      id: generateId(),
      createdAt: Date.now(),
      completed: false,
      hp: maxHp,
      maxHp,
      xpReward: calcXpReward(q.type, q.estimatedMinutes),
      goldReward: calcGoldReward(q.type, q.estimatedMinutes),
      habitStreak: 0,
    };
    setQuests(prev => { const u = [newQuest, ...prev]; saveQuests(u); return u; });
  }, [saveQuests]);

  const deleteQuest = useCallback((id: string) => {
    setQuests(prev => { const u = prev.filter(q => q.id !== id); saveQuests(u); return u; });
  }, [saveQuests]);

  const attackBoss = useCallback((id: string) => {
    setQuests(prev => {
      const quest = prev.find(q => q.id === id);
      if (!quest || quest.type !== "boss") return prev;

      const newHp = quest.hp - 1;
      const defeated = newHp <= 0;
      const updated = prev.map(q =>
        q.id === id ? { ...q, hp: Math.max(0, newHp), completed: defeated, completedAt: defeated ? Date.now() : undefined } : q
      );
      saveQuests(updated);

      if (defeated) {
        setHero(h => {
          const { hero: awarded, newlyUnlocked } = awardStatXpAndGold(
            h, quest.xpReward, quest.goldReward, quest.statCategory,
            true, xpBoostActive, quest.type, quest.estimatedMinutes, quest.isHabit
          );
          const staminaCost = h.unlockedClasses.includes("endurance") ? Math.round(15 * 0.85) : 15;
          const final = { ...awarded, stamina: Math.max(0, awarded.stamina - staminaCost) };
          saveHero(final);
          if (newlyUnlocked) setNewlyUnlockedClass(newlyUnlocked);
          return final;
        });
        if (xpBoostActive) decrementXpBoost();
      }
      return updated;
    });
  }, [awardStatXpAndGold, xpBoostActive, decrementXpBoost, saveQuests, saveHero]);

  /** rewardMultiplier: 1.0 = full, 0.2 = cheese cap (< 50% of estimated time) */
  const completeQuest = useCallback((id: string, rewardMultiplier: number = 1.0) => {
    setQuests(prev => {
      const quest = prev.find(q => q.id === id);
      if (!quest || quest.completed) return prev;

      const scaledXp   = Math.round(quest.xpReward   * rewardMultiplier);
      const scaledGold = Math.round(quest.goldReward  * rewardMultiplier);

      const updated = prev.map(q =>
        q.id === id ? { ...q, completed: true, completedAt: Date.now(), habitStreak: q.isHabit ? q.habitStreak + 1 : q.habitStreak } : q
      );
      saveQuests(updated);

      setHero(h => {
        const { hero: awarded, newlyUnlocked } = awardStatXpAndGold(
          h, scaledXp, scaledGold, quest.statCategory,
          quest.type === "boss", xpBoostActive, quest.type, quest.estimatedMinutes, quest.isHabit
        );
        const baseStamCost = quest.type === "elite" ? 20 : quest.type === "boss" ? 15 : 5;
        const staminaCost = h.unlockedClasses.includes("endurance")
          ? Math.round(baseStamCost * 0.85) : baseStamCost;
        const baseManaCost = (quest.statCategory === "intelligence" || quest.statCategory === "wisdom") ? 15 : 0;
        const manaCost = h.unlockedClasses.includes("wisdom")
          ? Math.round(baseManaCost * 0.85) : baseManaCost;

        const final = {
          ...awarded,
          stamina: Math.max(0, awarded.stamina - staminaCost),
          mana: Math.max(0, awarded.mana - manaCost),
        };
        saveHero(final);
        if (newlyUnlocked) setNewlyUnlockedClass(newlyUnlocked);
        return final;
      });

      if (xpBoostActive) decrementXpBoost();

      // ─── Base System Side-Effects ───────────────────────────────────
      setBaseData(prev => {
        let updated = { ...prev };

        // Habits: hold 20% of rewards as a resource bubble for the building
        if (quest.isHabit) {
          const bubGold = Math.max(1, Math.round(scaledGold * 0.20));
          const bubXp   = Math.max(1, Math.round(scaledXp   * 0.20));
          const existing = prev.pendingBubbles[quest.statCategory] ?? { gold: 0, xp: 0 };
          updated = {
            ...updated,
            pendingBubbles: {
              ...updated.pendingBubbles,
              [quest.statCategory]: { gold: existing.gold + bubGold, xp: existing.xp + bubXp },
            },
          };
        }

        // Elite quests: grant 1 Lantern Charge (Fog of War)
        if (quest.type === "elite") {
          updated = { ...updated, lanternCharges: updated.lanternCharges + 1 };
        }

        // Boss quests: add monument
        if (quest.type === "boss") {
          const alreadyHas = updated.monuments.includes(quest.title);
          if (!alreadyHas) updated = { ...updated, monuments: [quest.title, ...updated.monuments].slice(0, 20) };
        }

        saveBase(updated);
        return updated;
      });

      return updated;
    });
  }, [awardStatXpAndGold, xpBoostActive, decrementXpBoost, saveQuests, saveHero, saveBase]);

  const activateTavern = useCallback(() => setTavernMode(true), []);
  const exitTavern = useCallback(() => setTavernMode(false), []);

  /** Check whether the hero has enough resources to begin a quest */
  const checkResourcesForQuest = useCallback((quest: Quest): { canStart: boolean; reason: string } => {
    const needsStamina = ["strength", "endurance", "agility"].includes(quest.statCategory);
    const needsMana    = ["intelligence", "wisdom"].includes(quest.statCategory);
    if (needsStamina && hero.stamina <= 0) {
      return { canStart: false, reason: "Your Stamina is depleted. Rest or use a Stamina Elixir from the Shop." };
    }
    if (needsMana && hero.mana <= 0) {
      return { canStart: false, reason: "Your Mana is empty. Rest or use a Mana Crystal from the Shop." };
    }
    return { canStart: true, reason: "" };
  }, [hero.stamina, hero.mana]);

  const purchaseItem = useCallback((id: string) => {
    const item = shopItems.find(s => s.id === id);
    if (!item) return;

    setHero(prev => {
      const discountedCost = Math.round(item.cost * (1 - artificerDiscount));
      if (prev.gold < discountedCost) return prev;
      const updated = { ...prev, gold: prev.gold - discountedCost };
      saveHero(updated);

      const purchase: Purchase = {
        id: generateId(),
        itemId: item.id,
        itemName: item.name,
        cost: discountedCost,
        timestamp: Date.now(),
      };
      setPurchases(p => { const u = [purchase, ...p]; savePurchases(u); return u; });
      return updated;
    });

    setShopItems(prev => {
      const u = prev.map(s => s.id === id ? { ...s, purchased: true, purchasedAt: Date.now(), usesLeft: s.usesLeft + s.maxUses } : s);
      saveShop(u);
      return u;
    });
  }, [shopItems, artificerDiscount, saveShop, saveHero, savePurchases]);

  const useItem = useCallback((id: string, buildingKey?: BuildingKey) => {
    const item = shopItems.find(s => s.id === id);
    if (!item || item.usesLeft <= 0) return;

    setShopItems(prev => { const u = prev.map(s => s.id === id ? { ...s, usesLeft: Math.max(0, s.usesLeft - 1) } : s); saveShop(u); return u; });

    // ─── Classic items ──────────────────────────────────────────────────────
    if (id === "stamina_potion" || id === "full_restore")  setHero(prev => { const u = { ...prev, stamina: prev.maxStamina }; saveHero(u); return u; });
    if (id === "mana_crystal"   || id === "full_restore")  setHero(prev => { const u = { ...prev, mana:    prev.maxMana    }; saveHero(u); return u; });
    if (id === "stamina_mega")   setHero(prev => { const u = { ...prev, stamina: Math.min(prev.maxStamina, prev.stamina + 50) }; saveHero(u); return u; });
    if (id === "mana_mega")      setHero(prev => { const u = { ...prev, mana:    Math.min(prev.maxMana,    prev.mana    + 50) }; saveHero(u); return u; });
    if (id === "gold_rush")      setHero(prev => { const u = { ...prev, gold: prev.gold + 100, totalGoldEarned: prev.totalGoldEarned + 100 }; saveHero(u); return u; });
    if (id === "hp_flask")       setHero(prev => { const u = { ...prev, hp: Math.min(prev.maxHp, prev.hp + 50) }; saveHero(u); return u; });
    if (id === "full_heal")      setHero(prev => { const u = { ...prev, hp: prev.maxHp }; saveHero(u); return u; });
    if (id === "daily_loot")     setHero(prev => { const u = { ...prev, gold: prev.gold + 20, totalGoldEarned: prev.totalGoldEarned + 20 }; saveHero(u); return u; });

    // ─── Base Building: lantern charges ─────────────────────────────────────
    if (id === "surveyor_torch") setBaseData(prev => { const u = { ...prev, lanternCharges: prev.lanternCharges + 2 }; saveBase(u); return u; });
    if (id === "lantern_oil")    setBaseData(prev => { const u = { ...prev, lanternCharges: prev.lanternCharges + 3 }; saveBase(u); return u; });
    if (id === "ancient_flare")  setBaseData(prev => { const u = { ...prev, lanternCharges: prev.lanternCharges + 6 }; saveBase(u); return u; });
    if (id === "royal_charter")  setBaseData(prev => { const u = { ...prev, lanternCharges: prev.lanternCharges + 3, clearedArea: 4 }; saveBase(u); return u; });

    // ─── Base Building: repair & builders ───────────────────────────────────
    if (id === "repair_kit")       setBaseData(prev => { const u = { ...prev, brokenBuildings: [] }; saveBase(u); return u; });
    if (id === "hired_laborer")    setBaseData(prev => { const u = { ...prev, builderHuts: prev.builderHuts + 1 }; saveBase(u); return u; });
    if (id === "master_craftsman") setBaseData(prev => { const u = { ...prev, builderHuts: prev.builderHuts + 2 }; saveBase(u); return u; });

    // ─── Base Building: raids & fog ──────────────────────────────────────────
    if (id === "ward_rune")     setBaseData(prev => { const u = { ...prev, raidShields: prev.raidShields + 1 }; saveBase(u); return u; });
    if (id === "bastion_wards") setBaseData(prev => { const u = { ...prev, raidShields: prev.raidShields + 3 }; saveBase(u); return u; });
    if (id === "surveyor_map")  setBaseData(prev => { if (prev.clearedArea >= 4) return prev; const u = { ...prev, clearedArea: prev.clearedArea + 1 }; saveBase(u); return u; });

    // ─── Award builder points to chosen building ─────────────────────────────
    if (item.section === "base" && item.builderPoints && buildingKey) {
      const pts = item.builderPoints;
      setBaseData(prev => {
        const updated = addBuilderPointsToBase(prev, buildingKey, pts);
        saveBase(updated);
        return updated;
      });
    }
  }, [shopItems, saveShop, saveHero, saveBase, saveQuests]);

  const updateHeroName = useCallback((name: string) => {
    setHero(prev => { const u = { ...prev, name }; saveHero(u); return u; });
  }, [saveHero]);

  const restHero = useCallback(() => {
    setHero(prev => {
      const u = { ...prev, stamina: Math.min(prev.maxStamina, prev.stamina + 30), mana: Math.min(prev.maxMana, prev.mana + 30) };
      saveHero(u);
      return u;
    });
  }, [saveHero]);

  /**
   * Daily reset: restore resources, reset habits, apply Hazard penalty.
   * HP Loss = (5 × hero.level) per incomplete habit
   * If it's a class-betrayal (Mage missing Wisdom habit), penalty × 2.
   * Also generates Daily Loot Cart and triggers Shadow Raids.
   */
  const triggerDailyReset = useCallback(async (todayKey: string) => {
    setQuests(prev => {
      setHero(h => {
        let totalPenalty = 0;
        let failedHabitCount = 0;
        let completedHabitCount = 0;

        for (const q of prev) {
          if (!q.isHabit) continue;
          if (q.completed) {
            completedHabitCount++;
          } else {
            failedHabitCount++;
            let penalty = 5 * h.level;
            const isPrimaryHabit = (q.statCategory === "wisdom" && h.unlockedClasses.includes("wisdom"))
              || (q.statCategory === "agility" && h.unlockedClasses.includes("agility"));
            if (isPrimaryHabit) penalty *= 2;
            totalPenalty += penalty;
          }
        }

        // Compute shadow raid gold loss upfront
        const enduranceLv = h.stats.endurance.level;
        const shieldDeflects = (baseData.raidShields ?? 0) > 0;
        const raidDeflected  = enduranceLv >= 20 || shieldDeflects;
        const raidPartial    = enduranceLv >= 10 && enduranceLv < 20 && !shieldDeflects;
        let goldLost = 0;
        if (failedHabitCount > 0 && !raidDeflected) {
          const stealPct = raidPartial ? 0.05 : 0.10;
          goldLost = Math.floor(h.gold * stealPct * failedHabitCount);
          goldLost = Math.min(goldLost, Math.floor(h.gold * 0.25));
        }

        const allHabitsComplete = failedHabitCount === 0 && completedHabitCount > 0;
        const updated = {
          ...h,
          hp: Math.max(0, h.hp - totalPenalty),
          stamina: h.maxStamina,
          mana: h.maxMana,
          gold: goldLost > 0 ? Math.max(0, h.gold - goldLost) : h.gold,
          perfectDays: allHabitsComplete ? h.perfectDays + 1 : h.perfectDays,
        };
        saveHero(updated);

        // ─── Base: Loot Cart + Shadow Raids ─────────────────────────────
        setBaseData(bd => {
          let nextBd = { ...bd };

          // Generate loot cart for completed habits
          if (completedHabitCount > 0) {
            nextBd = { ...nextBd, lootCart: { gold: completedHabitCount * 12, xp: completedHabitCount * 18 }, lootCartDate: todayKey };
          }

          // Record shadow raid (even if deflected, so UI can show the deflection message)
          if (failedHabitCount > 0) {
            const raid: ShadowRaid = { date: todayKey, goldLost, deflected: raidDeflected };
            nextBd = { ...nextBd, shadowRaids: [raid, ...nextBd.shadowRaids].slice(0, 7) };
            if (shieldDeflects) {
              nextBd = { ...nextBd, raidShields: Math.max(0, (nextBd.raidShields ?? 1) - 1) };
            }
          }

          saveBase(nextBd);
          return nextBd;
        });

        return updated;
      });

      const kept = prev.filter(q => (q.type === "boss" && !q.completed) || q.isHabit);
      const reset = kept.map(q => q.isHabit ? { ...q, completed: false, completedAt: undefined } : q);
      saveQuests(reset);
      return reset;
    });

    setLastResetDate(todayKey);
    await AsyncStorage.setItem("lastResetDate", todayKey);
  }, [saveQuests, saveHero, saveBase, baseData.raidShields]);

  const resetDay = useCallback(async () => {
    await triggerDailyReset(getTodayDateString());
  }, [triggerDailyReset]);

  const activeQuests = useMemo(() => quests.filter(q => !q.completed || (q.type === "boss" && q.hp > 0)), [quests]);
  const completedQuests = useMemo(() => quests.filter(q => q.completed && !(q.type === "boss" && q.hp > 0)), [quests]);
  const habitQuests = useMemo(() => quests.filter(q => q.isHabit), [quests]);

  const performance = useMemo(() => {
    const s = hero.stamina / hero.maxStamina;
    const m = hero.mana / hero.maxMana;
    return Math.round(((s + m) / 2) * 100);
  }, [hero.stamina, hero.maxStamina, hero.mana, hero.maxMana]);

  const value = useMemo<GameContextValue>(() => ({
    hero, quests, shopItems, purchases, activeQuests, completedQuests, habitQuests,
    isLoaded, xpBoostActive, xpBoostUsesLeft, lastResetDate, newlyUnlockedClass,
    dismissClassUnlock, artificerDiscount, tavernMode, baseData,
    addQuest, deleteQuest, attackBoss, completeQuest, purchaseItem,
    useItem, updateHeroName, restHero, resetDay, activateTavern, exitTavern,
    checkResourcesForQuest, performance,
    collectBubble, collectLootCart, clearFog, repairBuilding,
  }), [hero, quests, shopItems, purchases, activeQuests, completedQuests, habitQuests,
    isLoaded, xpBoostActive, xpBoostUsesLeft, lastResetDate, newlyUnlockedClass,
    dismissClassUnlock, artificerDiscount, tavernMode, baseData,
    addQuest, deleteQuest, attackBoss, completeQuest, purchaseItem,
    useItem, updateHeroName, restHero, resetDay, activateTavern, exitTavern,
    checkResourcesForQuest, performance,
    collectBubble, collectLootCart, clearFog, repairBuilding]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
