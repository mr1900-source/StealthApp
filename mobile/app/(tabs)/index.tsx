/**
 * Ideas Tab - Home Feed
 * 
 * Personal repository of inspiration.
 * Shows all ideas user created or is in audience for.
 * 
 * Filters: All, Shared with me, By group
 * Category filters
 * Map toggle (future)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES } from '@/constants/config';
import api, { IdeaCard as IdeaCardType, Group } from '@/services/api';
import IdeaCard from '@/components/IdeaCard';

type FilterType = 'all' | 'shared_with_me' | 'group';

export default function IdeasScreen() {
  const [ideas, setIdeas] = useState<IdeaCardType[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // Load groups for filter dropdown
      const groupsData = await api.groups.getMyGroups();
      setGroups(groupsData);
      
      // Load feed based on filters
      const feedData = await api.feed.getHomeFeed({
        filter_type: filterType,
        group_id: filterType === 'group' ? selectedGroupId || undefined : undefined,
        category: selectedCategory || undefined,
      });
      setIdeas(feedData.ideas);
    } catch (error) {
      console.error('Failed to load ideas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [filterType, selectedGroupId, selectedCategory])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Main filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <FilterChip 
          label="All" 
          active={filterType === 'all'} 
          onPress={() => { setFilterType('all'); setSelectedGroupId(null); }} 
        />
        <FilterChip 
          label="Shared with me" 
          active={filterType === 'shared_with_me'} 
          onPress={() => { setFilterType('shared_with_me'); setSelectedGroupId(null); }} 
        />
        {groups.map(group => (
          <FilterChip
            key={group.id}
            label={group.name}
            active={filterType === 'group' && selectedGroupId === group.id}
            onPress={() => { setFilterType('group'); setSelectedGroupId(group.id); }}
          />
        ))}
      </ScrollView>
      
      {/* Category filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={styles.filterContent}
      >
        <CategoryChip 
          label="All" 
          active={selectedCategory === null} 
          onPress={() => setSelectedCategory(null)} 
        />
        {CATEGORIES.map(cat => (
          <CategoryChip
            key={cat.id}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            active={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ideas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IdeaCard 
            idea={item} 
            onPress={() => router.push(`/idea/${item.id}`)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No ideas yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to save your first idea
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

function FilterChip({ 
  label, 
  active, 
  onPress 
}: { 
  label: string; 
  active: boolean; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CategoryChip({ 
  label, 
  icon,
  color,
  active, 
  onPress 
}: { 
  label: string;
  icon?: string;
  color?: string;
  active: boolean; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryChip, 
        active && { backgroundColor: color || COLORS.primary, borderColor: color || COLORS.primary }
      ]}
      onPress={onPress}
    >
      {icon && (
        <Ionicons 
          name={icon as any} 
          size={14} 
          color={active ? '#FFF' : color || COLORS.textSecondary} 
        />
      )}
      <Text style={[
        styles.categoryChipText, 
        active && styles.categoryChipTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
  },
  header: {
    paddingBottom: 8,
  },
  filterRow: {
    marginBottom: 8,
  },
  categoryRow: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    gap: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
