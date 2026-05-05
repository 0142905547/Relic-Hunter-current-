import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatCategory, CLASS_CONFIG, CLASS_TIERS, StatInfo } from "@/context/GameContext";
import COLORS from "@/constants/colors";

const TIER_GROUP_LABELS = ["Novice", "Adept", "Expert", "Master", "Legendary"];
const TIER_MIN_LEVELS = [1, 5, 10, 15, 20];

interface ClassTreeModalProps {
  statKey: StatCategory;
  statInfo: StatInfo;
  onClose: () => void;
}

export function ClassTreeModal({ statKey, statInfo, onClose }: ClassTreeModalProps) {
  const conf = CLASS_CONFIG[statKey];
  const tiers = CLASS_TIERS[statKey];
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  const maxUnlockedTier = (() => {
    if (statInfo.level >= 20) return 15;
    if (statInfo.level >= 15) return 12;
    if (statInfo.level >= 10) return 9;
    if (statInfo.level >= 5)  return 6;
    if (statInfo.level >= 1)  return 3;
    return 0;
  })();

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={[conf.color + "20", "#0A0B1A"]}
            style={StyleSheet.absoluteFill}
            borderRadius={24}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: conf.color + "20" }]}>
              <MaterialCommunityIcons name={conf.icon as any} size={28} color={conf.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: conf.color }]}>{conf.name}</Text>
              <Text style={styles.headerBuilding}>{conf.building}</Text>
              <Text style={styles.headerLevel}>Building Level {statInfo.level}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.silverDim} />
            </Pressable>
          </View>

          {/* Progress hint */}
          <View style={styles.progressHint}>
            {maxUnlockedTier < 15 && (
              <Text style={styles.progressHintText}>
                Reach Building Lv {TIER_MIN_LEVELS[Math.floor(maxUnlockedTier / 3)]} to unlock Tier {maxUnlockedTier + 1}
              </Text>
            )}
            {maxUnlockedTier === 15 && (
              <Text style={[styles.progressHintText, { color: COLORS.gold }]}>All tiers unlocked — Legendary!</Text>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {TIER_GROUP_LABELS.map((groupLabel, gi) => {
              const groupStart = gi * 3; // tiers index 0..2, 3..5, etc.
              const groupTiers = tiers.slice(groupStart, groupStart + 3);
              const minLevelForGroup = TIER_MIN_LEVELS[gi];
              const isGroupUnlocked = statInfo.level >= minLevelForGroup;
              const isExpanded = expandedGroup === gi;

              return (
                <Pressable
                  key={gi}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedGroup(isExpanded ? null : gi);
                  }}
                  style={({ pressed }) => [
                    styles.groupCard,
                    isGroupUnlocked && { borderColor: conf.color + "40" },
                    !isGroupUnlocked && styles.groupCardLocked,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <LinearGradient
                    colors={isGroupUnlocked ? [conf.color + "12", "transparent"] : ["transparent", "transparent"]}
                    style={StyleSheet.absoluteFill}
                    borderRadius={14}
                  />

                  {/* Group header */}
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                      {isGroupUnlocked ? (
                        <MaterialCommunityIcons name="shield-star" size={16} color={conf.color} />
                      ) : (
                        <Ionicons name="lock-closed" size={14} color={COLORS.silverFaint} />
                      )}
                      <Text style={[styles.groupTitle, !isGroupUnlocked && styles.groupTitleLocked]}>
                        {groupLabel} Path
                      </Text>
                      <Text style={styles.groupTierRange}>Tiers {groupStart + 1}–{groupStart + 3}</Text>
                    </View>
                    <View style={styles.groupHeaderRight}>
                      {!isGroupUnlocked && (
                        <Text style={styles.groupLockReq}>Lv {minLevelForGroup}+</Text>
                      )}
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={isGroupUnlocked ? conf.color : COLORS.silverFaint}
                      />
                    </View>
                  </View>

                  {/* Tier rows */}
                  {isExpanded && (
                    <View style={styles.tierList}>
                      {groupTiers.map((tier, ti) => {
                        const tierNum = groupStart + ti + 1;
                        const isTierUnlocked = tierNum <= maxUnlockedTier;
                        return (
                          <View
                            key={tierNum}
                            style={[
                              styles.tierRow,
                              isTierUnlocked && { borderLeftColor: conf.color },
                            ]}
                          >
                            <View style={[styles.tierBadge, isTierUnlocked && { backgroundColor: conf.color + "30" }]}>
                              <Text style={[styles.tierNum, isTierUnlocked && { color: conf.color }]}>
                                {tierNum}
                              </Text>
                            </View>
                            <View style={styles.tierBody}>
                              <Text style={[styles.tierName, !isTierUnlocked && styles.tierNameLocked]}>
                                {tier.name}
                              </Text>
                              <Text style={styles.tierDesc}>{tier.description}</Text>
                            </View>
                            {isTierUnlocked && (
                              <Ionicons name="checkmark-circle" size={16} color={conf.color} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.doneBtnText, { color: conf.color }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000BB",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 20,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 18,
  },
  headerBuilding: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    marginTop: 2,
  },
  headerLevel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.gold,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHint: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    fontStyle: "italic",
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { gap: 8, paddingBottom: 8 },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    overflow: "hidden",
    position: "relative",
  },
  groupCardLocked: {
    opacity: 0.6,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  groupTitle: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 13,
    color: COLORS.silver,
  },
  groupTitleLocked: {
    color: COLORS.silverFaint,
  },
  groupTierRange: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.silverFaint,
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  groupLockReq: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: COLORS.silverFaint,
    backgroundColor: COLORS.bgMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tierList: {
    marginTop: 12,
    gap: 8,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  tierBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.bgMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tierNum: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 12,
    color: COLORS.silverFaint,
  },
  tierBody: { flex: 1 },
  tierName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.silver,
    lineHeight: 17,
  },
  tierNameLocked: {
    color: COLORS.silverDim,
  },
  tierDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.silverDim,
    marginTop: 2,
    lineHeight: 16,
  },
  doneBtn: {
    padding: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  doneBtnText: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 14,
  },
});
