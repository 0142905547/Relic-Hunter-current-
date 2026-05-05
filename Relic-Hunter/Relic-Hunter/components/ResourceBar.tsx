import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import COLORS from "@/constants/colors";

interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  icon?: React.ReactNode;
}

export function ResourceBar({ label, current, max, color, icon }: ResourceBarProps) {
  const progress = useSharedValue(current / max);

  useEffect(() => {
    progress.value = withTiming(current / max, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
  }, [current, max]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pct = Math.round((current / max) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{current}/{max}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, barStyle]} />
        <View style={[styles.glow, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: COLORS.silverDim,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  track: {
    height: 6,
    backgroundColor: COLORS.bgMuted,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    borderRadius: 3,
  },
});
