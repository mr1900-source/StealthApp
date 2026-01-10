/**
 * ShareSelector Component
 * 
 * People-first sharing UI.
 * 
 * "Who should see this?"
 * - Select individuals (friends)
 * - Select groups (shortcuts)
 * - Mix both
 * 
 * No forced group creation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import api, { Group, UserSummary } from '@/services/api';

interface ShareSelectorProps {
  selectedUsers: UserSummary[];
  selectedGroups: Group[];
  onUsersChange: (users: UserSummary[]) => void;
  onGroupsChange: (groups: Group[]) => void;
}

export default function ShareSelector({
  selectedUsers,
  selectedGroups,
  onUsersChange,
  onGroupsChange,
}: ShareSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showModal) {
      loadData();
    }
  }, [showModal]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [friendsData, groupsData] = await Promise.all([
        api.users.getFriends(),
        api.groups.getMyGroups(),
      ]);
      setFriends(friendsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load share options:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleUser(user: UserSummary) {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      onUsersChange(selectedUsers.filter(u => u.id !== user.id));
    } else {
      onUsersChange([...selectedUsers, user]);
    }
  }

  function toggleGroup(group: Group) {
    const isSelected = selectedGroups.some(g => g.id === group.id);
    if (isSelected) {
      onGroupsChange(selectedGroups.filter(g => g.id !== group.id));
    } else {
      onGroupsChange([...selectedGroups, group]);
    }
  }

  function removeUser(userId: number) {
    onUsersChange(selectedUsers.filter(u => u.id !== userId));
  }

  function removeGroup(groupId: number) {
    onGroupsChange(selectedGroups.filter(g => g.id !== groupId));
  }

  const filteredFriends = friends.filter(f => 
    (f.name || f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasSelections = selectedUsers.length > 0 || selectedGroups.length > 0;

  return (
    <View style={styles.container}>
      {/* Selected chips */}
      {hasSelections ? (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.selectedRow}
          contentContainerStyle={styles.selectedContent}
        >
          {selectedGroups.map(group => (
            <View key={`group-${group.id}`} style={styles.selectedChip}>
              <Ionicons name="people" size={14} color={COLORS.primary} />
              <Text style={styles.selectedChipText}>{group.name}</Text>
              <TouchableOpacity onPress={() => removeGroup(group.id)}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {selectedUsers.map(user => (
            <View key={`user-${user.id}`} style={styles.selectedChip}>
              <View style={styles.miniAvatar}>
                <Text style={styles.miniAvatarText}>
                  {(user.name || user.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.selectedChipText}>{user.name || user.username}</Text>
              <TouchableOpacity onPress={() => removeUser(user.id)}>
                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={styles.addMoreButton}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="person-add-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.emptyButtonText}>Add people or groups</Text>
        </TouchableOpacity>
      )}

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Who should see this?</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends or groups..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Groups Section */}
            {filteredGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Groups</Text>
                {filteredGroups.map(group => {
                  const isSelected = selectedGroups.some(g => g.id === group.id);
                  return (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.optionRow}
                      onPress={() => toggleGroup(group)}
                    >
                      <View style={styles.groupIcon}>
                        <Ionicons name="people" size={18} color={COLORS.primary} />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionName}>{group.name}</Text>
                        <Text style={styles.optionMeta}>{group.member_count} members</Text>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Friends Section */}
            {filteredFriends.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friends</Text>
                {filteredFriends.map(friend => {
                  const isSelected = selectedUsers.some(u => u.id === friend.id);
                  return (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.optionRow}
                      onPress={() => toggleUser(friend)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(friend.name || friend.username || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionName}>{friend.name || friend.username}</Text>
                        {friend.username && friend.name && (
                          <Text style={styles.optionMeta}>@{friend.username}</Text>
                        )}
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Empty States */}
            {!isLoading && friends.length === 0 && groups.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No friends or groups yet</Text>
                <Text style={styles.emptyStateHint}>Add friends from the Profile tab</Text>
              </View>
            )}

            {!isLoading && filteredFriends.length === 0 && filteredGroups.length === 0 && searchQuery && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No results for "{searchQuery}"</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  selectedRow: {
    flexDirection: 'row',
  },
  selectedContent: {
    gap: 8,
    paddingVertical: 4,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  addMoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  optionMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyStateHint: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
});
