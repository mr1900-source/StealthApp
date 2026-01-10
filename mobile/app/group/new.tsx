/**
 * New Group Screen
 * 
 * Create a named, persistent group.
 * Groups are explicit, intentional creations - never auto-created.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import api, { UserSummary } from '@/services/api';

export default function NewGroupScreen() {
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserSummary[]>([]);
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    setIsLoading(true);
    try {
      const data = await api.users.getFriends();
      setFriends(data);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMember(user: UserSummary) {
    const isSelected = selectedMembers.some(m => m.id === user.id);
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => m.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a group name');
      return;
    }

    setIsSaving(true);
    try {
      const group = await api.groups.create(
        name.trim(),
        selectedMembers.map(m => m.id)
      );
      
      Alert.alert('Group Created!', `${group.name} is ready to go`);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsSaving(false);
    }
  }

  const filteredFriends = friends.filter(f =>
    (f.name || f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Group Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., NYC Friends, Hiking Crew..."
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="words"
            autoFocus
          />
        </View>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedRow}
            >
              {selectedMembers.map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.selectedChip}
                  onPress={() => toggleMember(member)}
                >
                  <View style={styles.chipAvatar}>
                    <Text style={styles.chipAvatarText}>
                      {(member.name || member.username || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.chipName}>{member.name || member.username}</Text>
                  <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Add Members */}
        <View style={styles.section}>
          <Text style={styles.label}>Add Members</Text>
          <Text style={styles.labelHint}>You can add more members later</Text>

          {/* Search */}
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

          {/* Friends List */}
          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptyHint}>Add friends from the Profile tab first</Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {filteredFriends.map(friend => {
                const isSelected = selectedMembers.some(m => m.id === friend.id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendRow}
                    onPress={() => toggleMember(friend)}
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
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, isSaving && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: -4,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  selectedRow: {
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    gap: 6,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  chipName: {
    fontSize: 14,
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  loader: {
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  friendsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
