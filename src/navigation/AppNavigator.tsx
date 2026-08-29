import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { HomeTab } from '../screens/Main/HomeTab';
import { IDTab } from '../screens/Main/IDTab';
import { MapTab } from '../screens/Main/MapTab';
import { GroupTab } from '../screens/Main/GroupTab';
import { FirstAidTab } from '../screens/Main/FirstAidTab';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Inline SVG icons so no asset loading issues
const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <Path d="M9 21V12h6v9" />
  </Svg>
);
const IDIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={5} width={18} height={14} rx={2} />
    <Path d="M7 10h4M7 14h6" />
    <Circle cx={16} cy={10} r={2} />
  </Svg>
);
const MapIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2z" />
    <Path d="M9 4v14M15 6v14" />
  </Svg>
);
const UsersIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx={9} cy={7} r={4} />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
const MedicalIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 6v12M6 12h12" />
    <Rect x={3} y={3} width={18} height={18} rx={3} />
  </Svg>
);

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -5 },
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.inactive,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIconStyle: { marginTop: 4 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeTab}
          options={{ tabBarIcon: ({ color }) => <HomeIcon color={color} /> }}
        />
        <Tab.Screen
          name="ID Card"
          component={IDTab}
          options={{ tabBarIcon: ({ color }) => <IDIcon color={color} /> }}
        />
        <Tab.Screen
          name="Map"
          component={MapTab}
          options={{ tabBarIcon: ({ color }) => <MapIcon color={color} /> }}
        />
        <Tab.Screen
          name="Tracker"
          component={GroupTab}
          options={{ tabBarIcon: ({ color }) => <UsersIcon color={color} /> }}
        />
        <Tab.Screen
          name="First Aid"
          component={FirstAidTab}
          options={{ tabBarIcon: ({ color }) => <MedicalIcon color={color} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
