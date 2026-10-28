import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../src/context/AuthContext';

// Common / Shared Screens
import LoginScreen from '../screens/common/LoginScreen';
import SignupScreen from '../screens/common/SignupScreen';
import LocationSetupScreen from '../screens/common/LocationSetupScreen';
import PaymentOptionsScreen from '../screens/common/PaymentOptionsScreen';
import SafetyPrivacyScreen from '../screens/common/SafetyPrivacyScreen';
import CustomerSupportScreen from '../screens/common/CustomerSupportScreen';

// User / Customer Screens
import CreateRequestScreen from '../screens/user/CreateRequestScreen';
import RequestDetailsScreen from '../screens/user/RequestDetailsScreen';
import ManageAddressesScreen from '../screens/user/ManageAddressesScreen';
import UserChatScreen from '../screens/user/UserChatScreen';
import InvoiceScreen from '../screens/user/InvoiceScreen';

// Vendor Screens & Settings
import VendorOnboardingScreen from '../screens/vendor/VendorOnboardingScreen';
import VendorSettingsNavigator from './VendorSettingsNavigator';
import BusinessDetailsScreen from '../screens/vendor/settings/BusinessDetailsScreen';
import ServicesManagementScreen from '../screens/vendor/settings/ServicesManagementScreen';
import ServiceAreasScreen from '../screens/vendor/settings/ServiceAreasScreen';
import DocumentsVerificationScreen from '../screens/vendor/settings/DocumentsVerificationScreen';
import CustomerCareScreen from '../screens/vendor/settings/CustomerCareScreen';
import HelpAndFaqScreen from '../screens/vendor/settings/HelpAndFaqScreen';
import TermsAndConditionsScreen from '../screens/vendor/settings/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/vendor/settings/PrivacyPolicyScreen';
import VendorChatScreen from '../screens/vendor/VendorChatScreen';
import JobDetailsScreen from '../screens/vendor/JobDetailsScreen';

// Navigators
import BottomTabNavigator from './BottomTabNavigator';
import VendorBottomTabNavigator from './VendorBottomTabNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f7f8' }}>
        <ActivityIndicator size="large" color="#0f1729" />
      </View>
    );
  }

  const isVendor = role === 'vendor' || user?.role === 'vendor';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!token ? (
        /* ================= AUTH STACK ================= */
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="VendorOnboarding" component={VendorOnboardingScreen} />
          <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
        </Stack.Group>
      ) : isVendor ? (
        /* ================= VENDOR / PARTNER STACK ================= */
        <Stack.Group>
          <Stack.Screen name="VendorTabs" component={VendorBottomTabNavigator} />
          <Stack.Screen name="VendorSettings" component={VendorSettingsNavigator} />
          <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
          <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
          <Stack.Screen name="ServiceAreas" component={ServiceAreasScreen} />
          <Stack.Screen name="DocumentsVerification" component={DocumentsVerificationScreen} />
          <Stack.Screen name="CustomerCare" component={CustomerCareScreen} />
          <Stack.Screen name="HelpAndFaq" component={HelpAndFaqScreen} />
          <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="ManageAddresses" component={ManageAddressesScreen} />
          <Stack.Screen name="PaymentOptions" component={PaymentOptionsScreen} />
          <Stack.Screen name="SafetyPrivacy" component={SafetyPrivacyScreen} />
          <Stack.Screen name="CustomerSupport" component={CustomerSupportScreen} />
          <Stack.Screen name="VendorChat" component={VendorChatScreen} />
          <Stack.Screen name="UserChat" component={UserChatScreen} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} />
          <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
        </Stack.Group>
      ) : (
        /* ================= CUSTOMER STACK ================= */
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
          <Stack.Screen name="LocationSetup" component={LocationSetupScreen} />
          <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
          <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
          <Stack.Screen name="ManageAddresses" component={ManageAddressesScreen} />
          <Stack.Screen name="PaymentOptions" component={PaymentOptionsScreen} />
          <Stack.Screen name="SafetyPrivacy" component={SafetyPrivacyScreen} />
          <Stack.Screen name="CustomerSupport" component={CustomerSupportScreen} />
          <Stack.Screen name="VendorOnboarding" component={VendorOnboardingScreen} />
          <Stack.Screen name="UserChat" component={UserChatScreen} />
          <Stack.Screen name="VendorChat" component={VendorChatScreen} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} />
          <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
