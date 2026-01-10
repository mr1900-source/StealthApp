/**
 * Groups Tab
 * 
 * List of user's groups.
 * Groups are named, persistent shortcuts to audiences.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import api, { Group } from '@/services/api';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadGroups = async () => {
    try {
      const data = await api.groups.getMyGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadGroups();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Create group button */}
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => router.push('/group/new')}
      >
        <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        <Text style={styles.createButtonText}>Create New Group</Text>
      </TouchableOpacity>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <GroupCard 
            group={item} 
            onPress={() => router.push(`/group/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a group to share ideas with friends
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

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress}>
      {/* Cover image or placeholder */}
      <View style={styles.groupCover}>
        {group.cover_image ? (
          <View style={styles.coverImage} />
        ) : (
          <Ionicons name="people" size={24} color={COLORS.primary} />
        )}
      </View>
      
      {/* Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        
        {/* Member avatars */}
        <View style={styles.memberRow}>
          {group.members.slice(0, 4).map((member, index) => (
            <View 
              key={member.id} 
              style={[styles.memberAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
            >
              <Text style={styles.memberAvatarText}>
                {(member.name || member.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          ))}
          {group.member_count > 4 && (
            <View style={[styles.memberAvatar, styles.memberMore, { marginLeft: -8 }]}>
              <Text style={styles.memberMoreText}>+{group.member_count - 4}</Text>
            </View>
          )}
          <Text style={styles.memberCount}>
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  groupCover: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  memberAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  memberMore: {
    backgroundColor: COLORS.border,
  },
  memberMoreText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  memberCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
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
