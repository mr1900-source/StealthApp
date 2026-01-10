/**
 * CategoryPicker Component
 * 
 * Horizontal scrollable category selector with icons.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES } from '@/constants/config';

interface CategoryPickerProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              isSelected && { backgroundColor: cat.color, borderColor: cat.color }
            ]}
            onPress={() => onSelect(cat.id)}
          >
            <Ionicons 
              name={cat.icon as any} 
              size={18} 
              color={isSelected ? '#FFF' : cat.color} 
            />
            <Text style={[
              styles.chipText,
              isSelected && styles.chipTextSelected
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#FFF',
  },
});
