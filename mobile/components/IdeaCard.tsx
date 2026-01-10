/**
 * IdeaCard Component
 * 
 * Displays an idea in list/feed views.
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY_MAP, IDEA_STATUS } from '@/constants/config';
import { IdeaCard as IdeaCardType } from '@/services/api';

interface IdeaCardProps {
  idea: IdeaCardType;
  onPress: () => void;
}

export default function IdeaCard({ idea, onPress }: IdeaCardProps) {
  const category = CATEGORY_MAP[idea.category];
  const status = IDEA_STATUS[idea.status];
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Category color bar */}
      <View style={[styles.categoryBar, { backgroundColor: category?.color || COLORS.primary }]} />
      
      {/* Image */}
      {idea.primary_image ? (
        <Image source={{ uri: idea.primary_image }} style={styles.image} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: (category?.color || COLORS.primary) + '15' }]}>
          <Ionicons 
            name={(category?.icon || 'bookmark') as any} 
            size={32} 
            color={category?.color || COLORS.primary} 
          />
        </View>
      )}
      
      {/* Content */}
      <View style={styles.content}>
        {/* Title & Status */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{idea.title}</Text>
          {idea.status !== 'idea' && (
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
        </View>
        
        {/* Location */}
        {idea.location_name && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>{idea.location_name}</Text>
          </View>
        )}
        
        {/* Reactions */}
        <View style={styles.reactionsRow}>
          <ReactionBadge 
            type="interested" 
            count={idea.reactions.interested} 
            active={idea.my_reaction === 'interested'}
          />
          <ReactionBadge 
            type="maybe" 
            count={idea.reactions.maybe} 
            active={idea.my_reaction === 'maybe'}
          />
          <ReactionBadge 
            type="no" 
            count={idea.reactions.no} 
            active={idea.my_reaction === 'no'}
          />
          
          {/* Creator */}
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorText}>
              {idea.creator.name || idea.creator.username}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ReactionBadge({ 
  type, 
  count, 
  active 
}: { 
  type: 'interested' | 'maybe' | 'no'; 
  count: number; 
  active: boolean;
}) {
  if (count === 0 && !active) return null;
  
  const config = {
    interested: { icon: 'heart', color: COLORS.interested, label: '❤️' },
    maybe: { icon: 'help-circle', color: COLORS.maybe, label: '🤔' },
    no: { icon: 'close-circle', color: COLORS.no, label: '✗' },
  };
  
  const { color, label } = config[type];
  
  return (
    <View style={[
      styles.reactionBadge, 
      { backgroundColor: active ? color + '20' : COLORS.surfaceHover }
    ]}>
      <Text style={styles.reactionEmoji}>{label}</Text>
      <Text style={[styles.reactionCount, active && { color }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryBar: {
    height: 3,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.border,
  },
  imagePlaceholder: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  creatorInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  creatorText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
