/**
 * Profile Tab
 * 
 * Identity & Memory:
 * - Profile info
 * - Friends (with Add Friend)
 * - Stats
 * - Settings
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import api, { UserSummary } from '@/services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [friends, setFriends] = useState<UserSummary[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ ideas: 0, plans: 0, groups: 0 });
  
  // Add Friend Modal
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingSent, setPendingSent] = useState<number[]>([]);

  const loadData = async () => {
    try {
      const [friendsData, requestsData, ideasData, plansData, groupsData] = await Promise.all([
        api.users.getFriends(),
        api.users.getFriendRequests(),
        api.ideas.getMyIdeas(),
        api.plans.getMyPlans(),
        api.groups.getMyGroups(),
      ]);
      
      setFriends(friendsData);
      setFriendRequests(requestsData);
      setStats({
        ideas: ideasData.length,
        plans: plansData.filter(p => p.status === 'completed').length,
        groups: groupsData.length,
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        }
      },
    ]);
  };

  const acceptFriendRequest = async (friendshipId: number) => {
    try {
      await api.users.acceptFriendRequest(friendshipId);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const removeFriend = async (friendId: number) => {
    const friend = friends.find(f => f.id === friendId);
    Alert.alert(
      'Remove Friend',
      `Remove ${friend?.name || friend?.username} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.users.removeFriend(friendId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  // Search for users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.users.search(query);
      // Filter out existing friends
      const friendIds = friends.map(f => f.id);
      setSearchResults(results.filter(r => !friendIds.includes(r.id)));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (username: string, userId: number) => {
    try {
      await api.users.sendFriendRequest(username);
      setPendingSent([...pendingSent, userId]);
      Alert.alert('Request Sent!', `Friend request sent to @${username}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    }
  };

  const openAddFriend = () => {
    setSearchQuery('');
    setSearchResults([]);
    setPendingSent([]);
    setShowAddFriend(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || user?.username || 'User'}</Text>
        {user?.username && <Text style={styles.username}>@{user.username}</Text>}
        {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.ideas}</Text>
          <Text style={styles.statLabel}>Ideas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.plans}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.groups}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
      </View>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Requests</Text>
          {friendRequests.map(request => (
            <View key={request.id} style={styles.friendRequestCard}>
              <View style={styles.friendRequestAvatar}>
                <Text style={styles.friendRequestAvatarText}>
                  {(request.user.name || request.user.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.friendRequestInfo}>
                <Text style={styles.friendRequestName}>
                  {request.user.name || request.user.username}
                </Text>
                {request.user.username && request.user.name && (
                  <Text style={styles.friendRequestUsername}>@{request.user.username}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => acceptFriendRequest(request.id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Friends */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
          <TouchableOpacity onPress={openAddFriend}>
            <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        {friends.length > 0 ? (
          <View style={styles.friendsList}>
            {friends.map(friend => (
              <TouchableOpacity 
                key={friend.id} 
                style={styles.friendItem}
                onLongPress={() => removeFriend(friend.id)}
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
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyFriends} onPress={openAddFriend}>
            <Ionicons name="people-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptyHint}>Tap to add friends</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingsItem}>
          <Ionicons name="person-outline" size={20} color={COLORS.text} />
          <Text style={styles.settingsItemText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingsItem}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
          <Text style={styles.settingsItemText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={[styles.settingsItemText, { color: COLORS.error }]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriend}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddFriend(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <TouchableOpacity onPress={() => setShowAddFriend(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or name..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              autoFocus
            />
            {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          <ScrollView style={styles.modalContent}>
            {searchQuery.length < 2 ? (
              <View style={styles.searchHint}>
                <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.searchHintText}>
                  Search for friends by their username or name
                </Text>
              </View>
            ) : searchResults.length === 0 && !isSearching ? (
              <View style={styles.searchHint}>
                <Text style={styles.searchHintText}>No users found</Text>
              </View>
            ) : (
              searchResults.map(result => {
                const isPending = pendingSent.includes(result.id);
                return (
                  <View key={result.id} style={styles.searchResultRow}>
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>
                        {(result.name || result.username || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {result.name || result.username}
                      </Text>
                      {result.username && (
                        <Text style={styles.searchResultUsername}>@{result.username}</Text>
                      )}
                    </View>
                    {isPending ? (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => sendFriendRequest(result.username!, result.id)}
                        disabled={!result.username}
                      >
                        <Ionicons name="person-add" size={18} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  username: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  friendRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  friendRequestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendRequestAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  friendRequestInfo: {
    flex: 1,
  },
  friendRequestName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  friendRequestUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  friendsList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  friendItem: {
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
  emptyFriends: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  // Modal styles
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
  searchHint: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  searchHintText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  searchResultUsername: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.border,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
