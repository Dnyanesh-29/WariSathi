import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  headingLarge: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  headingMedium: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  bodyLarge: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
