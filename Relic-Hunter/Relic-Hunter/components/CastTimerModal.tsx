import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Quest, QuestType } from "@/context/GameContext";
import COLORS, { ENEMY_COLORS } from "@/constants/colors";

const ENEMY_ICONS: Record<QuestType, string> = {
  critter: "skull-crossbones",
  elite: "ghost",
  boss: "castle",
  hazard: "alert",
};

interface CastTimerModalProps {
  quest: Quest;
  onClaim: (multiplier: number) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CastTimerModal({ quest, onClaim, onCancel }: CastTimerModalProps) {
  const estimatedSeconds = quest.estimatedMinutes * 60;
  const minClaimSeconds = 30;
  const halfTime = estimatedSeconds * 0.5;

  const runStartEpochRef = useRef<number | null>(null);
  const accSecsRef = useRef(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const notifIdRef = useRef<string | null>(null);
  const progressValue = useSharedValue(0);

  const getElapsed = useCallback((): number => {
    const acc = accSecsRef.current;
    const epoch = runStartEpochRef.current;
    if (epoch === null) return acc;
    return acc + Math.floor((Date.now() - epoch) / 1000);
  }, []);

  const elapsed = getElapsed();
  const progress = Math.min(1, elapsed / estimatedSeconds);
  const isCheese = elapsed < halfTime;
  const canClaim = elapsed >= minClaimSeconds;
  const isComplete = elapsed >= estimatedSeconds;

  const rewardMultiplier = isCheese ? 0.2 : 1.0;
  const displayXp = Math.round(quest.xpReward * rewardMultiplier);
  const displayGold = Math.round(quest.goldReward * rewardMultiplier);

  const colors = ENEMY_COLORS[quest.type];

  const cancelScheduledNotif = useCallback(async () => {
    if (Platform.OS !== "web" && notifIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      } catch {}
      notifIdRef.current = null;
    }
  }, []);

  const scheduleCompletionNotif = useCallback(async (remainingSecs: number) => {
    if (Platform.OS === "web" || remainingSecs <= 0) return;
    await cancelScheduledNotif();
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Quest Complete!",
          body: `"${quest.title}" is done — return to claim your reward!`,
          sound: true,
        },
        trigger: { seconds: Math.ceil(remainingSecs) } as any,
      });
      notifIdRef.current = id;
    } catch {}
  }, [quest.title, cancelScheduledNotif]);

  useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  useEffect(() => {
    if (Platform.OS !== "web") {
      Notifications.requestPermissionsAsync().catch(() => {});
    }
    runStartEpochRef.current = Date.now();
    scheduleCompletionNotif(estimatedSeconds);
    const interval = setInterval(() => setTick(n => n + 1), 1000);
    return () => {
      clearInterval(interval);
      cancelScheduledNotif();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") setTick(n => n + 1);
    });
    return () => sub.remove();
  }, []);

  const handlePause = useCallback(() => {
    const currentElapsed = getElapsed();
    if (paused) {
      accSecsRef.current = currentElapsed;
      runStartEpochRef.current = Date.now();
      const remaining = Math.max(0, estimatedSeconds - currentElapsed);
      if (remaining > 0) scheduleCompletionNotif(remaining);
    } else {
      accSecsRef.current = currentElapsed;
      runStartEpochRef.current = null;
      cancelScheduledNotif();
    }
    setPaused(p => !p);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [paused, getElapsed, estimatedSeconds, scheduleCompletionNotif, cancelScheduledNotif]);

  const handleClaim = useCallback(() => {
    cancelScheduledNotif();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClaim(rewardMultiplier);
  }, [cancelScheduledNotif, rewardMultiplier, onClaim]);

  const handleCancel = useCallback(() => {
    cancelScheduledNotif();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onCancel();
  }, [cancelScheduledNotif, onCancel]);

  const progressColor = progress >= 1
    ? COLORS.emerald
    : isCheese
    ? COLORS.crimson
    : COLORS.gold;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.bg, "#0A0B1A"]}
            style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
          />
          <View style={[styles.cardBorder, { borderColor: colors.accent + "50" }]} />

          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: colors.accent + "25" }]}>
              <MaterialCommunityIcons name={ENEMY_ICONS[quest.type] as any} size={26} color={colors.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.questTitle} numberOfLines={2}>{quest.title}</Text>
              <Text style={styles.questMeta}>
                {quest.statCategory} · {quest.estimatedMinutes}m estimated
              </Text>
            </View>
            {Platform.OS !== "web" && !paused && !isComplete && (
              <View style={styles.bgBadge}>
                <Ionicons name="notifications" size={11} color={COLORS.gold} />
                <Text style={styles.bgBadgeText}>notified</Text>
              </View>
            )}
          </View>

          <View style={styles.timerSection}>
            <Text style={[styles.timerDisplay, { color: paused ? COLORS.silverDim : COLORS.silver }]}>
              {formatTime(elapsed)}
            </Text>
            <Text style={styles.timerGoal}>
              {isComplete ? "Quest time reached!" : `Goal: ${formatTime(estimatedSeconds)}`}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { backgroundColor: progressColor }, progressBarStyle]} />
            <View style={styles.halfMarker} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelLeft}>0</Text>
            <View style={styles.halfMarkerLabel}>
              <Text style={styles.halfText}>50%</Text>
            </View>
            <Text style={styles.progressLabelRight}>{formatTime(estimatedSeconds)}</Text>
          </View>

          {isCheese && canClaim && (
            <View style={styles.cheeseWarning}>
              <Ionicons name="warning" size={13} color={COLORS.crimson} />
              <Text style={styles.cheeseText}>
                Claiming before 50% of time: rewards reduced to 20%
              </Text>
            </View>
          )}

          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardNum}>{displayXp}</Text>
              <Text style={styles.rewardLabel}>XP</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardChip}>
              <MaterialCommunityIcons name="gold" size={13} color={COLORS.gold} />
              <Text style={[styles.rewardNum, { color: COLORS.gold }]}>{displayGold}</Text>
              <Text style={styles.rewardLabel}>gold</Text>
            </View>
            {rewardMultiplier < 1 && (
              <View style={styles.reducedBadge}>
                <Text style={styles.reducedText}>REDUCED</Text>
              </View>
            )}
          </View>

          <View style={styles.btnRow}>
            <Pressable onPress={handleCancel} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="close" size={18} color={COLORS.silverDim} />
              <Text style={styles.cancelText}>Retreat</Text>
            </Pressable>

            <Pressable onPress={handlePause} style={({ pressed }) => [styles.pauseBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name={paused ? "play" : "pause"} size={18} color={COLORS.silver} />
            </Pressable>

            <Pressable
              onPress={handleClaim}
              disabled={!canClaim}
              style={({ pressed }) => [
                styles.claimBtn,
                !canClaim && styles.claimBtnDisabled,
                pressed && canClaim && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={canClaim
                  ? isComplete ? [COLORS.emerald + "CC", COLORS.emerald] : [COLORS.goldLight, COLORS.gold]
                  : [COLORS.bgMuted, COLORS.bgMuted]}
                style={styles.claimBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark" size={18} color={canClaim ? COLORS.bg : COLORS.silverFaint} />
                <Text style={[styles.claimText, !canClaim && styles.claimTextDisabled]}>
                  {isComplete ? "Slay!" : canClaim ? "Claim" : "Wait..."}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {!canClaim && (
            <Text style={styles.hintText}>Engage for at least 30 seconds to claim</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000BB",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "web" ? 34 : 0,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderBottomLeftRadius: Platform.OS === "web" ? 24 : 0,
    borderBottomRightRadius: Platform.OS === "web" ? 24 : 0,
    padding: 24,
    gap: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  questTitle: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 16,
    color: COLORS.silver,
    lineHeight: 22,
  },
  questMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    marginTop: 3,
    textTransform: "capitalize",
  },
  bgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.gold + "20",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold + "40",
  },
  bgBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: COLORS.gold,
  },
  timerSection: { alignItems: "center", paddingVertical: 8 },
  timerDisplay: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 56,
    letterSpacing: 2,
    lineHeight: 64,
  },
  timerGoal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.bgMuted,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  halfMarker: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.silver + "40",
  },
  progressLabels: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -6,
  },
  progressLabelLeft: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: COLORS.silverFaint,
  },
  halfMarkerLabel: {
    flex: 1,
    alignItems: "center",
  },
  halfText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: COLORS.silverFaint,
  },
  progressLabelRight: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: COLORS.silverFaint,
  },
  cheeseWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.crimson + "15",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.crimson + "35",
  },
  cheeseText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.crimsonLight,
    flex: 1,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardNum: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 17,
    color: COLORS.silver,
  },
  rewardLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.silverDim,
  },
  rewardDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  reducedBadge: {
    marginLeft: "auto",
    backgroundColor: COLORS.crimson + "22",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.crimson + "50",
  },
  reducedText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: COLORS.crimson,
    letterSpacing: 0.5,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: COLORS.silverDim,
  },
  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  claimBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
  },
  claimText: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 15,
    color: COLORS.bg,
  },
  claimTextDisabled: { color: COLORS.silverFaint },
  hintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.silverFaint,
    textAlign: "center",
    marginTop: -8,
  },
});
