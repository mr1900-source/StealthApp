/**
 * Plan Detail Screen - Placeholder
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/config';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Plan Detail</Text>
      <Text style={styles.subtext}>ID: {id}</Text>
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
