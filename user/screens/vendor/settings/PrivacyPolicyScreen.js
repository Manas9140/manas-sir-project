import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  Lock,
  MapPin,
  EyeOff,
  Database,
  UserCheck,
  CheckCircle2,
  Calendar,
  Building,
} from 'lucide-react-native';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className="flex-1 bg-[#f6f7f8]">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-200/70 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={18} color="#0f1729" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-bold text-[#0f1729]">Partner Privacy Policy</Text>
            <Text className="text-[11px] text-[#6b7280]">GPS tracking, data security & DPDP compliance</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-3"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compliance Hero Card */}
        <View className="bg-[#0f1729] p-3.5 rounded-xl mb-3 shadow-xs">
          <View className="flex-row items-center mb-1.5">
            <Shield size={16} color="#60A5FA" />
            <Text className="text-xs font-bold text-white ml-1.5">
              Digital Personal Data Protection (DPDP) Act 2023 Aligned
            </Text>
          </View>
          <Text className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
            We value your trust and are committed to safeguarding your personal, location, and financial data with bank-grade encryption and complete transparency.
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            <View className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md flex-row items-center">
              <Lock size={10} color="#34D399" />
              <Text className="text-[10px] text-emerald-400 font-medium ml-1">AES-256 Encrypted</Text>
            </View>
            <View className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md flex-row items-center">
              <EyeOff size={10} color="#60A5FA" />
              <Text className="text-[10px] text-blue-300 font-medium ml-1">Zero Third-Party Ad Selling</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Geolocation */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <View className="flex-row items-center mb-2">
            <MapPin size={15} color="#0f1729" />
            <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
              1. Geolocation & Real-Time Tracking
            </Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            1.1 <Text className="font-semibold text-[#0f1729]">Lead Routing:</Text> We collect precise GPS coordinates while your app is in foreground or background exclusively to calculate proximity to customer requests within your operating radius.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            1.2 <Text className="font-semibold text-[#0f1729]">Customer Live ETA:</Text> Once you accept a booking and depart for the customer location, your coordinates are streamed securely to the customer to provide an accurate arrival estimate.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            1.3 <Text className="font-semibold text-[#0f1729]">Instant Opt-Out:</Text> You can turn off GPS lead tracking at any time by switching the "Accepting Jobs" toggle to OFF in your profile screen.
          </Text>
        </View>

        {/* Section 2: Identity & Financial Security */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <View className="flex-row items-center mb-2">
            <Lock size={15} color="#0f1729" />
            <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
              2. Identity, KYC & Payout Details
            </Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            2.1 <Text className="font-semibold text-[#0f1729]">Aadhaar & PAN:</Text> Government identity proofs are stored in isolated encrypted buckets and accessible strictly by authorized risk compliance personnel for fraud prevention.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            2.2 <Text className="font-semibold text-[#0f1729]">Masked Calls:</Text> When you call a customer through the application, a secure virtual bridging number is utilized to keep your personal mobile number confidential.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            2.3 <Text className="font-semibold text-[#0f1729]">UPI & Bank Accounts:</Text> Bank accounts and UPI handles are processed via NPCI-compliant payment gateways. We never store debit card numbers or banking passwords.
          </Text>
        </View>

        {/* Section 3: Data Sharing */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <View className="flex-row items-center mb-2">
            <UserCheck size={15} color="#0f1729" />
            <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
              3. Information Shared with Customers
            </Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            Customers viewing your bid only see:
          </Text>
          <View className="bg-[#f6f7f8] p-2.5 rounded-lg border border-slate-200/60 mb-2 space-y-1 gap-1">
            <Text className="text-[11px] text-[#0f1729] font-medium">• Your Business Name or Technician First Name</Text>
            <Text className="text-[11px] text-[#0f1729] font-medium">• Trade Category, Bio & Star Rating</Text>
            <Text className="text-[11px] text-[#0f1729] font-medium">• Stated Warranty Period & Labor Quote</Text>
            <Text className="text-[11px] text-[#0f1729] font-medium">• Live Distance / ETA during an active job</Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            Your personal residential address, Aadhaar copy, and family details are NEVER shared with customers.
          </Text>
        </View>

        {/* Section 4: Partner Rights & Erasure */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <View className="flex-row items-center mb-2">
            <Database size={15} color="#0f1729" />
            <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
              4. Data Retention & Right to Erasure
            </Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            Under the DPDP Act 2023, you have the right to request a complete export or permanent deletion of your profile data upon terminating your partner association.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            Certain transaction and tax logs are retained for 7 years as required by Indian Income Tax and GST regulations.
          </Text>
        </View>

        {/* Section 5: Grievance Officer */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-4 shadow-xs">
          <View className="flex-row items-center mb-2">
            <Building size={15} color="#0f1729" />
            <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
              5. Grievance Officer & Contact
            </Text>
          </View>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            In accordance with the Information Technology Act 2000 and DPDP Rules, the details of the designated Data Grievance Officer are:
          </Text>
          <View className="bg-[#f6f7f8] p-2.5 rounded-lg border border-slate-200/60">
            <Text className="text-xs font-bold text-[#0f1729]">Data Protection Officer</Text>
            <Text className="text-[11px] text-[#6b7280] mt-0.5">Local Services Technologies Pvt Ltd</Text>
            <Text className="text-[11px] text-blue-600 font-semibold mt-1">privacy@localservices.in</Text>
            <Text className="text-[10px] text-slate-500 mt-0.5">Surat, Gujarat - 395007, India</Text>
          </View>
        </View>

        {/* Trust Footer */}
        <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex-row items-center">
          <CheckCircle2 size={16} color="#059669" />
          <Text className="text-[11px] font-semibold text-emerald-800 ml-2 flex-1">
            Your privacy and safety are continuously monitored by our automated security systems.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
