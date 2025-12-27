/**
 * Vault Screen
 * 
 * Shows the user's saved places and ideas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout, radius } from '@/theme/spacing';
import { SaveCard } from '@/components';
import { savesApi } from '@/services/api';
import { Save, SaveCategory, CATEGORY_INFO } from '@/types';

const CATEGORIES: (SaveCategory | 'all')[] = ['all', 'restaurant', 'bar', 'cafe', 'event', 'activity', 'trip'];

export default function VaultScreen() {
  const router = useRouter();
  const [saves, setSaves] = useState<Save[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SaveCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSaves = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    
    try {
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await savesApi.getMySaves(category);
      setSaves(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load saves');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSaves(false);
  };

  const handleSavePress = (save: Save) => {
    router.push(`/save/${save.id}`);
  };

  const handleCategoryPress = (category: SaveCategory | 'all') => {
    setSelectedCategory(category);
  };

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScroll}
      contentContainerStyle={styles.categoryContainer}
    >
      {CATEGORIES.map((category) => {
        const isSelected = category === selectedCategory;
        const info = category === 'all' 
          ? { label: 'All', icon: 'apps', color: colors.primary }
          : CATEGORY_INFO[category];
        
        return (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              isSelected && { backgroundColor: info.color },
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            <Ionicons 
              name={info.icon as any} 
              size={16} 
              color={isSelected ? colors.textLight : info.color}
            />
            <Text style={[
              styles.categoryLabel,
              { color: isSelected ? colors.textLight : info.color },
            ]}>
              {info.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔖</Text>
      <Text style={styles.emptyTitle}>No saves yet</Text>
      <Text style={styles.emptySubtitle}>
        Start saving places you want to visit!
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/save/new')}
      >
        <Ionicons name="add" size={20} color={colors.textLight} />
        <Text style={styles.emptyButtonText}>Add your first save</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Your Vault</Text>
      <Text style={styles.subtitle}>{saves.length} saves</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderCategoryFilter()}
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={saves}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <SaveCard 
              save={item} 
              showUser={false}
              onPress={() => handleSavePress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header
  header: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    ...textStyles.h2,
    color: colors.text,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  
  // Category filter
  categoryScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryContainer: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryLabel: {
    ...textStyles.label,
  },
  
  // List
  listContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    ...textStyles.button,
    color: colors.textLight,
  },
});
