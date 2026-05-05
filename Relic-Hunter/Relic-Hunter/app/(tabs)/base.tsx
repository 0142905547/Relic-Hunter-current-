import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  Animated, Modal, Platform, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  useGame, BuildingKey, BuildingData, TIER_THRESHOLDS, addBuilderPointsToBase,
} from "@/context/GameContext";
import COLORS from "@/constants/colors";

// ─── Sprite sheet: 551×1016 (7 building rows, transparent bg) ───────────────
const SHEET_W = 551;
const SHEET_H = 1016;
const SHEET_SOURCE = require("../../assets/buildings_sheet_v2.png");

interface TierRegion { rx: number; ry: number; tw: number; th: number; }

// Approximate crop regions per tier. Each building occupies one row of the sheet.
// Row heights: TownHall=150, Barracks=140, Workshop(skip)=140,
//              WallsA=105(3 tiles), WallsB=160(2 tiles), Temple=155, Windmill=166
const TIER_REGIONS: Record<BuildingKey, TierRegion[]> = {
  townHall: [
    { rx: 0,   ry: 0,   tw: 110, th: 150 },
    { rx: 110, ry: 0,   tw: 110, th: 150 },
    { rx: 220, ry: 0,   tw: 110, th: 150 },
    { rx: 330, ry: 0,   tw: 110, th: 150 },
    { rx: 440, ry: 0,   tw: 111, th: 150 },
  ],
  barracks: [
    { rx: 0,   ry: 150, tw: 110, th: 140 },
    { rx: 110, ry: 150, tw: 110, th: 140 },
    { rx: 220, ry: 150, tw: 110, th: 140 },
    { rx: 330, ry: 150, tw: 110, th: 140 },
    { rx: 440, ry: 150, tw: 111, th: 140 },
  ],
  walls: [
    { rx: 0,   ry: 430, tw: 184, th: 105 },
    { rx: 184, ry: 430, tw: 184, th: 105 },
    { rx: 368, ry: 430, tw: 183, th: 105 },
    { rx: 0,   ry: 535, tw: 276, th: 160 },
    { rx: 276, ry: 535, tw: 275, th: 160 },
  ],
  temple: [
    { rx: 0,   ry: 695, tw: 110, th: 155 },
    { rx: 110, ry: 695, tw: 110, th: 155 },
    { rx: 220, ry: 695, tw: 110, th: 155 },
    { rx: 330, ry: 695, tw: 110, th: 155 },
    { rx: 440, ry: 695, tw: 111, th: 155 },
  ],
  windmill: [
    { rx: 0,   ry: 850, tw: 110, th: 166 },
    { rx: 110, ry: 850, tw: 110, th: 166 },
    { rx: 220, ry: 850, tw: 110, th: 166 },
    { rx: 330, ry: 850, tw: 110, th: 166 },
    { rx: 440, ry: 850, tw: 111, th: 166 },
  ],
};

// ─── TierImage: contain-fit crop from composite sheet ────────────────────────
function TierImage({
  building, tier, containerW, containerH,
}: {
  building: BuildingKey; tier: number; containerW: number; containerH: number;
}) {
  const regions = TIER_REGIONS[building];
  const r = regions[Math.min(Math.max(tier - 1, 0), regions.length - 1)];
  const scaleX = containerW / r.tw;
  const scaleY = containerH / r.th;
  const scale  = Math.min(scaleX, scaleY);           // contain — no stretch
  const imgW   = SHEET_W * scale;
  const imgH   = SHEET_H * scale;
  const left   = -(r.rx * scale) + (containerW - r.tw * scale) / 2;
  const top    = -(r.ry * scale) + (containerH - r.th * scale) / 2;
  return (
    <View style={{ width: containerW, height: containerH, overflow: "hidden" }}>
      <Image
        source={SHEET_SOURCE}
        style={{ width: imgW, height: imgH, position: "absolute", left, top }}
        resizeMode="stretch"
      />
    </View>
  );
}

// ─── Building config ─────────────────────────────────────────────────────────
const BUILDING_NAME: Record<BuildingKey, string> = {
  townHall: "Town Hall", barracks: "Barracks", temple: "Temple",
  walls: "Walls", windmill: "Windmill",
};
const BUILDING_STAT: Record<BuildingKey, string> = {
  townHall: "Overall", barracks: "Strength", temple: "Wisdom",
  walls: "Defence", windmill: "Agility",
};
const BUILDING_COLOR: Record<BuildingKey, string> = {
  townHall: COLORS.gold, barracks: COLORS.crimson, temple: COLORS.arcane,
  walls: "#4CAF7D", windmill: COLORS.amber,
};
const BUILDING_ICON: Record<BuildingKey, string> = {
  townHall: "castle", barracks: "sword-cross", temple: "church",
  walls: "shield-half-full", windmill: "wind-turbine",
};

const TIER_LABELS  = ["I", "II", "III", "IV", "V"];
const BUILDING_ORDER: BuildingKey[] = ["townHall", "barracks", "temple", "walls", "windmill"];

// Map canvas positions (canvas 370×440)
const MAP_POS: Record<BuildingKey, { x: number; y: number; cw: number; ch: number }> = {
  townHall: { x: 154, y: 14,  cw: 62,  ch: 90  },
  barracks: { x: 20,  y: 135, cw: 62,  ch: 82  },
  windmill: { x: 288, y: 135, cw: 62,  ch: 82  },
  temple:   { x: 20,  y: 262, cw: 62,  ch: 82  },
  walls:    { x: 85,  y: 358, cw: 200, ch: 72  },
};
const MAP_FOG_ORDER: BuildingKey[] = ["barracks", "windmill", "temple", "walls"];

const DEFAULT_BUILDINGS: Record<BuildingKey, BuildingData> = {
  townHall: { tier: 1, builderPoints: 0 }, barracks: { tier: 1, builderPoints: 0 },
  temple:   { tier: 1, builderPoints: 0 }, walls:    { tier: 1, builderPoints: 0 },
  windmill: { tier: 1, builderPoints: 0 },
};

// ─── Star field ──────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 26 }, (_, i) => ({
  id: i, left: (i * 59 + (i % 7) * 31) % 370, top: (i * 43 + (i % 5) * 29) % 200,
  size: i % 3 === 0 ? 2 : 1.4,
}));
function StarField() {
  const anims = useRef(STARS.map(() => new Animated.Value(Math.random()))).current;
  useEffect(() => {
    const loops = anims.map((a, i) => Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1,   duration: 1600 + i * 180, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.2, duration: 1600 + i * 180, useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map((s, i) => (
        <Animated.View key={s.id} style={{
          position: "absolute", left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: s.size,
          backgroundColor: "#fff", opacity: anims[i],
        }} />
      ))}
    </View>
  );
}

// ─── Campfire ────────────────────────────────────────────────────────────────
function Campfire({ x, y }: { x: number; y: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 370, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.86, duration: 370, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ position: "absolute", left: x - 12, top: y - 12, transform: [{ scale }] }}>
      <MaterialCommunityIcons name="campfire" size={22} color="#FF8C00" />
    </Animated.View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ isResting }: { isResting: boolean }) {
  const posX = useRef(new Animated.Value(172)).current;
  const posY = useRef(new Animated.Value(238)).current;
  const bobY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isResting) return;
    const walk = () => Animated.sequence([
      Animated.parallel([
        Animated.timing(posX, { toValue: 148 + Math.random() * 60, duration: 2800, useNativeDriver: true }),
        Animated.timing(posY, { toValue: 220 + Math.random() * 35, duration: 2800, useNativeDriver: true }),
      ]),
      Animated.delay(1300),
    ]).start(walk);
    walk();
    Animated.loop(Animated.sequence([
      Animated.timing(bobY, { toValue: -4, duration: 340, useNativeDriver: true }),
      Animated.timing(bobY, { toValue: 0,  duration: 340, useNativeDriver: true }),
    ])).start();
  }, [isResting]);
  if (isResting) {
    return (
      <View style={{ position: "absolute", left: 160, top: 232 }}>
        <MaterialCommunityIcons name="sleep" size={18} color={COLORS.silver} />
      </View>
    );
  }
  return (
    <Animated.View style={{ position: "absolute", transform: [{ translateX: posX }, { translateY: posY }, { translateY: bobY }] }}>
      <MaterialCommunityIcons name="account-circle" size={20} color={COLORS.gold} />
    </Animated.View>
  );
}

// ─── Resource bubble ─────────────────────────────────────────────────────────
function ResourceBubble({ gold, xp, containerW, onCollect }: { gold: number; xp: number; containerW: number; onCollect: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 700, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.94, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Pressable onPress={onCollect} style={{ position: "absolute", bottom: "100%", left: 0, width: containerW, alignItems: "center" }}>
      <Animated.View style={[rb.bubble, { transform: [{ scale }] }]}>
        <Text style={rb.gold}>+{gold}g</Text>
        <Text style={rb.xp}>+{xp}xp</Text>
      </Animated.View>
    </Pressable>
  );
}
const rb = StyleSheet.create({
  bubble: { backgroundColor: COLORS.gold, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, alignItems: "center" },
  gold:   { fontFamily: "Cinzel_700Bold",   fontSize: 9, color: COLORS.bg },
  xp:     { fontFamily: "Inter_400Regular", fontSize: 8, color: COLORS.bg },
});

// ─── Loot cart ───────────────────────────────────────────────────────────────
function LootCart({ gold, xp, onCollect }: { gold: number; xp: number; onCollect: () => void }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Pressable onPress={onCollect} style={lc.card}>
      <LinearGradient colors={["#2A1A00", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
      <Animated.View style={[lc.glow, { opacity: glow }]} />
      <MaterialCommunityIcons name="treasure-chest" size={26} color={COLORS.gold} />
      <View style={lc.info}>
        <Text style={lc.title}>Daily Loot Cart</Text>
        <Text style={lc.sub}>+{gold} gold · +{xp} XP</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.gold} />
    </Pressable>
  );
}
const lc = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.gold + "50", overflow: "hidden" },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 14, borderWidth: 2, borderColor: COLORS.gold + "55" },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: "Cinzel_700Bold",   fontSize: 14, color: COLORS.gold },
  sub:   { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim },
});

// ─── Map building tile ────────────────────────────────────────────────────────
function MapBuildingTile({
  buildingKey, tier, isRevealed, isBroken, bubble, onPress, onCollectBubble,
}: {
  buildingKey: BuildingKey; tier: number; isRevealed: boolean; isBroken: boolean;
  bubble: { gold: number; xp: number } | undefined;
  onPress: () => void; onCollectBubble: () => void;
}) {
  const pos    = MAP_POS[buildingKey];
  const accent = BUILDING_COLOR[buildingKey];
  if (!isRevealed) {
    return (
      <View style={[mt.wrap, { left: pos.x, top: pos.y, width: pos.cw }]}>
        <View style={[mt.fogTile, { width: pos.cw, height: pos.ch }]}>
          <MaterialCommunityIcons name="weather-fog" size={22} color={COLORS.silverFaint} />
          <Text style={mt.fogLabel}>???</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[mt.wrap, { left: pos.x, top: pos.y, width: pos.cw }]}>
      {bubble && (
        <ResourceBubble
          gold={bubble.gold} xp={bubble.xp} containerW={pos.cw}
          onCollect={onCollectBubble}
        />
      )}
      <Pressable onPress={onPress} style={({ pressed }) => [mt.tile, {
        width: pos.cw, height: pos.ch,
        borderColor: isBroken ? COLORS.crimson : accent + "70",
        opacity: pressed ? 0.8 : 1,
      }]}>
        <LinearGradient colors={[accent + "28", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
        {isBroken && (
          <View style={mt.brokenBadge}>
            <Ionicons name="warning" size={8} color={COLORS.crimson} />
          </View>
        )}
        <TierImage building={buildingKey} tier={tier} containerW={pos.cw - 6} containerH={pos.ch - 20} />
        <Text style={[mt.tileName, { color: accent }]} numberOfLines={1}>
          {BUILDING_NAME[buildingKey]}
        </Text>
        <View style={[mt.tierPip, { backgroundColor: accent }]}>
          <Text style={mt.tierPipText}>{TIER_LABELS[tier - 1]}</Text>
        </View>
      </Pressable>
    </View>
  );
}
const mt = StyleSheet.create({
  wrap: { position: "absolute", alignItems: "center" },
  fogTile: { borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0A1400", borderWidth: 1, borderColor: COLORS.border, gap: 3 },
  fogLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: COLORS.silverFaint },
  tile: { borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", paddingBottom: 2 },
  tileName: { fontFamily: "Inter_600SemiBold", fontSize: 7, textAlign: "center", marginTop: 2 },
  tierPip: { position: "absolute", top: 3, right: 3, width: 13, height: 13, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  tierPipText: { fontFamily: "Cinzel_700Bold", fontSize: 7, color: COLORS.bg },
  brokenBadge: { position: "absolute", top: 3, left: 3, backgroundColor: COLORS.crimson + "30", borderRadius: 5, padding: 2 },
});

// ─── Building info modal ──────────────────────────────────────────────────────
function BuildingInfoModal({
  buildingKey, data, visible, onClose,
}: {
  buildingKey: BuildingKey | null; data: BuildingData | null; visible: boolean; onClose: () => void;
}) {
  if (!buildingKey || !data) return null;
  const accent = BUILDING_COLOR[buildingKey];
  const tier = data.tier;
  const points = data.builderPoints;
  const nextThreshold = tier < 5 ? TIER_THRESHOLDS[tier] : null;
  const currentThreshold = TIER_THRESHOLDS[tier - 1] ?? 0;
  const pct = nextThreshold
    ? Math.min(100, Math.round(((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
    : 100;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={im.back} onPress={onClose}>
        <Pressable style={[im.card, { borderColor: accent + "50" }]} onPress={e => e.stopPropagation()}>
          <LinearGradient colors={[accent + "20", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={im.header}>
            <View style={[im.imgBox, { borderColor: accent + "40" }]}>
              <TierImage building={buildingKey} tier={tier} containerW={56} containerH={68} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[im.title, { color: accent }]}>{BUILDING_NAME[buildingKey]}</Text>
              <Text style={im.stat}>{BUILDING_STAT[buildingKey]} · Tier {TIER_LABELS[tier - 1]}</Text>
              <Text style={im.pts}>{points.toLocaleString()} builder pts</Text>
            </View>
            <Pressable onPress={onClose} style={im.close}>
              <Ionicons name="close" size={22} color={COLORS.silverDim} />
            </Pressable>
          </View>
          <View style={im.bar}>
            <View style={[im.fill, { width: `${pct}%` as any, backgroundColor: accent }]} />
          </View>
          <Text style={im.hint}>
            {nextThreshold
              ? `${(nextThreshold - points).toLocaleString()} pts to Tier ${TIER_LABELS[tier]}`
              : "Maximum tier reached!"}
          </Text>
          <Text style={im.desc}>
            Purchase Base Building items from the Shop, then use them on this building to earn builder points and level it up.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const im = StyleSheet.create({
  back: { flex: 1, backgroundColor: "#00000092", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1, backgroundColor: COLORS.bgCard, padding: 20, gap: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  imgBox: { width: 64, height: 76, borderRadius: 12, overflow: "hidden", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Cinzel_700Bold", fontSize: 16 },
  stat:  { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim },
  pts:   { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.silver },
  close: { padding: 4 },
  bar:   { height: 8, backgroundColor: COLORS.bgMuted, borderRadius: 4, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 4 },
  hint:  { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim },
  desc:  { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverFaint, lineHeight: 17 },
});

// ─── Building tier card ───────────────────────────────────────────────────────
function BuildingCard({ buildingKey, data, onPress }: { buildingKey: BuildingKey; data: BuildingData; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const tier   = data.tier;
  const points = data.builderPoints;
  const accent = BUILDING_COLOR[buildingKey];
  const currentThreshold = TIER_THRESHOLDS[tier - 1] ?? 0;
  const nextThreshold    = tier < 5 ? TIER_THRESHOLDS[tier] : null;
  const pct = nextThreshold
    ? Math.round(Math.min(1, (points - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;
  const imgW = Math.round((width - 40) * 0.38);
  const imgH = 80;
  return (
    <Pressable onPress={onPress} style={[bcd.card, { borderColor: accent + "45" }]}>
      <LinearGradient colors={[accent + "16", COLORS.bgCard]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={bcd.row}>
        <View style={bcd.info}>
          <View style={bcd.nameRow}>
            <MaterialCommunityIcons name={BUILDING_ICON[buildingKey] as any} size={13} color={accent} />
            <Text style={[bcd.name, { color: accent }]}>{BUILDING_NAME[buildingKey]}</Text>
          </View>
          <Text style={bcd.stat}>{BUILDING_STAT[buildingKey]}</Text>
          <View style={[bcd.badge, { backgroundColor: accent + "28", borderColor: accent + "60" }]}>
            <Text style={[bcd.badgeText, { color: accent }]}>Tier {TIER_LABELS[tier - 1]}</Text>
          </View>
          <Text style={bcd.pts}>{points.toLocaleString()} pts</Text>
          {nextThreshold ? (
            <Text style={bcd.next}>{(nextThreshold - points).toLocaleString()} to Tier {TIER_LABELS[tier]}</Text>
          ) : (
            <View style={[bcd.maxBadge, { borderColor: accent + "80" }]}>
              <Ionicons name="star" size={9} color={accent} />
              <Text style={[bcd.maxText, { color: accent }]}>Max Tier</Text>
            </View>
          )}
        </View>
        <TierImage building={buildingKey} tier={tier} containerW={imgW} containerH={imgH} />
      </View>
      <View style={bcd.track}>
        <View style={[bcd.fill, { width: `${pct}%` as any, backgroundColor: accent }]} />
        {pct > 14 && <Text style={bcd.pct}>{pct}%</Text>}
      </View>
      {nextThreshold && (
        <View style={bcd.labels}>
          <Text style={bcd.lbl}>{currentThreshold.toLocaleString()}</Text>
          <Text style={bcd.lbl}>{nextThreshold.toLocaleString()}</Text>
        </View>
      )}
    </Pressable>
  );
}
const bcd = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 10, overflow: "hidden", position: "relative", borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontFamily: "Cinzel_700Bold", fontSize: 15 },
  stat: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim },
  badge: { alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  badgeText: { fontFamily: "Cinzel_700Bold", fontSize: 12 },
  pts: { fontFamily: "Cinzel_600SemiBold", fontSize: 14, color: COLORS.silver },
  next: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverDim },
  maxBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  maxText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  track: { height: 10, backgroundColor: COLORS.bgMuted, borderRadius: 5, overflow: "hidden", justifyContent: "center", alignItems: "center", position: "relative" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 5 },
  pct: { fontFamily: "Inter_700Bold", fontSize: 7, color: COLORS.bg, zIndex: 1 },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  lbl: { fontFamily: "Inter_400Regular", fontSize: 9, color: COLORS.silverFaint },
});

// ─── Tier legend ─────────────────────────────────────────────────────────────
function TierLegend() {
  return (
    <View style={tl.box}>
      <Text style={tl.title}>Tier Thresholds</Text>
      <View style={tl.row}>
        {TIER_THRESHOLDS.map((pts, i) => (
          <View key={i} style={tl.item}>
            <Text style={tl.tier}>T{TIER_LABELS[i]}</Text>
            <Text style={tl.pts}>{i === 0 ? "Start" : pts >= 1000 ? `${pts / 1000}k` : String(pts)}</Text>
          </View>
        ))}
      </View>
      <Text style={tl.hint}>Buy Base Building items from the Shop and use them — you choose which building earns the builder points.</Text>
    </View>
  );
}
const tl = StyleSheet.create({
  box:  { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  title: { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.gold },
  row:  { flexDirection: "row", gap: 4 },
  item: { flex: 1, alignItems: "center", backgroundColor: COLORS.bgMuted, borderRadius: 8, paddingVertical: 7, gap: 2 },
  tier: { fontFamily: "Cinzel_600SemiBold", fontSize: 11, color: COLORS.silver },
  pts:  { fontFamily: "Inter_500Medium",    fontSize: 9,  color: COLORS.gold },
  hint: { fontFamily: "Inter_400Regular",   fontSize: 11, color: COLORS.silverDim, lineHeight: 17 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function BaseScreen() {
  const insets = useSafeAreaInsets();
  const { baseData, hero, collectBubble, collectLootCart, clearFog } = useGame();
  const [modalBuilding, setModalBuilding] = useState<BuildingKey | null>(null);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const buildings   = { ...DEFAULT_BUILDINGS, ...(baseData.buildings ?? {}) };
  const totalPts    = BUILDING_ORDER.reduce((s, k) => s + (buildings[k]?.builderPoints ?? 0), 0);
  const raidShields = baseData.raidShields ?? 0;
  const canClearFog = (baseData.lanternCharges ?? 0) >= 3 && (baseData.clearedArea ?? 0) < 4;
  const isResting   = hero.hp <= 0;

  const raids = baseData.shadowRaids ?? [];
  const lastRaid = raids[0];
  const recentRaid = lastRaid && !lastRaid.deflected && Date.now() - ((lastRaid as any).ts ?? 0) < 24 * 3600 * 1000;

  return (
    <ScrollView
      style={[sc.container, { paddingTop: topPad }]}
      contentContainerStyle={[sc.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#030B03", COLORS.bg]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.35 }} />

      {/* Header */}
      <View style={sc.header}>
        <View>
          <Text style={sc.title}>The Base</Text>
          <Text style={sc.subtitle}>{totalPts.toLocaleString()} builder pts</Text>
        </View>
        <View style={sc.chips}>
          <View style={sc.chip}>
            <MaterialCommunityIcons name="lamp" size={13} color="#FFD580" />
            <Text style={sc.chipTxt}>{baseData.lanternCharges ?? 0} charges</Text>
          </View>
          <View style={sc.chip}>
            <MaterialCommunityIcons name="hammer" size={13} color={COLORS.gold} />
            <Text style={[sc.chipTxt, { color: COLORS.gold }]}>{baseData.builderHuts ?? 2} builders</Text>
          </View>
          {raidShields > 0 && (
            <View style={[sc.chip, { borderColor: "#4CAF7D50" }]}>
              <MaterialCommunityIcons name="shield-check" size={13} color="#4CAF7D" />
              <Text style={[sc.chipTxt, { color: "#4CAF7D" }]}>{raidShields}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Raid warnings */}
      {recentRaid && (
        <View style={sc.raidBanner}>
          <MaterialCommunityIcons name="ghost" size={15} color={COLORS.crimson} />
          <Text style={sc.raidText}>Shadow Raid! Shadows stole {lastRaid.goldLost} gold.</Text>
        </View>
      )}
      {lastRaid?.deflected && (
        <View style={[sc.raidBanner, { borderColor: "#4CAF7D50" }]}>
          <MaterialCommunityIcons name="shield-check" size={15} color="#4CAF7D" />
          <Text style={[sc.raidText, { color: "#4CAF7D" }]}>Shadow Raid deflected! Your Walls held strong.</Text>
        </View>
      )}

      {/* Loot cart */}
      {baseData.lootCart && (
        <LootCart
          gold={baseData.lootCart.gold}
          xp={baseData.lootCart.xp}
          onCollect={() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            collectLootCart();
          }}
        />
      )}

      {/* ── Village Map ── */}
      <View style={sc.map}>
        <LinearGradient colors={["#0C1F12", "#0A1A0F", "#0C2010"]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
        <StarField />

        {/* Paths */}
        {/* TH to Barracks */}
        <View style={[sc.path, { left: 82,  top: 104, width: 73, height: 1, transform: [{ rotate: "20deg" }] }]} />
        {/* TH to Windmill */}
        <View style={[sc.path, { left: 215, top: 104, width: 73, height: 1, transform: [{ rotate: "-20deg" }] }]} />
        {/* Barracks to Temple */}
        <View style={[sc.path, { left: 50,  top: 217, width: 1,  height: 45 }]} />
        {/* Center to Walls (vertical) */}
        <View style={[sc.path, { left: 185, top: 217, width: 1,  height: 140 }]} />
        {/* Temple to Walls */}
        <View style={[sc.path, { left: 82,  top: 344, width: 103, height: 1, transform: [{ rotate: "8deg" }] }]} />
        {/* Windmill to Walls */}
        <View style={[sc.path, { left: 285, top: 344, width: 100, height: 1, transform: [{ rotate: "-8deg" }] }]} />

        {/* Town Hall (always visible) */}
        <MapBuildingTile
          buildingKey="townHall" tier={buildings.townHall.tier}
          isRevealed isBroken={false} bubble={undefined}
          onPress={() => setModalBuilding("townHall")} onCollectBubble={() => {}}
        />

        {/* Campfire in clearing */}
        <Campfire x={190} y={230} />

        {/* Avatar */}
        <Avatar isResting={isResting} />

        <View style={sc.statusWrap}>
          <Text style={sc.statusTxt}>{isResting ? "Resting" : "Patrolling"}</Text>
        </View>

        {/* 4 fog-revealed buildings */}
        {MAP_FOG_ORDER.map((key, i) => {
          const isRevealed = (baseData.clearedArea ?? 0) >= i + 1;
          const isBroken   = (baseData.brokenBuildings ?? []).includes(key as any);
          const bubble     = baseData.pendingBubbles?.[key as any];
          return (
            <MapBuildingTile
              key={key}
              buildingKey={key}
              tier={buildings[key].tier}
              isRevealed={isRevealed}
              isBroken={isBroken}
              bubble={bubble}
              onPress={() => setModalBuilding(key)}
              onCollectBubble={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                collectBubble(key as any);
              }}
            />
          );
        })}
      </View>

      {/* Fog of war controls */}
      <View style={sc.fogSection}>
        <View style={sc.fogRow}>
          <MaterialCommunityIcons name="weather-fog" size={14} color={COLORS.silverDim} />
          <Text style={sc.fogInfo}>
            {(baseData.clearedArea ?? 0) < 4
              ? `${4 - (baseData.clearedArea ?? 0)} area${4 - (baseData.clearedArea ?? 0) !== 1 ? "s" : ""} still shrouded`
              : "All lands revealed — your kingdom stands complete"}
          </Text>
        </View>
        {canClearFog && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              clearFog();
            }}
            style={({ pressed }) => [sc.clearFogBtn, pressed && { opacity: 0.7 }]}
          >
            <LinearGradient colors={["#7B4FD6", "#4A2A8F"]} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
            <MaterialCommunityIcons name="lamp" size={14} color="#FFD580" />
            <Text style={sc.clearFogTxt}>Spend 3 Charges — Reveal Next Area</Text>
          </Pressable>
        )}
      </View>

      {/* Building tier cards */}
      <Text style={sc.sectionTitle}>Building Progression</Text>
      {BUILDING_ORDER.map(key => (
        <BuildingCard key={key} buildingKey={key} data={buildings[key] ?? { tier: 1, builderPoints: 0 }} onPress={() => setModalBuilding(key)} />
      ))}

      <TierLegend />

      <BuildingInfoModal
        buildingKey={modalBuilding}
        data={modalBuilding ? (buildings[modalBuilding] ?? null) : null}
        visible={modalBuilding !== null}
        onClose={() => setModalBuilding(null)}
      />
    </ScrollView>
  );
}

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { paddingHorizontal: 20, paddingTop: 8, gap: 14 },

  header:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  title:    { fontFamily: "Cinzel_700Bold",   fontSize: 22, color: COLORS.gold },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.silverDim, marginTop: 2 },
  chips:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.bgCard, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border },
  chipTxt:  { fontFamily: "Inter_500Medium", fontSize: 11, color: COLORS.silverDim },

  raidBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 10, backgroundColor: COLORS.crimson + "18", borderWidth: 1, borderColor: COLORS.crimson + "40" },
  raidText:   { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.silverDim, flex: 1 },

  map: { height: 450, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#1A3020", position: "relative" },
  path: { position: "absolute", backgroundColor: "#2A4030" },

  statusWrap: { position: "absolute", left: 155, top: 252, alignItems: "center" },
  statusTxt:  { fontFamily: "Inter_400Regular", fontSize: 8, color: COLORS.silverFaint },

  fogSection: { gap: 8 },
  fogRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  fogInfo:    { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.silverDim, flex: 1 },
  clearFogBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, overflow: "hidden" },
  clearFogTxt: { fontFamily: "Cinzel_700Bold", fontSize: 13, color: "#FFD580" },

  sectionTitle: { fontFamily: "Cinzel_600SemiBold", fontSize: 13, color: COLORS.gold, textTransform: "uppercase", letterSpacing: 1 },
});
