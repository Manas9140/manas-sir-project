import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Inbox, Briefcase, Wallet, User } from 'lucide-react-native';

import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorJobsScreen from '../screens/vendor/VendorJobsScreen';
import VendorEarningsScreen from '../screens/vendor/VendorEarningsScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';

const C = { amber: '#FFB800', ink: '#161A2B', faint: '#98A0B3', line: '#E3E7F0', white: '#FFFFFF' };

const Tab = createBottomTabNavigator();

const TabIcon = ({ Icon, focused }) => (
  <View style={[styles.iconPill, focused && styles.iconPillOn]}>
    <Icon size={20} color={focused ? C.ink : C.faint} strokeWidth={focused ? 2.4 : 2} />
  </View>
);

export default function VendorBottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.faint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.line,
          borderTopWidth: 1,
          height: 64 + bottom,
          paddingBottom: bottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: C.ink,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
      }}
    >
      <Tab.Screen
        name="VendorDashboard"
        component={VendorDashboardScreen}
        options={{
          tabBarLabel: 'Leads',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Inbox} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={VendorJobsScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Briefcase} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={VendorEarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Wallet} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="VendorProfile"
        component={VendorProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconPill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconPillOn: { backgroundColor: C.amber },
});