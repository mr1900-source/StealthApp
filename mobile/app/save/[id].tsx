/**
 * Save Detail Screen
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';
import { spacing, layout } from '@/theme/spacing';
import { savesApi } from '@/services/api';
import { Save } from '@/types';
import { SaveCard } from '@/components';

export default function SaveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [save, setSave] = useState<Save | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSave();
  }, [id]);

  const loadSave = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const data = await savesApi.getSave(Number(id));
      setSave(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load save');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !save) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Save not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <SaveCard save={save} showUser={true} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...textStyles.body,
    color: colors.error,
    textAlign: 'center',
  },
});