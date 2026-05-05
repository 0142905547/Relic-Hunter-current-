import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGame, QuestType, StatCategory } from "@/context/GameContext";
import COLORS, { ENEMY_COLORS } from "@/constants/colors";

const QUEST_TYPES: {
  key: QuestType;
  label: string;
  subtitle: string;
  icon: string;
  timeRange: string;
}[] = [
  {
    key: "critter",
    label: "Critter",
    subtitle: "Quick win",
    icon: "skull-crossbones",
    timeRange: "< 10 min",
  },
  {
    key: "elite",
    label: "Elite",
    subtitle: "Deep work",
    icon: "ghost",
    timeRange: "1–2 hours",
  },
  {
    key: "boss",
    label: "World Boss",
    subtitle: "Major goal",
    icon: "castle",
    timeRange: "Multi-day",
  },
  {
    key: "hazard",
    label: "Hazard",
    subtitle: "Habit / routine",
    icon: "biohazard",
    timeRange: "Daily",
  },
];

const STAT_OPTIONS: { key: StatCategory; label: string; icon: string }[] = [
  { key: "strength", label: "Strength", icon: "arm-flex" },
  { key: "intelligence", label: "Intelligence", icon: "brain" },
  { key: "endurance", label: "Endurance", icon: "run" },
  { key: "agility", label: "Agility", icon: "lightning-bolt" },
  { key: "wisdom", label: "Wisdom", icon: "eye" },
];

export default function AddQuestScreen() {
  const insets = useSafeAreaInsets();
  const { addQuest } = useGame();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<QuestType>("critter");
  const [statCategory, setStatCategory] = useState<StatCategory>("strength");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("25");
  const [isHabit, setIsHabit] = useState(false);

  const estimatedMinutes = (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);

  const selectedColors = ENEMY_COLORS[type];

  const handleCreate = () => {
    if (!title.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    addQuest({
      title: title.trim(),
      description: description.trim(),
      type,
      statCategory,
      estimatedMinutes,
      maxHp: 1,
      isHabit: isHabit || type === "hazard",
    });
    router.back();
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quest Title</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="What must be done..."
          placeholderTextColor={COLORS.silverFaint}
          maxLength={80}
          autoFocus
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Details, steps, context..."
          placeholderTextColor={COLORS.silverFaint}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Enemy Type</Text>
        <View style={styles.typeGrid}>
          {QUEST_TYPES.map(qt => {
            const isSelected = type === qt.key;
            const c = ENEMY_COLORS[qt.key];
            return (
              <Pressable
                key={qt.key}
                onPress={() => {
                  setType(qt.key);
                  if (qt.key === "hazard") setIsHabit(true);
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync();
                  }
                }}
                style={[
                  styles.typeCard,
                  { backgroundColor: isSelected ? c.bg : COLORS.bgCard, borderColor: isSelected ? c.border : COLORS.border },
                ]}
              >
                <MaterialCommunityIcons
                  name={qt.icon as any}
                  size={24}
                  color={isSelected ? c.accent : COLORS.silverFaint}
                />
                <Text style={[styles.typeName, isSelected && { color: c.accent }]}>{qt.label}</Text>
                <Text style={[styles.typeSub, isSelected && { color: c.accent + "BB" }]}>{qt.subtitle}</Text>
                <Text style={[styles.typeTime, isSelected && { color: c.accent + "99" }]}>{qt.timeRange}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Attribute Gained</Text>
        <View style={styles.statRow}>
          {STAT_OPTIONS.map(s => {
            const isSelected = statCategory === s.key;
            const colors: Record<StatCategory, string> = {
              strength: COLORS.crimson,
              intelligence: COLORS.arcane,
              endurance: COLORS.emerald,
              agility: COLORS.amber,
              wisdom: COLORS.gold,
            };
            const color = colors[s.key];
            return (
              <Pressable
                key={s.key}
                onPress={() => setStatCategory(s.key)}
                style={[
                  styles.statChip,
                  isSelected && { backgroundColor: color + "25", borderColor: color },
                ]}
              >
                <MaterialCommunityIcons
                  name={s.icon as any}
                  size={16}
                  color={isSelected ? color : COLORS.silverFaint}
                />
                <Text style={[styles.statChipText, isSelected && { color }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Estimated Time</Text>
        <View style={styles.timeInputRow}>
          <View style={styles.timeField}>
            <TextInput
              style={[styles.timeNumberInput, { borderColor: selectedColors.border }]}
              value={hours}
              onChangeText={v => setHours(v.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={COLORS.silverFaint}
              selectTextOnFocus
            />
            <Text style={styles.timeUnitLabel}>hrs</Text>
          </View>
          <Text style={styles.timeSep}>:</Text>
          <View style={styles.timeField}>
            <TextInput
              style={[styles.timeNumberInput, { borderColor: selectedColors.border }]}
              value={minutes}
              onChangeText={v => {
                const n = v.replace(/[^0-9]/g, "").slice(0, 2);
                setMinutes(n);
              }}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor={COLORS.silverFaint}
              selectTextOnFocus
            />
            <Text style={styles.timeUnitLabel}>min</Text>
          </View>
        </View>
        {estimatedMinutes > 0 && (
          <Text style={[styles.timeConvertNote, { color: selectedColors.accent }]}>
            = {estimatedMinutes >= 60
              ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60 > 0 ? `${estimatedMinutes % 60}m` : ""}`.trim()
              : `${estimatedMinutes} minutes`} total
          </Text>
        )}
      </View>

      {type !== "hazard" && (
        <View style={styles.section}>
          <View style={styles.habitRow}>
            <View>
              <Text style={styles.habitLabel}>Recurring Habit</Text>
              <Text style={styles.habitSub}>Resets each day, builds streak</Text>
            </View>
            <Switch
              value={isHabit}
              onValueChange={setIsHabit}
              trackColor={{ false: COLORS.bgMuted, true: COLORS.arcane }}
              thumbColor={isHabit ? COLORS.arcaneLight : COLORS.silverDim}
            />
          </View>
        </View>
      )}

      <View style={styles.rewardPreview}>
        <Text style={styles.rewardPreviewTitle}>Quest Reward Preview</Text>
        <View style={styles.rewardPreviewRow}>
          <View style={styles.previewChip}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.previewValue}>
              {type === "critter" ? 15 + Math.floor(estimatedMinutes / 10) * 5
                : type === "elite" ? 60 + Math.floor(estimatedMinutes / 10) * 5
                : type === "boss" ? 20 + Math.floor(estimatedMinutes / 10) * 5
                : 25 + Math.floor(estimatedMinutes / 10) * 5} XP
            </Text>
          </View>
          <View style={styles.previewChip}>
            <MaterialCommunityIcons name="gold" size={14} color={COLORS.amberLight} />
            <Text style={styles.previewValue}>
              {type === "critter" ? 5 + Math.floor(estimatedMinutes / 20) * 5
                : type === "elite" ? 25 + Math.floor(estimatedMinutes / 20) * 5
                : type === "boss" ? 10 + Math.floor(estimatedMinutes / 20) * 5
                : 15 + Math.floor(estimatedMinutes / 20) * 5} Gold
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleCreate}
        disabled={!title.trim()}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: selectedColors.accent + (title.trim() ? "FF" : "50") },
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Ionicons name="add-circle" size={22} color={COLORS.bg} />
        <Text style={styles.createBtnText}>Add Quest to Board</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleInput: {
    fontFamily: "Cinzel_400Regular",
    fontSize: 18,
    color: COLORS.silver,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  descInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.silver,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    textAlignVertical: "top",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
    alignItems: "flex-start",
  },
  typeName: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 13,
    color: COLORS.silverDim,
  },
  typeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.silverFaint,
  },
  typeTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: COLORS.silverFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.silverFaint,
  },
  timeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeField: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  timeNumberInput: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 32,
    color: COLORS.silver,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    width: "100%",
    textAlign: "center",
  },
  timeUnitLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timeSep: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 30,
    color: COLORS.silverFaint,
    paddingBottom: 20,
  },
  timeConvertNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
  habitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  habitLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.silver,
  },
  habitSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.silverDim,
    marginTop: 2,
  },
  rewardPreview: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.goldDim + "80",
    gap: 10,
  },
  rewardPreviewTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.silverDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rewardPreviewRow: {
    flexDirection: "row",
    gap: 16,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewValue: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 16,
    color: COLORS.gold,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    padding: 18,
  },
  createBtnText: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 16,
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
});
