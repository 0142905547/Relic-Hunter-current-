import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useGame, StatCategory, StatInfo, CLASS_CONFIG } from "@/context/GameContext";
import { ClassTreeModal } from "@/components/ClassTreeModal";
import COLORS from "@/constants/colors";

const STAT_KEYS: StatCategory[] = ["strength", "intelligence", "endurance", "agility", "wisdom"];

function StatBar({ stat, color }: { stat: StatInfo; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(stat.xpToNext > 0 ? stat.xp / stat.xpToNext : 0, {
      duration: 700,
      easing: Easing.out(Easing.quad),
    });
  }, [stat.xp, stat.xpToNext]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={sbs.container}>
      <View style={sbs.track}>
        <Animated.View style={[sbs.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={sbs.xpText}>{stat.xp} / {stat.xpToNext} XP</Text>
    </View>
  );
}
const sbs = StyleSheet.create({
  container: { gap: 3 },
  track: { height: 5, backgroundColor: COLORS.bgMuted, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  xpText: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverFaint },
});

function ResourceBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(max > 0 ? value / max : 0, { duration: 600 });
  }, [value, max]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={rbs.row}>
      <Text style={rbs.label}>{label}</Text>
      <View style={rbs.track}>
        <Animated.View style={[rbs.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={rbs.value}>{value}/{max}</Text>
    </View>
  );
}
const rbs = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.silverDim, width: 34 },
  track: { flex: 1, height: 7, backgroundColor: COLORS.bgMuted, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  value: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverDim, width: 50, textAlign: "right" },
});

/** Modal that fires when a class is unlocked */
function ClassUnlockModal({ statKey, onDismiss }: { statKey: StatCategory; onDismiss: () => void }) {
  const conf = CLASS_CONFIG[statKey];
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={cum.overlay}>
        <View style={[cum.card, { borderColor: conf.color + "60" }]}>
          <LinearGradient
            colors={[conf.color + "30", "#0A0B1A"]}
            style={StyleSheet.absoluteFill}
            borderRadius={20}
          />
          <MaterialCommunityIcons name={conf.icon as any} size={52} color={conf.color} />
          <Text style={[cum.title, { color: conf.color }]}>Class Unlocked!</Text>
          <Text style={cum.className}>{conf.name}</Text>
          <Text style={cum.story}>{conf.callToAdventure}</Text>
          <View style={[cum.passiveBadge, { borderColor: conf.color + "50", backgroundColor: conf.color + "15" }]}>
            <Text style={[cum.passiveName, { color: conf.color }]}>{conf.passive}</Text>
            <Text style={cum.passiveDesc}>{conf.passiveDesc}</Text>
          </View>
          <Pressable onPress={onDismiss} style={[cum.btn, { backgroundColor: conf.color }]}>
            <Text style={cum.btnText}>Answer the Call</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const cum = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#000000CC", alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  title: { fontFamily: "Cinzel_700Bold", fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase" },
  className: { fontFamily: "Cinzel_700Bold", fontSize: 26, color: COLORS.silver },
  story: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.silverDim, textAlign: "center", lineHeight: 20, fontStyle: "italic" },
  passiveBadge: { width: "100%", borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  passiveName: { fontFamily: "Inter_700Bold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  passiveDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.silverDim },
  btn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 4 },
  btnText: { fontFamily: "Cinzel_700Bold", fontSize: 14, color: "#FFFFFF" },
});

/** Compute total XP ever invested in a stat (sum of all level thresholds + current xp) */
function calcTotalStatXpEarned(stat: StatInfo): number {
  let total = 0;
  for (let lv = 1; lv < stat.level; lv++) {
    total += Math.floor(100 * Math.pow(1.45, lv - 1));
  }
  return total + stat.xp;
}

export default function HeroScreen() {
  const insets = useSafeAreaInsets();
  const { hero, restHero, updateHeroName, resetDay, lastResetDate, newlyUnlockedClass, dismissClassUnlock } = useGame();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(hero.name);
  const [classTreeKey, setClassTreeKey] = useState<StatCategory | null>(null);

  // Primary stat = the stat with the most total XP invested.
  // If two or more stats are tied (same score), showPrimary = false.
  const statScores = STAT_KEYS.map(k => ({ key: k, score: calcTotalStatXpEarned(hero.stats[k]) }));
  const maxScore = Math.max(...statScores.map(s => s.score));
  const topStats = statScores.filter(s => s.score === maxScore);
  const topStat: StatCategory = topStats[0].key;
  const showPrimary = topStats.length === 1; // only show PRIMARY if there's a clear winner

  const topConf = CLASS_CONFIG[topStat];
  const isTopClassUnlocked = hero.unlockedClasses.includes(topStat);

  const avatarScale = useSharedValue(1);
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }));

  const handleRest = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    avatarScale.value = withSpring(1.15, {}, () => { avatarScale.value = withSpring(1); });
    restHero();
  };

  const handleSaveName = () => {
    if (nameInput.trim().length > 0) updateHeroName(nameInput.trim());
    setEditingName(false);
  };

  const handleResetDay = () => {
    Alert.alert("New Day?", "Reset quests and restore all resources?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: resetDay },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const totalStatLevels = STAT_KEYS.reduce((a, k) => a + hero.stats[k].level, 0);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[topConf.color + "22", COLORS.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      {/* Class Unlock Modal */}
      {newlyUnlockedClass && (
        <ClassUnlockModal statKey={newlyUnlockedClass} onDismiss={dismissClassUnlock} />
      )}

      {/* Class Tree Modal */}
      {classTreeKey && (
        <ClassTreeModal
          statKey={classTreeKey}
          statInfo={hero.stats[classTreeKey]}
          onClose={() => setClassTreeKey(null)}
        />
      )}

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <LinearGradient colors={[topConf.color + "20", COLORS.bgCard]} style={StyleSheet.absoluteFill} borderRadius={20} />
        <View style={[styles.cardBorder, { borderColor: topConf.color + "50" }]} />

        <Animated.View style={[styles.avatarWrap, avatarStyle]}>
          <LinearGradient colors={[topConf.color + "40", topConf.color + "10"]} style={styles.avatarGrad}>
            <MaterialCommunityIcons name={topConf.icon as any} size={52} color={topConf.color} />
          </LinearGradient>
        </Animated.View>

        <View style={styles.heroInfo}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                style={styles.nameInput}
                autoFocus maxLength={24}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                onBlur={handleSaveName}
              />
              <Pressable onPress={handleSaveName}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.emerald} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setEditingName(true)}>
              <Text style={styles.heroName}>{hero.name}</Text>
              <Ionicons name="pencil" size={12} color={COLORS.silverFaint} />
            </Pressable>
          )}

          {/* Class badge */}
          {isTopClassUnlocked ? (
            <View style={[styles.classBadge, { backgroundColor: topConf.color + "22", borderColor: topConf.color + "60" }]}>
              <MaterialCommunityIcons name={topConf.icon as any} size={11} color={topConf.color} />
              <Text style={[styles.classText, { color: topConf.color }]}>{topConf.name}</Text>
            </View>
          ) : (
            <View style={[styles.classBadge, { backgroundColor: COLORS.bgMuted, borderColor: COLORS.border }]}>
              <Ionicons name="lock-closed" size={10} color={COLORS.silverFaint} />
              <Text style={[styles.classText, { color: COLORS.silverFaint }]}>Class unlocks at Stat Lv 5</Text>
            </View>
          )}

          <View style={styles.levelRow}>
            <View style={[styles.levelBubble, { borderColor: topConf.color }]}>
              <Text style={[styles.levelNum, { color: topConf.color }]}>{hero.level}</Text>
              <Text style={styles.levelSub}>AVG</Text>
            </View>
            <View>
              <Text style={styles.levelTitle}>Overall Level</Text>
              <Text style={styles.levelHint}>Average of all stat levels</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Resources */}
      <View style={styles.resourceCard}>
        <ResourceBar value={hero.hp} max={hero.maxHp} color={COLORS.crimson} label="HP" />
        <ResourceBar value={hero.stamina} max={hero.maxStamina} color={COLORS.amber} label="STM" />
        <ResourceBar value={hero.mana} max={hero.maxMana} color={COLORS.arcane} label="MNA" />
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {[
          { val: hero.questsCompleted, label: "Quests" },
          { val: hero.bossesDefeated,  label: "Bosses" },
          { val: hero.gold,            label: "Gold", color: COLORS.gold },
          { val: totalStatLevels,      label: "Total Lv" },
          { val: hero.perfectDays,     label: "Perfect" },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryVal, item.color ? { color: item.color } : {}]}>{item.val}</Text>
              <Text style={styles.summaryLbl}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={styles.summaryDiv} />}
          </React.Fragment>
        ))}
      </View>

      {lastResetDate ? (
        <Text style={styles.resetText}>Last daily reset: {lastResetDate}</Text>
      ) : null}

      {/* Attribute list */}
      <Text style={styles.sectionTitle}>Attributes & Classes</Text>
      <View style={styles.attrList}>
        {STAT_KEYS.map(key => {
          const conf = CLASS_CONFIG[key];
          const statInfo = hero.stats[key];
          const isTop = key === topStat;
          const isUnlocked = hero.unlockedClasses.includes(key);

          return (
            <View
              key={key}
              style={[
                styles.attrCard,
                isTop && showPrimary && { borderColor: conf.color + "50", backgroundColor: conf.color + "0A" },
              ]}
            >
              <View style={[styles.attrIcon, { backgroundColor: conf.color + "20" }]}>
                <MaterialCommunityIcons name={conf.icon as any} size={20} color={conf.color} />
              </View>

              <View style={styles.attrBody}>
                {/* Stat label + class name row */}
                <View style={styles.attrLabelRow}>
                  <Text style={styles.attrStatName}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  {isTop && showPrimary && (
                    <View style={[styles.primaryPill, { backgroundColor: conf.color + "22" }]}>
                      <Text style={[styles.primaryPillText, { color: conf.color }]}>PRIMARY</Text>
                    </View>
                  )}
                </View>

                {/* Class unlock status + tree button */}
                <View style={styles.classRow}>
                  {isUnlocked ? (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={12} color={conf.color} />
                      <Text style={[styles.classRowText, { color: conf.color }]}>{conf.name}</Text>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setClassTreeKey(key);
                        }}
                        style={[styles.treeBtn, { borderColor: conf.color + "50", backgroundColor: conf.color + "15" }]}
                      >
                        <MaterialCommunityIcons name="tree" size={10} color={conf.color} />
                        <Text style={[styles.treeBtnText, { color: conf.color }]}>Tree</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={11} color={COLORS.silverFaint} />
                      <Text style={styles.classRowLocked}>{conf.name} — unlocks at Lv {conf.unlockLevel}</Text>
                    </>
                  )}
                </View>

                <StatBar stat={statInfo} color={conf.color} />
              </View>

              {/* Level bubble */}
              <View style={[styles.lvBubble, { borderColor: conf.color + (isUnlocked ? "CC" : "44") }]}>
                <Text style={[styles.lvNum, { color: conf.color }]}>{statInfo.level}</Text>
                <Text style={styles.lvLabel}>Lv</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Class passives for unlocked classes */}
      {hero.unlockedClasses.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Active Class Passives</Text>
          <View style={styles.passiveList}>
            {hero.unlockedClasses.map(key => {
              const conf = CLASS_CONFIG[key];
              return (
                <View key={key} style={[styles.passiveCard, { borderColor: conf.color + "40" }]}>
                  <LinearGradient colors={[conf.color + "15", COLORS.bgCard]} style={StyleSheet.absoluteFill} borderRadius={12} />
                  <View style={[styles.passiveIcon, { backgroundColor: conf.color + "20" }]}>
                    <MaterialCommunityIcons name={conf.icon as any} size={16} color={conf.color} />
                  </View>
                  <View style={styles.passiveBody}>
                    <Text style={[styles.passiveName, { color: conf.color }]}>{conf.passive}</Text>
                    <Text style={styles.passiveDesc}>{conf.passiveDesc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable onPress={handleRest} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
          <LinearGradient colors={[COLORS.arcaneDim, COLORS.arcane + "80"]} style={styles.actionBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name="sleep" size={18} color={COLORS.arcaneLight} />
            <Text style={styles.actionBtnText}>Rest (+30 STM/MNA)</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={handleResetDay} style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.8 }]}>
          <Ionicons name="refresh" size={16} color={COLORS.silverDim} />
          <Text style={styles.actionBtnTextSec}>New Day</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  heroCard: { borderRadius: 20, padding: 18, flexDirection: "row", gap: 14, alignItems: "center", overflow: "hidden", position: "relative" },
  cardBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 20, borderWidth: 1 },
  avatarWrap: { alignSelf: "center" },
  avatarGrad: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  heroInfo: { flex: 1, gap: 7 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroName: { fontFamily: "Cinzel_700Bold", fontSize: 19, color: COLORS.silver },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  nameInput: { fontFamily: "Cinzel_600SemiBold", fontSize: 17, color: COLORS.silver, borderBottomWidth: 1, borderBottomColor: COLORS.gold, flex: 1, paddingVertical: 2 },
  classBadge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  classText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  levelBubble: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgCard },
  levelNum: { fontFamily: "Cinzel_700Bold", fontSize: 17, lineHeight: 21 },
  levelSub: { fontFamily: "Inter_400Regular", fontSize: 8, color: COLORS.silverDim },
  levelTitle: { fontFamily: "Cinzel_600SemiBold", fontSize: 12, color: COLORS.silver },
  levelHint: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverDim, marginTop: 2 },

  resourceCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 10 },

  summaryRow: { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, flexDirection: "row", alignItems: "center" },
  summaryCell: { flex: 1, alignItems: "center", gap: 2 },
  summaryVal: { fontFamily: "Cinzel_600SemiBold", fontSize: 17, color: COLORS.silver },
  summaryLbl: { fontFamily: "Inter_400Regular", fontSize: 9, color: COLORS.silverDim, textTransform: "uppercase", letterSpacing: 0.4 },
  summaryDiv: { width: 1, height: 32, backgroundColor: COLORS.border },
  resetText: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.silverFaint, textAlign: "center", marginTop: -6 },

  sectionTitle: { fontFamily: "Cinzel_600SemiBold", fontSize: 12, color: COLORS.silverDim, textTransform: "uppercase", letterSpacing: 1 },

  attrList: { gap: 8 },
  attrCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.bgCard, borderRadius: 13, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  attrIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  attrBody: { flex: 1, gap: 3 },
  attrLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  attrStatName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.silver, flex: 1 },
  primaryPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  primaryPillText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.5 },
  classRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  classRowText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  passiveLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim },
  classRowLocked: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverFaint },
  treeBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginLeft: 4 },
  treeBtnText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.3 },
  lvBubble: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bgMuted, flexShrink: 0 },
  lvNum: { fontFamily: "Cinzel_700Bold", fontSize: 15, lineHeight: 19 },
  lvLabel: { fontFamily: "Inter_400Regular", fontSize: 8, color: COLORS.silverDim },

  passiveList: { gap: 8 },
  passiveCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, overflow: "hidden", position: "relative" },
  passiveIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  passiveBody: { flex: 1, gap: 3 },
  passiveName: { fontFamily: "Inter_700Bold", fontSize: 12 },
  passiveDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.silverDim, lineHeight: 16 },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, padding: 13 },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.arcaneLight },
  actionBtnSecondary: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: COLORS.border },
  actionBtnTextSec: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: COLORS.silverDim },
});
