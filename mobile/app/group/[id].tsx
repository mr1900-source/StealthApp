/**
 * Group Detail Screen
 * 
 * View group info and ideas shared with this group.
 * 
 * Features:
 * - Member list
 * - Ideas feed (filtered to this group)
 * - Add members
 * - Leave/delete group
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import api, { Group, IdeaCard as IdeaCardType, UserSummary } from '@/services/api';
import IdeaCard from '@/components/IdeaCard';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [ideas, setIdeas] = useState<IdeaCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [groupData, ideasData] = await Promise.all([
        api.groups.getById(Number(id)),
        api.feed.getGroupIdeas(Number(id)),
      ]);
      setGroup(groupData);
      setIdeas(ideasData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load group');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const isOwner = group?.created_by === user?.id;
  const memberIds = group?.members.map(m => m.id) || [];

  async function loadFriends() {
    try {
      const data = await api.users.getFriends();
      // Filter out people already in group
      setFriends(data.filter(f => !memberIds.includes(f.id)));
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }

  async function handleAddMember(userId: number) {
    try {
      await api.groups.addMember(Number(id), userId);
      setShowAddMember(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add member');
    }
  }

  async function handleRemoveMember(userId: number) {
    const member = group?.members.find(m => m.id === userId);
    const memberName = member?.name || member?.username || 'this member';
    
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from ${group?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.groups.removeMember(Number(id), userId);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  }

  async function handleLeaveGroup() {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${group?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.groups.removeMember(Number(id), user!.id);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  }

  async function handleDeleteGroup() {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete ${group?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.groups.delete(Number(id));
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete group');
            }
          },
        },
      ]
    );
  }

  function openAddMemberModal() {
    loadFriends();
    setShowAddMember(true);
  }

  const filteredFriends = friends.filter(f =>
    (f.name || f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!group) return null;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: group.name,
          headerRight: () => (
            <TouchableOpacity onPress={isOwner ? handleDeleteGroup : handleLeaveGroup}>
              <Ionicons 
                name={isOwner ? "trash-outline" : "exit-outline"} 
                size={22} 
                color={COLORS.error} 
              />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IdeaCard
            idea={item}
            onPress={() => router.push(`/idea/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Members Section */}
            <View style={styles.membersSection}>
              <View style={styles.membersSectionHeader}>
                <Text style={styles.sectionTitle}>
                  {group.member_count} Member{group.member_count !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity onPress={openAddMemberModal}>
                  <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.membersRow}
              >
                {group.members.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.memberItem}
                    onLongPress={() => {
                      if (isOwner && member.id !== user?.id) {
                        handleRemoveMember(member.id);
                      }
                    }}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {(member.name || member.username || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.id === user?.id ? 'You' : (member.name || member.username)}
                    </Text>
                    {member.id === group.created_by && (
                      <Text style={styles.ownerBadge}>Admin</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Ideas Header */}
            <Text style={styles.ideasTitle}>
              {ideas.length > 0 ? 'Ideas' : 'No ideas yet'}
            </Text>
            {ideas.length === 0 && (
              <Text style={styles.ideasHint}>
                Share an idea with this group to see it here
              </Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Add Member Modal */}
      <Modal
        visible={showAddMember}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddMember(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <TouchableOpacity onPress={() => setShowAddMember(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <ScrollView style={styles.modalContent}>
            {filteredFriends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {friends.length === 0 
                    ? 'All your friends are already in this group'
                    : 'No friends found'
                  }
                </Text>
              </View>
            ) : (
              filteredFriends.map(friend => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendRow}
                  onPress={() => handleAddMember(friend.id)}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {(friend.name || friend.username || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name || friend.username}</Text>
                    {friend.username && friend.name && (
                      <Text style={styles.friendUsername}>@{friend.username}</Text>
                    )}
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  membersSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  membersRow: {
    gap: 16,
  },
  memberItem: {
    alignItems: 'center',
    width: 64,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  memberName: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  ownerBadge: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  ideasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  ideasHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  modal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalDone: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  friendUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
