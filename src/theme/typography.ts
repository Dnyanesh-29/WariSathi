import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  headingLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headingMedium: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
