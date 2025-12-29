/**
 * New Save Screen
 * 
 * Modal for creating a new save.
 * Supports link parsing and manual entry.
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout, radius } from '@/theme/spacing';
import { Button, Input } from '@/components';
import { savesApi } from '@/services/api';
import { SaveCategory, CATEGORY_INFO, SaveCreate } from '@/types';

const CATEGORIES: SaveCategory[] = ['restaurant', 'bar', 'cafe', 'concert', 'event', 'activity', 'trip', 'other'];

export default function NewSaveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string }>();
  
  const [linkInput, setLinkInput] = useState(params.url || '');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<SaveCreate>({
    title: '',
    description: '',
    category: 'other',
    location_name: '',
  });

  // Parse link if provided
  useEffect(() => {
    if (params.url) {
      handleParseLink(params.url);
    }
  }, [params.url]);

  const updateField = <K extends keyof SaveCreate>(field: K, value: SaveCreate[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParseLink = async (url?: string) => {
    const linkToParse = url || linkInput;
    if (!linkToParse.trim()) return;
    
    Keyboard.dismiss();
    setIsParsing(true);
    
    try {
      const result = await savesApi.parseLink(linkToParse);
      
      console.log('=== RAW API RESULT ===');
      console.log('address:', result.address);
      console.log('location_name:', result.location_name);
      console.log('full result:', JSON.stringify(result, null, 2));

      if (result.success || result.title) {
        setFormData(prev => {
          // Build location string - prefer location_name, then address, then coordinates
          let locationValue = result.location_name || result.address || prev.location_name;
          if (!locationValue && result.location_lat && result.location_lng) {
            locationValue = `📍 ${result.location_lat.toFixed(5)}, ${result.location_lng.toFixed(5)}`;
          }
          
          return {
            ...prev,
            title: result.title || prev.title,
            description: result.description || prev.description,
            category: result.category || prev.category,
            location_name: locationValue,
            address: result.address || prev.address,
            location_lat: result.location_lat || prev.location_lat,
            location_lng: result.location_lng || prev.location_lng,
            source_url: linkToParse,
            source_type: result.source_type,
            image_url: result.image_url || prev.image_url,
          };
        });
      }
      
      if (result.error) {
        Alert.alert('Note', result.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to parse link');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    
    setIsSaving(true);
    
    try {
      await savesApi.createSave(formData);
      router.replace('/vault');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Save</Text>
        <View style={styles.closeButton} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Link input */}
        <View style={styles.linkSection}>
          <Text style={styles.sectionTitle}>Paste a link</Text>
          <View style={styles.linkInputRow}>
            <Input
              placeholder="https://..."
              value={linkInput}
              onChangeText={setLinkInput}
              leftIcon="link-outline"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.linkInput}
            />
          </View>
          <Button
            title={isParsing ? 'Parsing...' : 'Parse Link'}
            onPress={() => handleParseLink()}
            variant="secondary"
            disabled={!linkInput.trim() || isParsing}
            loading={isParsing}
          />
        </View>
        
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or fill manually</Text>
          <View style={styles.dividerLine} />
        </View>
        
        {/* Manual form */}
        <View style={styles.form}>
          <Input
            label="Title *"
            placeholder="What's the place or event?"
            value={formData.title}
            onChangeText={(v) => updateField('title', v)}
            leftIcon="bookmark-outline"
          />
          
          <Input
            label="Location"
            placeholder="Where is it?"
            value={formData.location_name || ''}
            onChangeText={(v) => updateField('location_name', v)}
            leftIcon="location-outline"
          />
          
          <Input
            label="Notes"
            placeholder="Why do you want to go?"
            value={formData.description || ''}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={3}
            leftIcon="chatbubble-outline"
          />
          
          {/* Category selector */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => {
              const info = CATEGORY_INFO[category];
              const isSelected = formData.category === category;
              
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    isSelected && { backgroundColor: info.color, borderColor: info.color },
                  ]}
                  onPress={() => updateField('category', category)}
                >
                  <Ionicons 
                    name={info.icon as any} 
                    size={18} 
                    color={isSelected ? colors.textLight : info.color}
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    { color: isSelected ? colors.textLight : info.color },
                  ]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
      
      {/* Save button */}
      <View style={styles.footer}>
        <Button
          title="Save"
          onPress={handleSave}
          loading={isSaving}
          fullWidth
        />
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.text,
  },
  
  // Content
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  
  // Link section
  linkSection: {
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  linkInputRow: {
    marginBottom: spacing.sm,
  },
  linkInput: {
    flex: 1,
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...textStyles.caption,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },
  
  // Form
  form: {
    paddingBottom: spacing.xxl,
  },
  label: {
    ...textStyles.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryOptionText: {
    ...textStyles.label,
  },
  
  // Footer
  footer: {
    padding: layout.screenPaddingHorizontal,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});