/**
 * Matches Screen
 * 
 * Shows saves where the user and friends are both interested.
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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout, radius, shadows } from '@/theme/spacing';
import { interestsApi } from '@/services/api';
import { Match, CATEGORY_INFO } from '@/types';

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    
    try {
      const data = await interestsApi.getMatches();
      setMatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMatches(false);
  };

  const handleMatchPress = (match: Match) => {
    router.push(`/save/${match.save.id}`);
  };

  const renderMatchCard = ({ item }: { item: Match }) => {
    const { save, interested_friends, total_interested } = item;
    const categoryInfo = CATEGORY_INFO[save.category] || CATEGORY_INFO.other;
    
    return (
      <TouchableOpacity 
        style={styles.matchCard}
        onPress={() => handleMatchPress(item)}
        activeOpacity={0.95}
      >
        {/* Image */}
        {save.image_url ? (
          <Image 
            source={{ uri: save.image_url }}
            style={styles.matchImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.matchImagePlaceholder, { backgroundColor: categoryInfo.color + '20' }]}>
            <Ionicons 
              name={categoryInfo.icon as any} 
              size={32} 
              color={categoryInfo.color}
            />
          </View>
        )}
        
        {/* Content */}
        <View style={styles.matchContent}>
          <Text style={styles.matchTitle}>{save.title}</Text>
          {save.location_name && (
            <Text style={styles.matchLocation}>{save.location_name}</Text>
          )}
          
          {/* Friends interested */}
          <View style={styles.friendsRow}>
            <View style={styles.avatarStack}>
              {interested_friends.slice(0, 3).map((friend, index) => (
                <View 
                  key={friend.id} 
                  style={[styles.stackedAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                >
                  <Text style={styles.stackedAvatarText}>
                    {friend.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.friendsText}>
              {interested_friends.map(f => f.name || f.username).slice(0, 2).join(', ')}
              {interested_friends.length > 2 && ` +${interested_friends.length - 2}`}
            </Text>
          </View>
        </View>
        
        {/* Fire indicator */}
        <View style={styles.fireIndicator}>
          <Ionicons name="flame" size={20} color={colors.accent} />
          <Text style={styles.fireCount}>{total_interested}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔥</Text>
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySubtitle}>
        When you and friends are both interested in the same thing, it'll show up here!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Matches</Text>
      <Text style={styles.subtitle}>Plans waiting to happen</Text>
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
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.save.id.toString()}
          renderItem={renderMatchCard}
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  
  // List
  listContent: {
    padding: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  
  // Match card
  matchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  matchImage: {
    width: 100,
    height: 100,
  },
  matchImagePlaceholder: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  matchTitle: {
    ...textStyles.label,
    color: colors.text,
    fontSize: 15,
  },
  matchLocation: {
    ...textStyles.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: spacing.sm,
  },
  stackedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  stackedAvatarText: {
    ...textStyles.caption,
    color: colors.textLight,
    fontWeight: '600',
    fontSize: 10,
  },
  friendsText: {
    ...textStyles.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  fireIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentTransparent,
  },
  fireCount: {
    ...textStyles.caption,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  },
});
