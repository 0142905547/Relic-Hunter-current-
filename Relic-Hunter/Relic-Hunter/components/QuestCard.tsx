import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import COLORS, { ENEMY_COLORS } from "@/constants/colors";
import { Quest, QuestType, useGame } from "@/context/GameContext";
import { CastTimerModal } from "@/components/CastTimerModal";

const ENEMY_ICONS: Record<QuestType, { lib: "ionicons" | "mci"; name: string }> = {
  critter: { lib: "mci", name: "skull-crossbones" },
  elite: { lib: "mci", name: "ghost" },
  boss: { lib: "mci", name: "castle" },
  hazard: { lib: "ionicons", name: "warning" },
};

const ENEMY_LABELS: Record<QuestType, string> = {
  critter: "Critter",
  elite: "Elite",
  boss: "Boss",
  hazard: "Hazard",
};

const STAT_ICONS: Record<string, string> = {
  strength: "arm-flex",
  intelligence: "brain",
  endurance: "run",
  agility: "lightning-bolt",
  wisdom: "eye",
};

interface QuestCardProps {
  quest: Quest;
  onPress?: () => void;
}

export function QuestCard({ quest, onPress }: QuestCardProps) {
  const { completeQuest, attackBoss, deleteQuest, checkResourcesForQuest } = useGame();
  const [timerOpen, setTimerOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const colors = ENEMY_COLORS[quest.type];
  const enemyIcon = ENEMY_ICONS[quest.type];

  const handlePress = () => {
    if (quest.completed) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (quest.type === "boss") {
      attackBoss(quest.id);
      if (onPress) onPress();
      return;
    }

    // Resource gate — check before opening the timer
    const { canStart, reason } = checkResourcesForQuest(quest);
    if (!canStart) {
      Alert.alert("Depleted", reason, [{ text: "Understood", style: "cancel" }]);
      return;
    }

    setTimerOpen(true);
  };

  const handleLongPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    Alert.alert(
      "Abandon Quest?",
      `Remove "${quest.title}" from your quest board?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Abandon",
          style: "destructive",
          onPress: () => deleteQuest(quest.id),
        },
      ]
    );
  };

  const handleTimerClaim = (multiplier: number) => {
    setTimerOpen(false);
    completeQuest(quest.id, multiplier);
    if (onPress) onPress();
  };

  const handleTimerCancel = () => {
    setTimerOpen(false);
  };

  const hpPercent = quest.maxHp > 0 ? quest.hp / quest.maxHp : 0;
  const isCompleted = quest.completed;
  const isBoss = quest.type === "boss";

  return (
    <>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          disabled={isCompleted && !isBoss}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.bg, borderColor: colors.border },
            isCompleted && styles.completedCard,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.leftStripe}>
            <View style={[styles.stripe, { backgroundColor: colors.accent }]} />
          </View>

          <View style={styles.iconArea}>
            <View style={[styles.iconBg, { backgroundColor: colors.border + "40" }]}>
              {enemyIcon.lib === "mci" ? (
                <MaterialCommunityIcons
                  name={enemyIcon.name as any}
                  size={22}
                  color={isCompleted ? COLORS.silverFaint : colors.accent}
                />
              ) : (
                <Ionicons
                  name={enemyIcon.name as any}
                  size={22}
                  color={isCompleted ? COLORS.silverFaint : colors.accent}
                />
              )}
            </View>
            <Text style={[styles.typeLabel, { color: isCompleted ? COLORS.silverFaint : colors.accent }]}>
              {ENEMY_LABELS[quest.type]}
            </Text>
          </View>

          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                isCompleted && styles.completedTitle,
              ]}
              numberOfLines={2}
            >
              {quest.title}
            </Text>
            {quest.description.length > 0 && !isCompleted && (
              <Text style={styles.description} numberOfLines={1}>
                {quest.description}
              </Text>
            )}

            {isBoss && !isCompleted && (
              <View style={styles.hpRow}>
                <View style={styles.hpTrack}>
                  <View style={[styles.hpFill, { width: `${hpPercent * 100}%`, backgroundColor: COLORS.crimson }]} />
                </View>
                <Text style={styles.hpText}>{quest.hp}/{quest.maxHp} HP</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color={COLORS.silverDim} />
                <Text style={styles.metaText}>{quest.estimatedMinutes}m</Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialCommunityIcons name={STAT_ICONS[quest.statCategory] as any} size={11} color={COLORS.silverDim} />
                <Text style={styles.metaText}>{quest.statCategory}</Text>
              </View>
              {quest.isHabit && quest.habitStreak > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="flame" size={11} color={COLORS.amber} />
                  <Text style={[styles.metaText, { color: COLORS.amber }]}>{quest.habitStreak}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.rewardArea}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardXp}>+{quest.xpReward}</Text>
              <Text style={styles.rewardLabel}>XP</Text>
            </View>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardGold}>+{quest.goldReward}</Text>
              <Text style={styles.rewardLabel}>G</Text>
            </View>

            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.emerald} />
            ) : isBoss ? (
              <View style={[styles.actionBtn, { borderColor: COLORS.crimson }]}>
                <MaterialCommunityIcons name="sword-cross" size={16} color={COLORS.crimson} />
              </View>
            ) : (
              <View style={[styles.actionBtn, { borderColor: colors.accent }]}>
                <MaterialCommunityIcons name="timer-play" size={16} color={colors.accent} />
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {timerOpen && (
        <CastTimerModal
          quest={quest}
          onClaim={handleTimerClaim}
          onCancel={handleTimerCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  completedCard: {
    opacity: 0.55,
  },
  leftStripe: {
    width: 3,
  },
  stripe: {
    flex: 1,
    opacity: 0.9,
  },
  iconArea: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 4,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 4,
    paddingRight: 8,
    gap: 4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.silver,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: COLORS.silverDim,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
  },
  hpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  hpTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bgMuted,
    borderRadius: 2,
    overflow: "hidden",
  },
  hpFill: {
    height: "100%",
    borderRadius: 2,
  },
  hpText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: COLORS.crimsonLight,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: COLORS.silverDim,
    textTransform: "capitalize",
  },
  rewardArea: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rewardChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
  },
  rewardXp: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: COLORS.gold,
  },
  rewardGold: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: COLORS.amberLight,
  },
  rewardLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: COLORS.silverDim,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
