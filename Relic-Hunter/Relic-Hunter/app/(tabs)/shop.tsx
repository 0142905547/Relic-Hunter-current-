import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGame, ShopItem, Purchase, BuildingKey } from "@/context/GameContext";
import COLORS from "@/constants/colors";

type IconLib = "mci" | "feather" | "ionicons";
const ICON_MAP: Record<string, { lib: IconLib; name: string }> = {
  scroll: { lib: "mci", name: "book-open-variant" },
  flask: { lib: "mci", name: "flask" },
  "flask-outline": { lib: "mci", name: "flask-outline" },
  "flask-round-bottom": { lib: "mci", name: "flask-round-bottom" },
  diamond: { lib: "mci", name: "diamond" },
  book: { lib: "mci", name: "book-open-variant" },
  magnet: { lib: "mci", name: "magnet" },
  "bottle-tonic": { lib: "mci", name: "bottle-tonic" },
  fire: { lib: "mci", name: "fire" },
  "auto-fix": { lib: "mci", name: "auto-fix" },
  "bag-personal": { lib: "mci", name: "bag-personal" },
  trophy: { lib: "mci", name: "trophy" },
  "eye-off": { lib: "mci", name: "eye-off" },
  "shield-star": { lib: "mci", name: "shield-star" },
  "circle-half-full": { lib: "mci", name: "circle-half-full" },
  "weather-night": { lib: "mci", name: "weather-night" },
  "sword-cross": { lib: "mci", name: "sword-cross" },
  target: { lib: "mci", name: "target" },
  gift: { lib: "mci", name: "gift" },
  heart: { lib: "mci", name: "heart" },
  timer: { lib: "mci", name: "timer" },
  coffee: { lib: "feather", name: "coffee" },
  "clock-outline": { lib: "mci", name: "clock-outline" },
  sleep: { lib: "mci", name: "sleep" },
  "coffee-maker": { lib: "mci", name: "coffee-maker" },
  "food-apple": { lib: "mci", name: "food-apple" },
  food: { lib: "mci", name: "food" },
  "ice-cream": { lib: "mci", name: "ice-cream" },
  "silverware-fork-knife": { lib: "mci", name: "silverware-fork-knife" },
  "television-play": { lib: "mci", name: "television-play" },
  film: { lib: "feather", name: "film" },
  "gamepad-variant": { lib: "mci", name: "gamepad-variant" },
  music: { lib: "feather", name: "music" },
  "account-group": { lib: "mci", name: "account-group" },
  "book-open-page-variant": { lib: "mci", name: "book-open-page-variant" },
  shower: { lib: "mci", name: "shower" },
  walk: { lib: "mci", name: "walk" },
  "hand-heart": { lib: "mci", name: "hand-heart" },
  shopping: { lib: "mci", name: "shopping" },
  "calendar-star": { lib: "mci", name: "calendar-star" },
  // ─── Base Building icons ────────────────────────────────────────────────────
  torch: { lib: "mci", name: "torch" },
  lantern: { lib: "mci", name: "lamp" },
  tools: { lib: "mci", name: "tools" },
  hammer: { lib: "mci", name: "hammer" },
  "shield-check": { lib: "mci", name: "shield-check" },
  "star-four-points": { lib: "mci", name: "star-four-points" },
  "hammer-wrench": { lib: "mci", name: "hammer-wrench" },
  castle: { lib: "mci", name: "castle" },
  crown: { lib: "mci", name: "crown" },
  "map-search": { lib: "mci", name: "map-search" },
  // ─── New construction icons ──────────────────────────────────────────────────
  wrench: { lib: "mci", name: "wrench" },
  "link-variant": { lib: "mci", name: "link-variant" },
  wall: { lib: "mci", name: "wall" },
  "saw-blade": { lib: "mci", name: "saw-blade" },
  trowel: { lib: "mci", name: "trowel" },
  "home-outline": { lib: "mci", name: "home-outline" },
  cogs: { lib: "mci", name: "cogs" },
  ladder: { lib: "mci", name: "ladder" },
  arch: { lib: "mci", name: "arch" },
  "briefcase-outline": { lib: "mci", name: "briefcase-outline" },
  "file-document": { lib: "mci", name: "file-document" },
  anvil: { lib: "mci", name: "anvil" },
  pickaxe: { lib: "mci", name: "pickaxe" },
  handshake: { lib: "mci", name: "handshake" },
  "ruler-square": { lib: "mci", name: "ruler-square" },
  cart: { lib: "mci", name: "cart" },
  "wrench-outline": { lib: "mci", name: "wrench-outline" },
  "account-hard-hat": { lib: "mci", name: "account-hard-hat" },
};

function ItemIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const conf = ICON_MAP[name] ?? { lib: "ionicons" as IconLib, name: "gift-outline" };
  if (conf.lib === "mci") return <MaterialCommunityIcons name={conf.name as any} size={size} color={color} />;
  if (conf.lib === "feather") return <Feather name={conf.name as any} size={size} color={color} />;
  return <Ionicons name={conf.name as any} size={size} color={color} />;
}

const FILTER_TABS = [
  { key: "all",     label: "All"        },
  { key: "base",    label: "Base"       },
  { key: "digital", label: "Digital"    },
  { key: "real",    label: "Real World" },
  { key: "owned",   label: "Owned"      },
  { key: "history", label: "History"    },
] as const;
type FilterKey = typeof FILTER_TABS[number]["key"];

// ─── Building picker modal ────────────────────────────────────────────────────
const BUILDING_KEYS: BuildingKey[] = ["townHall", "barracks", "temple", "walls", "windmill"];
const BUILDING_LABEL: Record<BuildingKey, string> = {
  townHall: "Town Hall", barracks: "Barracks", temple: "Temple",
  walls: "Walls", windmill: "Windmill",
};
const BUILDING_ICON: Record<BuildingKey, string> = {
  townHall: "castle", barracks: "sword-cross", temple: "church",
  walls: "shield-half-full", windmill: "wind-turbine",
};
const BUILDING_COLOR: Record<BuildingKey, string> = {
  townHall: COLORS.gold, barracks: COLORS.crimson, temple: COLORS.arcane,
  walls: "#4CAF7D", windmill: COLORS.amber,
};

function BuildingPickerModal({
  visible, item, onPick, onClose,
}: {
  visible: boolean; item: ShopItem | null;
  onPick: (key: BuildingKey) => void; onClose: () => void;
}) {
  const { baseData } = useGame();
  if (!item) return null;
  const buildings = baseData.buildings ?? {};
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={bp.back} onPress={onClose}>
        <Pressable style={bp.card} onPress={e => e.stopPropagation()}>
          <LinearGradient colors={[COLORS.gold + "18", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={bp.header}>
            <MaterialCommunityIcons name="hammer" size={18} color={COLORS.gold} />
            <Text style={bp.title}>Apply to Building</Text>
            <Pressable onPress={onClose} style={bp.close}>
              <Ionicons name="close" size={20} color={COLORS.silverDim} />
            </Pressable>
          </View>
          <Text style={bp.sub}>
            {item.name} · +{item.builderPoints} pts
          </Text>
          <Text style={bp.hint}>Choose which building earns the builder points:</Text>
          {BUILDING_KEYS.map(key => {
            const data = buildings[key];
            const tier = data?.tier ?? 1;
            const pts  = data?.builderPoints ?? 0;
            const accent = BUILDING_COLOR[key];
            return (
              <Pressable key={key} onPress={() => onPick(key)} style={({ pressed }) => [bp.row, { borderColor: accent + "50", opacity: pressed ? 0.75 : 1 }]}>
                <LinearGradient colors={[accent + "18", COLORS.bgMuted]} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
                <View style={[bp.iconBox, { backgroundColor: accent + "28" }]}>
                  <MaterialCommunityIcons name={BUILDING_ICON[key] as any} size={20} color={accent} />
                </View>
                <View style={bp.rowInfo}>
                  <Text style={[bp.buildingName, { color: accent }]}>{BUILDING_LABEL[key]}</Text>
                  <Text style={bp.buildingPts}>{pts.toLocaleString()} pts · Tier {tier}</Text>
                </View>
                <View style={[bp.addBadge, { backgroundColor: accent + "30", borderColor: accent }]}>
                  <Text style={[bp.addText, { color: accent }]}>+{item.builderPoints}</Text>
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const bp = StyleSheet.create({
  back: { flex: 1, backgroundColor: "#00000092", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gold + "40", backgroundColor: COLORS.bgCard, padding: 18, gap: 10, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title:  { fontFamily: "Cinzel_700Bold", fontSize: 15, color: COLORS.gold, flex: 1 },
  close:  { padding: 4 },
  sub:    { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.silver },
  hint:   { fontFamily: "Inter_400Regular",   fontSize: 11, color: COLORS.silverDim },
  row:    { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 11, overflow: "hidden" },
  iconBox: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowInfo: { flex: 1, gap: 3 },
  buildingName: { fontFamily: "Cinzel_600SemiBold", fontSize: 13 },
  buildingPts:  { fontFamily: "Inter_400Regular",   fontSize: 11, color: COLORS.silverDim },
  addBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  addText:  { fontFamily: "Cinzel_700Bold", fontSize: 12 },
});

// ─── Shop card ────────────────────────────────────────────────────────────────
function ShopCard({ item, discount }: { item: ShopItem; discount: number }) {
  const { hero, purchaseItem, useItem } = useGame();
  const [showPicker, setShowPicker] = useState(false);

  const discountedCost = Math.round(item.cost * (1 - discount));
  const canAfford = hero.gold >= discountedCost;
  const hasUses   = item.usesLeft > 0;
  const isBase    = item.section === "base";
  const accentColor = isBase ? COLORS.gold : item.type === "digital" ? COLORS.arcane : COLORS.amber;

  const handleBuy = () => {
    if (!canAfford) {
      Alert.alert("Not Enough Gold", `You need ${discountedCost - hero.gold} more gold.`);
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(`Purchase ${item.name}?`, `Spend ${discountedCost} gold.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Buy", onPress: () => purchaseItem(item.id) },
    ]);
  };

  const handleUse = () => {
    if (!hasUses) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isBase && item.builderPoints) {
      setShowPicker(true);
    } else {
      Alert.alert(`Use ${item.name}?`, item.description, [
        { text: "Cancel", style: "cancel" },
        { text: "Use", onPress: () => useItem(item.id) },
      ]);
    }
  };

  const handlePick = (key: BuildingKey) => {
    setShowPicker(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useItem(item.id, key);
  };

  return (
    <>
      <View style={cs.card}>
        <LinearGradient colors={[accentColor + "12", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={[cs.border, { borderColor: accentColor + "35" }]} />

        <View style={cs.top}>
          <View style={[cs.iconBg, { backgroundColor: accentColor + "22" }]}>
            <ItemIcon name={item.icon} size={22} color={accentColor} />
          </View>
          <View style={cs.meta}>
            <Text style={cs.name} numberOfLines={1}>{item.name}</Text>
            <Text style={cs.desc} numberOfLines={2}>{item.description}</Text>
            {isBase && item.builderPoints && (
              <View style={cs.builderBadge}>
                <MaterialCommunityIcons name="hammer" size={9} color={COLORS.gold} />
                <Text style={cs.builderText}>+{item.builderPoints} pts · choose building</Text>
              </View>
            )}
          </View>
        </View>

        <View style={cs.bottom}>
          <View style={cs.costRow}>
            <MaterialCommunityIcons name="gold" size={12} color={COLORS.gold} />
            <Text style={cs.cost}>{discountedCost}</Text>
            {discount > 0 && <Text style={cs.orig}>{item.cost}</Text>}
            {hasUses && (
              <View style={cs.usesBadge}>
                <Text style={cs.usesText}>{item.usesLeft} left</Text>
              </View>
            )}
          </View>

          {hasUses ? (
            <Pressable onPress={handleUse} style={({ pressed }) => [cs.btn, { backgroundColor: accentColor + "22", borderColor: accentColor }, pressed && { opacity: 0.7 }]}>
              <Text style={[cs.btnText, { color: accentColor }]}>Use</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleBuy} style={({ pressed }) => [
              cs.btn,
              canAfford ? { backgroundColor: COLORS.gold + "22", borderColor: COLORS.gold } : { backgroundColor: COLORS.bgMuted, borderColor: COLORS.border },
              pressed && { opacity: 0.7 },
            ]}>
              <Text style={[cs.btnText, canAfford ? { color: COLORS.gold } : { color: COLORS.silverFaint }]}>
                {canAfford ? "Buy" : "Need Gold"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <BuildingPickerModal
        visible={showPicker}
        item={item}
        onPick={handlePick}
        onClose={() => setShowPicker(false)}
      />
    </>
  );
}

const cs = StyleSheet.create({
  card: { borderRadius: 14, padding: 12, gap: 10, overflow: "hidden", position: "relative" },
  border: { ...StyleSheet.absoluteFillObject, borderRadius: 14, borderWidth: 1 },
  top: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconBg: { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  meta: { flex: 1, gap: 3 },
  name: { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.silver },
  desc: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim, lineHeight: 16 },
  builderBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: COLORS.gold + "18", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.gold + "40" },
  builderText: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: COLORS.gold },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  costRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cost: { fontFamily: "Cinzel_700Bold", fontSize: 15, color: COLORS.gold },
  orig: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverFaint, textDecorationLine: "line-through" },
  usesBadge: { backgroundColor: COLORS.gold + "25", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  usesText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.gold },
  btn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});

// ─── Purchase row ─────────────────────────────────────────────────────────────
function PurchaseRow({ purchase }: { purchase: Purchase }) {
  const d = new Date(purchase.timestamp);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return (
    <View style={pr.row}>
      <View style={pr.dot} />
      <View style={pr.info}>
        <Text style={pr.name}>{purchase.itemName}</Text>
        <Text style={pr.date}>{dateStr}</Text>
      </View>
      <View style={pr.costRow}>
        <MaterialCommunityIcons name="gold" size={11} color={COLORS.gold} />
        <Text style={pr.cost}>{purchase.cost}</Text>
      </View>
    </View>
  );
}
const pr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.silver },
  date: { fontFamily: "Inter_400Regular",  fontSize: 10, color: COLORS.silverFaint },
  costRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  cost: { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.gold },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { hero, shopItems, purchases, artificerDiscount } = useGame();
  const [filter, setFilter] = useState<FilterKey>("all");

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseItems    = shopItems.filter(s => s.section === "base");
  const digitalItems = shopItems.filter(s => s.type === "digital" && s.section !== "base");
  const realItems    = shopItems.filter(s => s.type === "real");

  const filtered = shopItems.filter(item => {
    if (filter === "base")    return item.section === "base";
    if (filter === "digital") return item.type === "digital" && item.section !== "base";
    if (filter === "real")    return item.type === "real";
    if (filter === "owned")   return item.usesLeft > 0;
    return true;
  });

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#1A1000", COLORS.bg]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.4 }} />

      <View style={styles.header}>
        <Text style={styles.screenTitle}>The Item Shop</Text>
        <View style={styles.goldBadge}>
          <MaterialCommunityIcons name="gold" size={15} color={COLORS.gold} />
          <Text style={styles.goldValue}>{hero.gold}</Text>
        </View>
      </View>

      {artificerDiscount > 0 && (
        <View style={styles.discountBanner}>
          <MaterialCommunityIcons name="cog" size={14} color={COLORS.arcane} />
          <Text style={styles.discountText}>Artificer's Optimization: 5% discount on all purchases</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTER_TABS.map(tab => (
          <Pressable key={tab.key} onPress={() => setFilter(tab.key)} style={[styles.chip, filter === tab.key && styles.chipActive]}>
            <Text style={[styles.chipText, filter === tab.key && styles.chipTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {filter === "history" && (
        purchases.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt" size={40} color={COLORS.silverFaint} />
            <Text style={styles.emptyText}>No purchases yet.</Text>
          </View>
        ) : (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Purchase History</Text>
            {purchases.slice(0, 30).map(p => <PurchaseRow key={p.id} purchase={p} />)}
          </View>
        )
      )}

      {filter === "all" && (
        <>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="castle" size={14} color={COLORS.gold} />
            <Text style={styles.sectionLabel}>Base Building</Text>
            <Text style={styles.sectionCount}>{baseItems.length} items</Text>
          </View>
          <View style={styles.grid}>
            {baseItems.map(item => <ShopCard key={item.id} item={item} discount={artificerDiscount} />)}
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="diamond" size={14} color={COLORS.arcane} />
            <Text style={[styles.sectionLabel, { color: COLORS.arcane }]}>Digital Rewards</Text>
          </View>
          <View style={styles.grid}>
            {digitalItems.map(item => <ShopCard key={item.id} item={item} discount={artificerDiscount} />)}
          </View>

          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={14} color={COLORS.amber} />
            <Text style={[styles.sectionLabel, { color: COLORS.amber }]}>Real-World Loot</Text>
          </View>
          <View style={styles.grid}>
            {realItems.map(item => <ShopCard key={item.id} item={item} discount={artificerDiscount} />)}
          </View>
        </>
      )}

      {(filter === "base" || filter === "digital" || filter === "real" || filter === "owned") && (
        filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bag-personal-off" size={40} color={COLORS.silverFaint} />
            <Text style={styles.emptyText}>
              {filter === "owned" ? "No items owned — complete quests to earn gold!" : "Nothing here."}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map(item => <ShopCard key={item.id} item={item} discount={artificerDiscount} />)}
          </View>
        )
      )}

      <View style={styles.tipsBox}>
        <Ionicons name="information-circle" size={14} color={COLORS.arcane} />
        <Text style={styles.tipsText}>
          Complete quests to earn gold. Buy Base Building items and use them — you choose which building earns the builder points each time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenTitle: { fontFamily: "Cinzel_700Bold", fontSize: 22, color: COLORS.gold },
  goldBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.goldDim },
  goldValue: { fontFamily: "Cinzel_700Bold", fontSize: 19, color: COLORS.gold },

  discountBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.arcane + "18", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.arcane + "40" },
  discountText: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.arcane, flex: 1 },

  filterScroll: { flexGrow: 0 },
  filterContent: { gap: 8, flexDirection: "row" },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.gold },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.silverDim },
  chipTextActive: { color: COLORS.goldLight },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: -4 },
  sectionLabel: { fontFamily: "Cinzel_600SemiBold", fontSize: 12, color: COLORS.gold, textTransform: "uppercase", letterSpacing: 1, flex: 1 },
  sectionCount: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverFaint },

  grid: { gap: 10 },

  historyCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  historyTitle: { fontFamily: "Cinzel_600SemiBold", fontSize: 14, color: COLORS.gold, marginBottom: 8 },

  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.silverFaint, textAlign: "center", maxWidth: 260, lineHeight: 20 },

  tipsBox: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: COLORS.arcane + "35" },
  tipsText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim, flex: 1, lineHeight: 17 },
});
