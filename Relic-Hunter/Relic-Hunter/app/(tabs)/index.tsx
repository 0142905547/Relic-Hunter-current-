import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useGame, QuestType } from "@/context/GameContext";
import { QuestCard } from "@/components/QuestCard";
import { ResourceBar } from "@/components/ResourceBar";
import { TavernOverlay } from "@/components/TavernOverlay";
import COLORS from "@/constants/colors";

const TYPE_FILTERS: { key: QuestType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critter", label: "Critters" },
  { key: "elite", label: "Elites" },
  { key: "boss", label: "Bosses" },
  { key: "hazard", label: "Hazards" },
];

export default function DungeonScreen() {
  const insets = useSafeAreaInsets();
  const { hero, activeQuests, completedQuests, performance, tavernMode, activateTavern, exitTavern } = useGame();
  const [filter, setFilter] = useState<QuestType | "all">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredActive = useMemo(() => {
    if (filter === "all") return activeQuests;
    return activeQuests.filter(q => q.type === filter);
  }, [activeQuests, filter]);

  const perfColor = performance >= 70
    ? COLORS.emerald
    : performance >= 40
    ? COLORS.amber
    : COLORS.crimson;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const handleAdd = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/add-quest");
  };

  const handleTavern = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    activateTavern();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (tavernMode) {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 80 }]}>
        <TavernOverlay onExit={exitTavern} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["#1A0D2E", COLORS.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.dungeonTitle}>The Daily Dungeon</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.perfBadge, { borderColor: perfColor }]}>
            <Text style={[styles.perfValue, { color: perfColor }]}>{performance}%</Text>
            <Text style={styles.perfLabel}>Power</Text>
          </View>
          <Pressable
            onPress={handleTavern}
            style={({ pressed }) => [styles.tavernBtn, pressed && { opacity: 0.75 }]}
            testID="tavern-button"
          >
            <MaterialCommunityIcons name="glass-mug-variant" size={18} color="#D4891A" />
          </Pressable>
        </View>
      </View>

      <View style={styles.resourceContainer}>
        <ResourceBar
          label="Stamina"
          current={hero.stamina}
          max={hero.maxStamina}
          color={COLORS.stamina}
          icon={<MaterialCommunityIcons name="arm-flex" size={12} color={COLORS.stamina} />}
        />
        <View style={styles.resourceDivider} />
        <ResourceBar
          label="Mana"
          current={hero.mana}
          max={hero.maxMana}
          color={COLORS.mana}
          icon={<MaterialCommunityIcons name="magic-staff" size={12} color={COLORS.mana} />}
        />
      </View>

      <ScrollView
        style={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
      >
        {TYPE_FILTERS.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredActive.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="sword-cross" size={48} color={COLORS.silverFaint} />
            <Text style={styles.emptyTitle}>No Quests</Text>
            <Text style={styles.emptyText}>
              {performance < 40
                ? "Your resources are low. Consider resting at the Tavern."
                : "The dungeon awaits. Add your first quest to begin."}
            </Text>
            {performance < 40 && (
              <Pressable onPress={handleTavern} style={({ pressed }) => [styles.tavernEmptyBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="glass-mug-variant" size={16} color="#D4891A" />
                <Text style={styles.tavernEmptyText}>Rest at the Tavern</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {performance < 40 && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={14} color={COLORS.amber} />
                <Text style={styles.warningText}>
                  Resources low — rest at the Tavern or take easier quests
                </Text>
                <Pressable onPress={handleTavern} style={styles.warningTavernBtn}>
                  <MaterialCommunityIcons name="glass-mug-variant" size={14} color="#D4891A" />
                </Pressable>
              </View>
            )}
            {filteredActive.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </>
        )}

        {completedQuests.length > 0 && (
          <>
            <Pressable
              style={styles.completedHeader}
              onPress={() => setShowCompleted(v => !v)}
            >
              <Text style={styles.completedHeaderText}>
                Slain Today ({completedQuests.length})
              </Text>
              <Ionicons
                name={showCompleted ? "chevron-up" : "chevron-down"}
                size={16}
                color={COLORS.silverDim}
              />
            </Pressable>
            {showCompleted && completedQuests.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottomPad + (Platform.OS === "web" ? 84 : 90) },
          pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
        ]}
        testID="add-quest-fab"
      >
        <LinearGradient
          colors={[COLORS.goldLight, COLORS.gold]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color={COLORS.bg} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerLeft: { flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  dungeonTitle: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 22,
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  perfBadge: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  perfValue: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  perfLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tavernBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2A1A08",
    borderWidth: 1,
    borderColor: "#6A3A08",
    alignItems: "center",
    justifyContent: "center",
  },
  resourceContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  resourceDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  filterRow: {
    flexGrow: 0,
    marginBottom: 14,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.goldDim,
    borderColor: COLORS.gold,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.silverDim,
  },
  filterTextActive: {
    color: COLORS.goldLight,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 20,
    color: COLORS.silverDim,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.silverFaint,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  tavernEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2A1A08",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#6A3A08",
    marginTop: 4,
  },
  tavernEmptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#D4891A",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.amber + "60",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.amber,
    flex: 1,
  },
  warningTavernBtn: {
    padding: 4,
  },
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  completedHeaderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
});
