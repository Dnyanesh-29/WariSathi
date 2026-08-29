import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../../components/CustomText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';
import { Feather } from '@expo/vector-icons';
import MapLibreGL from '../../lib/maplibre';

export const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    dindi: '',
    bloodGroup: '',
    emergencyName: '',
    emergencyPhone: '',
    medical: ''
  });

  const handleRegister = async () => {
    if (!formData.name || !formData.emergencyPhone) return;
    setLoading(true);
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(formData));
      
      // Trigger offline map download for the route (Alandi to Pandharpur)
      if (MapLibreGL) {
        try {
          await MapLibreGL.offlineManager.createPack({
            name: 'wari-route-pack',
            styleURL: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
            bounds: [[73.5, 17.5], [75.5, 19.0]], // [neLng, neLat], [swLng, swLat] -> wait, it's [ne, sw]
            minZoom: 9,
            maxZoom: 13,
          });
        } catch (e) {
          console.warn('Map offline pack creation failed (might already exist or not supported):', e);
        }
      }

      onComplete();
    } catch (e) {
      console.error('Failed to save profile', e);
      setLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.langContainer}>
        <TouchableOpacity style={[styles.langBtn, i18n.language === 'mr' && styles.langBtnActive]} onPress={() => changeLanguage('mr')}>
          <Text style={[styles.langText, i18n.language === 'mr' && styles.langTextActive]}>मराठी</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, i18n.language === 'hi' && styles.langBtnActive]} onPress={() => changeLanguage('hi')}>
          <Text style={[styles.langText, i18n.language === 'hi' && styles.langTextActive]}>हिंदी</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langBtn, i18n.language === 'en' && styles.langBtnActive]} onPress={() => changeLanguage('en')}>
          <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Feather name="map" size={48} color={Colors.surface} style={{ marginBottom: 12 }} />
        <Text style={[Typography.headingLarge, { color: Colors.surface }]}>{t('welcome')}</Text>
        <Text style={[Typography.bodyMedium, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8 }]}>{t('tagline')}</Text>
      </View>
      
      <View style={styles.formContainer}>
        <View style={styles.inputWrapper}>
          <Feather name="user" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('fullName')}
            placeholderTextColor={Colors.textSecondary}
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="users" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('dindiName')}
            placeholderTextColor={Colors.textSecondary}
            value={formData.dindi}
            onChangeText={(text) => setFormData({...formData, dindi: text})}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="droplet" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Blood Group (A+, O-, etc)"
            placeholderTextColor={Colors.textSecondary}
            value={formData.bloodGroup}
            onChangeText={(text) => setFormData({...formData, bloodGroup: text})}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="heart" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('emergencyContactName')}
            placeholderTextColor={Colors.textSecondary}
            value={formData.emergencyName}
            onChangeText={(text) => setFormData({...formData, emergencyName: text})}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Feather name="phone" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('emergencyContactPhone')}
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textSecondary}
            value={formData.emergencyPhone}
            onChangeText={(text) => setFormData({...formData, emergencyPhone: text})}
          />
        </View>

        <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
          <Feather name="alert-circle" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { height: 80, paddingTop: 0 }]}
            placeholder={t('medicalConditions')}
            placeholderTextColor={Colors.textSecondary}
            multiline
            value={formData.medical}
            onChangeText={(text) => setFormData({...formData, medical: text})}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, (!formData.name || !formData.emergencyPhone) && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={!formData.name || !formData.emergencyPhone || loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.buttonText}>{t('register')} & Download Map</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    backgroundColor: Colors.primary, 
  },
  langContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  langBtnActive: {
    backgroundColor: Colors.surface,
  },
  langText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  langTextActive: {
    color: Colors.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 40,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
