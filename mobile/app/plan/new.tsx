/**
 * New Plan Screen - Placeholder
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/config';

export default function NewPlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Make a Plan</Text>
      <Text style={styles.subtext}>Coming in Step 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
