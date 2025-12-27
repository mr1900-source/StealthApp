/**
 * Feed Screen
 * 
 * Shows saves from friends.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout } from '@/theme/spacing';
import { SaveCard } from '@/components';
import { friendsApi } from '@/services/api';
import { Save } from '@/types';
import { APP_CONFIG } from '@/constants/app.config';

export default function FeedScreen() {
  const router = useRouter();
  const [saves, setSaves] = useState<Save[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    
    try {
      const feed = await friendsApi.getFeed();
      setSaves(feed);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeed(false);
  };

  const handleSavePress = (save: Save) => {
    router.push(`/save/${save.id}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>👀</Text>
      <Text style={styles.emptyTitle}>Your feed is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add friends to see what they're saving!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.logo}>{APP_CONFIG.name}</Text>
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={saves}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <SaveCard 
            save={item} 
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
  logo: {
    ...textStyles.h2,
    color: colors.primary,
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
  },
});
