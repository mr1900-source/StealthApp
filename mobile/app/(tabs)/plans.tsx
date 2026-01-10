/**
 * Plans Tab - Action Center
 * 
 * Not a calendar. Shows:
 * - Upcoming plans
 * - This week
 * - Later
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY_MAP } from '@/constants/config';
import api, { Plan } from '@/services/api';

export default function PlansScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await api.plans.getMyPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadPlans();
    setIsRefreshing(false);
  };

  // Group plans by time period
  const sections = React.useMemo(() => {
    const now = new Date();
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()));
    
    const upcoming: Plan[] = [];
    const thisWeek: Plan[] = [];
    const later: Plan[] = [];
    const past: Plan[] = [];
    
    plans.forEach(plan => {
      const planDate = new Date(plan.date);
      
      if (plan.status === 'completed' || plan.status === 'canceled') {
        past.push(plan);
      } else if (planDate < now) {
        // Past but not marked complete - might need attention
        past.push(plan);
      } else if (planDate <= thisWeekEnd) {
        thisWeek.push(plan);
      } else {
        later.push(plan);
      }
    });
    
    // First upcoming plan gets highlighted
    if (thisWeek.length > 0) {
      upcoming.push(thisWeek.shift()!);
    } else if (later.length > 0) {
      upcoming.push(later.shift()!);
    }
    
    return [
      { title: 'Next Up', data: upcoming },
      { title: 'This Week', data: thisWeek },
      { title: 'Later', data: later },
      { title: 'Past', data: past },
    ].filter(section => section.data.length > 0);
  }, [plans]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, section }) => (
          <PlanCard 
            plan={item} 
            highlighted={section.title === 'Next Up'}
            onPress={() => router.push(`/plan/${item.id}`)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a plan from an idea to get started
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

function PlanCard({ 
  plan, 
  highlighted,
  onPress 
}: { 
  plan: Plan; 
  highlighted?: boolean;
  onPress: () => void;
}) {
  const category = CATEGORY_MAP[plan.idea.category];
  const isPast = plan.status === 'completed' || plan.status === 'canceled';
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.planCard, 
        highlighted && styles.planCardHighlighted,
        isPast && styles.planCardPast,
      ]} 
      onPress={onPress}
    >
      {/* Image */}
      <View style={[styles.planImage, { backgroundColor: category?.color + '20' || COLORS.border }]}>
        {plan.idea.primary_image ? (
          <View style={styles.planImagePlaceholder} />
        ) : (
          <Ionicons 
            name={(category?.icon || 'bookmark') as any} 
            size={24} 
            color={category?.color || COLORS.textSecondary} 
          />
        )}
      </View>
      
      {/* Info */}
      <View style={styles.planInfo}>
        <Text style={[styles.planTitle, isPast && styles.planTitlePast]} numberOfLines={1}>
          {plan.idea.title}
        </Text>
        
        <View style={styles.planMeta}>
          <View style={styles.planMetaItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.planMetaText}>{formatDate(plan.date)}</Text>
          </View>
          {plan.time && (
            <View style={styles.planMetaItem}>
              <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.planMetaText}>{plan.time}</Text>
            </View>
          )}
        </View>
        
        {plan.group && (
          <Text style={styles.planGroup}>{plan.group.name}</Text>
        )}
      </View>
      
      {/* Status badge */}
      {isPast && (
        <View style={[
          styles.statusBadge,
          plan.status === 'completed' ? styles.statusCompleted : styles.statusCanceled
        ]}>
          <Text style={styles.statusText}>
            {plan.status === 'completed' ? 'Done' : 'Canceled'}
          </Text>
        </View>
      )}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  planCardPast: {
    opacity: 0.7,
  },
  planImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  planTitlePast: {
    color: COLORS.textSecondary,
  },
  planMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planMetaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  planGroup: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusCanceled: {
    backgroundColor: COLORS.error + '20',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    textAlign: 'center',
  },
});
