/**
 * LocationInput Component
 * 
 * Google Places autocomplete with debouncing.
 * - 300ms debounce
 * - Minimum 3 characters
 * - Shows dropdown with results
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import api, { PlaceResult } from '@/services/api';

interface LocationInputProps {
  value: string;
  onSelect: (place: { name: string; lat?: number; lng?: number }) => void;
  onClear: () => void;
}

export default function LocationInput({ value, onSelect, onClear }: LocationInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Don't search if query matches current value (already selected)
    if (query === value && value.length > 0) {
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.ideas.placesAutocomplete(query);
        setResults(response.results);
        setShowDropdown(response.results.length > 0);
      } catch (error) {
        console.log('Places search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  function handleSelect(place: PlaceResult) {
    setQuery(place.name);
    setShowDropdown(false);
    setResults([]);
    onSelect({
      name: place.name,
      lat: place.lat,
      lng: place.lng,
    });
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onClear();
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Search for a place..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={COLORS.textTertiary}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {isSearching && (
          <ActivityIndicator size="small" color={COLORS.primary} />
        )}
        {query.length > 0 && !isSearching && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((place, index) => (
            <TouchableOpacity
              key={place.place_id || index}
              style={[
                styles.dropdownItem,
                index < results.length - 1 && styles.dropdownItemBorder
              ]}
              onPress={() => handleSelect(place)}
            >
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <View style={styles.dropdownItemText}>
                <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownItemText: {
    flex: 1,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  placeAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
