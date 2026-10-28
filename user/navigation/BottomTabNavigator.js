import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home as HomeIcon, LayoutGrid, ClipboardList, UserRound } from 'lucide-react-native';

import HomeScreen from '../screens/user/HomeScreen';
import CategoriesScreen from '../screens/user/CategoriesScreen';
import BookingsScreen from '../screens/user/BookingsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';

/* Design tokens (shared across screens) */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  faint: '#98A0B3',
  line: '#E3E7F0',
  white: '#FFFFFF',
};

const Tab = createBottomTabNavigator();

// Icon sits in a soft indigo pill when its tab is selected
const tabIcon =
  (Icon) =>
  ({ focused, color }) =>
    (
      <View style={[styles.iconPill, focused && styles.iconPillOn]}>
        <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
      </View>
    );

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true, // keeps the bar from riding up over search fields on Android
        tabBarActiveTintColor: C.indigo,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: {
          height: 58 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
          backgroundColor: C.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.line,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: tabIcon(HomeIcon) }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ tabBarLabel: 'Services', tabBarIcon: tabIcon(LayoutGrid) }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ tabBarLabel: 'Bookings', tabBarIcon: tabIcon(ClipboardList) }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Account', tabBarIcon: tabIcon(UserRound) }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillOn: { backgroundColor: C.indigoSoft },
  label: { fontSize: 11.5, fontWeight: '700', marginTop: 3 },
});