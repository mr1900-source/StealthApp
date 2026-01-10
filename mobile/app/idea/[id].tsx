/**
 * Idea Detail Screen
 * 
 * View and edit an idea.
 * 
 * Features:
 * - View full idea details
 * - React (interested / maybe / no)
 * - Edit (if owner)
 * - Share to more people
 * - Make a plan
 * - Delete
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORY_MAP, IDEA_STATUS, REACTIONS } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import api, { Idea } from '@/services/api';

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReacting, setIsReacting] = useState(false);

  const loadIdea = async () => {
    try {
      const data = await api.ideas.getById(Number(id));
      setIdea(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load idea');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadIdea();
    }, [id])
  );

  const isOwner = idea?.created_by === user?.id;
  const category = idea ? CATEGORY_MAP[idea.category] : null;
  const status = idea ? IDEA_STATUS[idea.status] : null;

  async function handleReaction(type: 'interested' | 'maybe' | 'no') {
    if (!idea || isReacting) return;

    setIsReacting(true);
    try {
      if (idea.my_reaction === type) {
        // Remove reaction
        await api.ideas.removeReaction(idea.id);
        setIdea({ ...idea, my_reaction: undefined });
      } else {
        // Add/change reaction
        await api.ideas.react(idea.id, type);
        setIdea({ ...idea, my_reaction: type });
      }
      // Reload to get updated counts
      await loadIdea();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to react');
    } finally {
      setIsReacting(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Idea',
      'Are you sure you want to delete this idea? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.ideas.delete(Number(id));
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  }

  function handleMakePlan() {
    router.push({
      pathname: '/plan/new',
      params: { ideaId: id },
    });
  }

  function handleOpenLink() {
    if (idea?.source_link) {
      Linking.openURL(idea.source_link);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!idea) {
    return null;
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: '',
          headerRight: () => isOwner ? (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            </TouchableOpacity>
          ) : null,
        }}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Image */}
        {idea.images && idea.images.length > 0 ? (
          <Image source={{ uri: idea.images[0].url }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: (category?.color || COLORS.primary) + '15' }]}>
            <Ionicons 
              name={(category?.icon || 'bookmark') as any} 
              size={48} 
              color={category?.color || COLORS.primary} 
            />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: category?.color + '20' }]}>
              <Ionicons name={(category?.icon || 'bookmark') as any} size={14} color={category?.color} />
              <Text style={[styles.categoryText, { color: category?.color }]}>{category?.label}</Text>
            </View>
            {status && idea.status !== 'idea' && (
              <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{idea.title}</Text>

          {/* Creator */}
          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>
                {(idea.creator.name || idea.creator.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.creatorName}>
              {isOwner ? 'You' : idea.creator.name || idea.creator.username}
            </Text>
            <Text style={styles.createdAt}>
              · {new Date(idea.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Location */}
        {idea.location_name && (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{idea.location_name}</Text>
            </View>
          </View>
        )}

        {/* Link */}
        {idea.source_link && (
          <TouchableOpacity style={styles.linkButton} onPress={handleOpenLink}>
            <Ionicons name="link-outline" size={18} color={COLORS.primary} />
            <Text style={styles.linkText} numberOfLines={1}>
              {new URL(idea.source_link).hostname}
            </Text>
            <Ionicons name="open-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Notes */}
        {idea.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{idea.notes}</Text>
          </View>
        )}

        {/* Reactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reactions</Text>
          <View style={styles.reactionsRow}>
            {(['interested', 'maybe', 'no'] as const).map((type) => {
              const config = REACTIONS[type];
              const count = idea.reactions[type];
              const isActive = idea.my_reaction === type;
              
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.reactionButton,
                    isActive && { backgroundColor: config.color + '20', borderColor: config.color }
                  ]}
                  onPress={() => handleReaction(type)}
                  disabled={isReacting}
                >
                  <Text style={styles.reactionEmoji}>
                    {type === 'interested' ? '❤️' : type === 'maybe' ? '🤔' : '✗'}
                  </Text>
                  <Text style={[
                    styles.reactionLabel,
                    isActive && { color: config.color, fontWeight: '600' }
                  ]}>
                    {config.label}
                  </Text>
                  {count > 0 && (
                    <Text style={[styles.reactionCount, isActive && { color: config.color }]}>
                      {count}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Shared With */}
        {idea.audience_count > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Shared with {idea.audience_count - 1} {idea.audience_count === 2 ? 'person' : 'people'}
            </Text>
            {idea.shared_groups.length > 0 && (
              <View style={styles.sharedGroups}>
                {idea.shared_groups.map(group => (
                  <View key={group.id} style={styles.groupChip}>
                    <Ionicons name="people" size={14} color={COLORS.primary} />
                    <Text style={styles.groupChipText}>{group.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {idea.status === 'idea' && (
          <TouchableOpacity style={styles.planButton} onPress={handleMakePlan}>
            <Ionicons name="calendar-outline" size={20} color="#FFF" />
            <Text style={styles.planButtonText}>Make a Plan</Text>
          </TouchableOpacity>
        )}
        {idea.status === 'planned' && (
          <View style={styles.plannedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.warning} />
            <Text style={styles.plannedText}>Plan in progress</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.border,
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  creatorAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  createdAt: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
  },
  notesText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sharedGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  groupChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  planButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  plannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  plannedText: {
    fontSize: 16,
    color: COLORS.warning,
    fontWeight: '500',
  },
});
