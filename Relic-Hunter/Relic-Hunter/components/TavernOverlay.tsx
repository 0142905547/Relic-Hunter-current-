import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import COLORS from "@/constants/colors";

const RECOVERY_QUESTS = [
  { id: "r1", icon: "cup-water",        label: "Drink a glass of water",        desc: "Hydration is the simplest form of self-care." },
  { id: "r2", icon: "walk",             label: "Take a 5-minute walk",          desc: "Step away. Let your mind breathe." },
  { id: "r3", icon: "food-apple",       label: "Eat something nourishing",      desc: "A body that is fed is a body that can fight." },
  { id: "r4", icon: "weather-windy",    label: "Take 5 deep breaths",           desc: "Slow the pulse. Reset the mind." },
  { id: "r5", icon: "sleep",            label: "Rest for 20 minutes",           desc: "A short rest is not a defeat. It is strategy." },
  { id: "r6", icon: "music",            label: "Listen to calming music",       desc: "Let the sound rebuild your resolve." },
  { id: "r7", icon: "message-text",     label: "Reach out to a friend",         desc: "You are not alone in the dungeon." },
  { id: "r8", icon: "shower",           label: "Take a quick shower",           desc: "Clean the armor. Face the day again." },
  { id: "r9", icon: "human-handsup",    label: "Stretch for 5 minutes",         desc: "Loosen the body, loosen the mind." },
  { id: "r10",icon: "book-open-variant","label": "Read one page of anything",   desc: "Small acts of mind are still acts of power." },
];

interface TavernOverlayProps {
  onExit: () => void;
}

export function TavernOverlay({ onExit }: TavernOverlayProps) {
  const [checked, setChecked] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExit = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onExit();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2A1A08", "#1A0D02", COLORS.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Tavern header */}
      <View style={styles.tavernHeader}>
        <MaterialCommunityIcons name="glass-mug-variant" size={32} color="#D4891A" />
        <View style={styles.tavernTitleGroup}>
          <Text style={styles.tavernTitle}>The Weary Wanderer Tavern</Text>
          <Text style={styles.tavernSub}>Tactical Retreat — Streaks Paused</Text>
        </View>
      </View>

      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.emerald} />
        <Text style={styles.bannerText}>
          No shame. No Game Over. Rest, recover, and return when you are ready.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Recovery Quests</Text>
      <Text style={styles.sectionSub}>Gentle tasks to help you heal. Tick what you can.</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.listContent}>
        {RECOVERY_QUESTS.map(rq => {
          const done = checked.has(rq.id);
          return (
            <Pressable
              key={rq.id}
              onPress={() => toggle(rq.id)}
              style={({ pressed }) => [
                styles.rqCard,
                done && styles.rqCardDone,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={[styles.rqIcon, done && { backgroundColor: COLORS.emerald + "25" }]}>
                <MaterialCommunityIcons
                  name={rq.icon as any}
                  size={20}
                  color={done ? COLORS.emerald : "#D4891A"}
                />
              </View>
              <View style={styles.rqBody}>
                <Text style={[styles.rqLabel, done && styles.rqLabelDone]}>{rq.label}</Text>
                <Text style={styles.rqDesc}>{rq.desc}</Text>
              </View>
              {done && <Ionicons name="checkmark-circle" size={22} color={COLORS.emerald} />}
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleExit}
          style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={["#A0521A", "#C4720A"]}
            style={styles.exitBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="door-open" size={20} color="#FFF8E8" />
            <Text style={styles.exitText}>Return to the Dungeon</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: "relative" },
  tavernHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tavernTitleGroup: { flex: 1 },
  tavernTitle: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 16,
    color: "#D4891A",
    lineHeight: 22,
  },
  tavernSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#A07040",
    marginTop: 2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.emerald + "12",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.emerald + "30",
  },
  bannerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#9ECFAA",
    flex: 1,
    lineHeight: 18,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontFamily: "Cinzel_600SemiBold",
    fontSize: 14,
    color: "#D4891A",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  sectionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A6040",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 120 },
  rqCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1F1007",
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: "#4A2A0A",
  },
  rqCardDone: {
    borderColor: COLORS.emerald + "40",
    backgroundColor: COLORS.emerald + "08",
  },
  rqIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A1F0A",
    flexShrink: 0,
  },
  rqBody: { flex: 1 },
  rqLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#E8C090",
    lineHeight: 18,
  },
  rqLabelDone: {
    textDecorationLine: "line-through",
    color: COLORS.silverDim,
  },
  rqDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#7A5030",
    marginTop: 2,
    lineHeight: 16,
    fontStyle: "italic",
  },
  exitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  exitBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  exitText: {
    fontFamily: "Cinzel_700Bold",
    fontSize: 15,
    color: "#FFF8E8",
  },
});
