/**
 * New Idea Screen
 * 
 * THE MOST IMPORTANT FLOW
 * 
 * Step 1: Capture - Auto-detect link, pull title/image/location
 * Step 2: Light Confirmation - Edit title, select category, choose who sees it
 * Step 3: Save - Instant feedback
 * 
 * No long forms. Ever.
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CATEGORIES } from '@/constants/config';
import api, { Group, UserSummary } from '@/services/api';
import CategoryPicker from '@/components/CategoryPicker';
import LocationInput from '@/components/LocationInput';
import ShareSelector from '@/components/ShareSelector';

export default function NewIdeaScreen() {
  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sourceLink, setSourceLink] = useState('');
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLng, setLocationLng] = useState<number | undefined>();
  const [images, setImages] = useState<string[]>([]);
  
  // Sharing state
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  
  // UI state
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [linkParsed, setLinkParsed] = useState(false);

  // Auto-parse link when pasted
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceLink && !linkParsed && isValidUrl(sourceLink)) {
        parseLink();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [sourceLink]);

  function isValidUrl(string: string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function parseLink() {
    if (!sourceLink || isParsing) return;
    
    setIsParsing(true);
    try {
      const result = await api.ideas.parseLink(sourceLink);
      
      if (result.success) {
        if (result.title && !title) {
          setTitle(result.title);
        }
        if (result.images && result.images.length > 0) {
          setImages(result.images);
        }
        if (result.location_hint && !locationName) {
          setLocationName(result.location_hint);
        }
        setLinkParsed(true);
      }
    } catch (error) {
      console.log('Link parsing failed:', error);
      // Silent fail - user can still manually enter details
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSave() {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your idea');
      return;
    }
    if (!category) {
      Alert.alert('Missing Category', 'Please select a category');
      return;
    }

    setIsSaving(true);
    try {
      await api.ideas.create({
        title: title.trim(),
        category,
        source_link: sourceLink || undefined,
        notes: notes || undefined,
        location_name: locationName || undefined,
        location_lat: locationLat,
        location_lng: locationLng,
        images: images.length > 0 ? images : undefined,
        share_with_user_ids: selectedUsers.map(u => u.id),
        share_with_group_ids: selectedGroups.map(g => g.id),
      });

      // Success feedback
      const sharedWith = [...selectedUsers, ...selectedGroups];
      if (sharedWith.length > 0) {
        const names = sharedWith.slice(0, 2).map(s => 'name' in s ? s.name : s.name).join(', ');
        Alert.alert('Saved!', `Shared with ${names}${sharedWith.length > 2 ? ` and ${sharedWith.length - 2} more` : ''}`);
      }

      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save idea');
    } finally {
      setIsSaving(false);
    }
  }

  function handleLocationSelect(place: { name: string; lat?: number; lng?: number }) {
    setLocationName(place.name);
    setLocationLat(place.lat);
    setLocationLng(place.lng);
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Link Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Paste a link (optional)</Text>
          <View style={styles.linkInputContainer}>
            <TextInput
              style={styles.linkInput}
              placeholder="https://..."
              value={sourceLink}
              onChangeText={(text) => {
                setSourceLink(text);
                setLinkParsed(false);
              }}
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {isParsing && (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.linkSpinner} />
            )}
            {linkParsed && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={styles.linkSpinner} />
            )}
          </View>
        </View>

        {/* Preview Image */}
        {images.length > 0 && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: images[0] }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImage}
              onPress={() => setImages([])}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What's the idea?"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="sentences"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <CategoryPicker
            selected={category}
            onSelect={setCategory}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location (optional)</Text>
          <LocationInput
            value={locationName}
            onSelect={handleLocationSelect}
            onClear={() => {
              setLocationName('');
              setLocationLat(undefined);
              setLocationLng(undefined);
            }}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any details to remember..."
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Share With */}
        <View style={styles.section}>
          <Text style={styles.label}>Share with</Text>
          <Text style={styles.labelHint}>Leave empty to keep private</Text>
          <ShareSelector
            selectedUsers={selectedUsers}
            selectedGroups={selectedGroups}
            onUsersChange={setSelectedUsers}
            onGroupsChange={setSelectedGroups}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Idea</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 20,
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
    marginBottom: 8,
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
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  linkInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  linkSpinner: {
    marginRight: 12,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePreview: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.border,
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
