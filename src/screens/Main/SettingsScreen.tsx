import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/CustomText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

export const SettingsScreen = ({ navigation }: any) => {
  const handleClear = async () => {
    await AsyncStorage.clear();
    // Restart app or trigger reload in a real scenario
  };

  return (
    <View style={styles.container}>
      <Text style={Typography.headingLarge}>Settings</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Change Language</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Emergency Contact</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: Colors.danger, marginTop: 40 }]} onPress={handleClear}>
        <Text style={styles.buttonText}>Reset App Data (Debug)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  button: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: { color: Colors.textPrimary, fontSize: 16, fontWeight: 'bold' }
});
