import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Settings & Legal Sub-Pages
import BusinessDetailsScreen from '../screens/vendor/settings/BusinessDetailsScreen';
import ServicesManagementScreen from '../screens/vendor/settings/ServicesManagementScreen';
import ServiceAreasScreen from '../screens/vendor/settings/ServiceAreasScreen';
import DocumentsVerificationScreen from '../screens/vendor/settings/DocumentsVerificationScreen';
import CustomerCareScreen from '../screens/vendor/settings/CustomerCareScreen';
import HelpAndFaqScreen from '../screens/vendor/settings/HelpAndFaqScreen';
import TermsAndConditionsScreen from '../screens/vendor/settings/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/vendor/settings/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();

export default function VendorSettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
      <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
      <Stack.Screen name="ServiceAreas" component={ServiceAreasScreen} />
      <Stack.Screen name="DocumentsVerification" component={DocumentsVerificationScreen} />
      <Stack.Screen name="CustomerCare" component={CustomerCareScreen} />
      <Stack.Screen name="HelpAndFaq" component={HelpAndFaqScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
