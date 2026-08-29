import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { LangProvider } from './src/context/LangContext';
import './src/locales/i18n';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);

  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const profile = await AsyncStorage.getItem('userProfile');
        if (profile) setIsRegistered(true);
      } catch (e) {
        console.error('Failed to load profile', e);
      } finally {
        setTimeout(() => setIsLoading(false), 1500);
      }
    };
    checkRegistration();
  }, []);

  if (isLoading || !fontsLoaded) return <SplashScreen />;

  return (
    <LangProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        {isRegistered ? (
          <AppNavigator />
        ) : (
          <OnboardingScreen onComplete={() => setIsRegistered(true)} />
        )}
      </GestureHandlerRootView>
    </LangProvider>
  );
}
