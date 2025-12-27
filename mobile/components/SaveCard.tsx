/**
 * SaveCard Component
 * 
 * Displays a save in the feed or vault.
 * Shows place info, user who saved it, and interest button.
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, radius, shadows, layout } from '@/theme/spacing';
import { Save, CATEGORY_INFO } from '@/types';
import { interestsApi } from '@/services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = spacing.lg;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_MARGIN * 2);

interface SaveCardProps {
  save: Save;
  showUser?: boolean;
  onPress?: () => void;
  onInterestChange?: (interested: boolean) => void;
}

export function SaveCard({ 
  save, 
  showUser = true, 
  onPress,
  onInterestChange,
}: SaveCardProps) {
  const [isInterested, setIsInterested] = useState(save.user_interested);
  const [interestCount, setInterestCount] = useState(save.interest_count);
  const [isLoading, setIsLoading] = useState(false);
  
  const categoryInfo = CATEGORY_INFO[save.category] || CATEGORY_INFO.other;
  
  const handleInterestPress = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (isInterested) {
        await interestsApi.removeInterest(save.id);
        setIsInterested(false);
        setInterestCount(prev => Math.max(0, prev - 1));
        onInterestChange?.(false);
      } else {
        await interestsApi.addInterest(save.id);
        setIsInterested(true);
        setInterestCount(prev => prev + 1);
        onInterestChange?.(true);
      }
    } catch (error) {
      console.error('Failed to update interest:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Header - User info */}
      {showUser && save.user && (
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {save.user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{save.user.username}</Text>
            {save.user.name && (
              <Text style={styles.name}>{save.user.name}</Text>
            )}
          </View>
          <Text style={styles.time}>{formatTimeAgo(save.created_at)}</Text>
        </View>
      )}
      
      {/* Image */}
      {save.image_url ? (
        <Image 
          source={{ uri: save.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: categoryInfo.color + '20' }]}>
          <Ionicons 
            name={categoryInfo.icon as any} 
            size={48} 
            color={categoryInfo.color}
          />
        </View>
      )}
      
      {/* Content */}
      <View style={styles.content}>
        {/* Category badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
          <Ionicons 
            name={categoryInfo.icon as any} 
            size={12} 
            color={categoryInfo.color}
          />
          <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
            {categoryInfo.label}
          </Text>
        </View>
        
        {/* Title and location */}
        <Text style={styles.title}>{save.title}</Text>
        {save.location_name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.location}>{save.location_name}</Text>
          </View>
        )}
        
        {/* Description */}
        {save.description && (
          <Text style={styles.description} numberOfLines={2}>
            "{save.description}"
          </Text>
        )}
        
        {/* Footer - Interest button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.interestButton,
              isInterested && styles.interestButtonActive,
            ]}
            onPress={handleInterestPress}
            disabled={isLoading}
          >
            <Ionicons 
              name={isInterested ? 'flame' : 'flame-outline'} 
              size={18} 
              color={isInterested ? colors.textLight : colors.accent}
            />
            <Text style={[
              styles.interestText,
              isInterested && styles.interestTextActive,
            ]}>
              {isInterested ? "I'm Down" : "I'm Down"}
            </Text>
          </TouchableOpacity>
          
          {interestCount > 0 && (
            <Text style={styles.interestCount}>
              {interestCount} {interestCount === 1 ? 'person' : 'people'} interested
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: CARD_MARGIN,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: layout.avatarSm,
    height: layout.avatarSm,
    borderRadius: layout.avatarSm / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...textStyles.label,
    color: colors.textLight,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  username: {
    ...textStyles.label,
    color: colors.text,
  },
  name: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
  time: {
    ...textStyles.caption,
    color: colors.textTertiary,
  },
  
  // Image
  image: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Content
  content: {
    padding: spacing.lg,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  title: {
    ...textStyles.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  location: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
  },
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  interestButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  interestText: {
    ...textStyles.buttonSmall,
    color: colors.accent,
  },
  interestTextActive: {
    color: colors.textLight,
  },
  interestCount: {
    ...textStyles.caption,
    color: colors.textSecondary,
  },
});

export default SaveCard;
