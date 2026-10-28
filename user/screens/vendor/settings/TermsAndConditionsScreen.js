import React, { useState } from 'react';
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
  FileText,
  ShieldCheck,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';

const SECTIONS = [
  { id: 'sec-1', title: '1. Partner Eligibility & Onboarding' },
  { id: 'sec-2', title: '2. Bidding & Job Acceptance' },
  { id: 'sec-3', title: '3. Platform Commission & Payouts' },
  { id: 'sec-4', title: '4. Quality & Warranty Obligations' },
  { id: 'sec-5', title: '5. Zero Circumvention Policy' },
  { id: 'sec-6', title: '6. Account Suspension & Terms' },
];

export default function TermsAndConditionsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('sec-1');

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
            <Text className="text-base font-bold text-[#0f1729]">Partner Terms of Service</Text>
            <Text className="text-[11px] text-[#6b7280]">Service agreements & payout policies</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-3"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Version Badge & Info */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <Scale size={15} color="#0f1729" />
              <Text className="text-xs font-bold text-[#0f1729] ml-1.5">
                Local Services Partner Master Agreement
              </Text>
            </View>
            <View className="bg-slate-100 px-2 py-0.5 rounded">
              <Text className="text-[10px] font-bold text-[#0f1729]">Version 2.4</Text>
            </View>
          </View>
          <Text className="text-[11px] text-[#6b7280] leading-relaxed">
            By operating as a registered Service Partner on this platform, you agree to adhere to these operating bylaws, customer protection standards, and statutory guidelines.
          </Text>
          <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <Calendar size={12} color="#9ca3af" />
            <Text className="text-[10px] text-slate-500 font-medium">
              Last updated: October 2026 • Governing Law: Republic of India
            </Text>
          </View>
        </View>

        {/* Legal Clause 1 */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <Text className="text-xs font-bold text-[#0f1729] mb-1.5">
            1. Partner Eligibility & KYC Obligations
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            1.1 Every technician or vendor business partner must be at least 18 years old and legally competent to enter into business contracts in India.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            1.2 Valid government-issued Aadhaar and PAN documents must be maintained on record. In cases of commercial electrical, plumbing, or appliance works, valid trade licenses or technical certifications must be provided upon request.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            1.3 Any impersonation or forwarding of job leads to unverified third parties without platform authorization will result in immediate termination of the partner account.
          </Text>
        </View>

        {/* Legal Clause 2 */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <Text className="text-xs font-bold text-[#0f1729] mb-1.5">
            2. Bids, Acceptance & Service Protocol
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            2.1 Placing a bid constitutes a binding commitment to attend to the customer within the agreed time window and at the specified labor quote.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            2.2 Partners must arrive in clean, professional attire with standard toolkits and safety gear.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            2.3 The 4-digit start OTP provided by the customer must be entered into the app prior to initiating any repair or inspection work.
          </Text>
        </View>

        {/* Legal Clause 3: Payouts */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <Text className="text-xs font-bold text-[#0f1729] mb-1.5">
            3. Commission, Taxation & Payout Settlements
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            3.1 The platform deducts a standard transparent facilitation commission (10% to 15%) strictly from labor service fees.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            3.2 Zero commission is deducted on legitimate spare parts or hardware materials purchased with authentic retail invoices shown to the customer.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            3.3 All digital customer payments are transferred via daily automated batch cycles directly to the partner’s registered UPI ID or IMPS bank account (T+0 or T+1).
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            3.4 Statutory TDS deductions under Section 194M of the Income Tax Act are remitted automatically against the partner’s verified PAN.
          </Text>
        </View>

        {/* Legal Clause 4: Warranty */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
          <Text className="text-xs font-bold text-[#0f1729] mb-1.5">
            4. Service Warranty & Re-Service Guarantee
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            4.1 Partners agree to honor the stated warranty period (minimum 15 to 30 days) on labor workmanship.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            4.2 In the event of a recurrence of the exact reported defect within the warranty window, the partner agrees to provide a prompt, complimentary re-inspection without charging additional visiting fees.
          </Text>
        </View>

        {/* Warning Callout Clause 5 */}
        <View className="bg-red-50 border border-red-200 p-3.5 rounded-xl mb-3">
          <View className="flex-row items-center mb-1.5">
            <AlertTriangle size={15} color="#ef4444" />
            <Text className="text-xs font-bold text-red-700 ml-1.5">
              5. Zero Circumvention & Direct Solicitation Policy
            </Text>
          </View>
          <Text className="text-xs text-red-900 leading-relaxed mb-2">
            5.1 Partners are strictly prohibited from soliciting customers to cancel in-app service requests in order to perform offline, non-platform transactions.
          </Text>
          <Text className="text-xs text-red-900 leading-relaxed">
            5.2 Bypassing platform bookings strips both customer and technician of insurance protection, doorstep liability coverage, and dispute arbitration. Violations result in permanent blacklist.
          </Text>
        </View>

        {/* Legal Clause 6 */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-4 shadow-xs">
          <Text className="text-xs font-bold text-[#0f1729] mb-1.5">
            6. Account Suspension, Deactivation & Dispute Arbitration
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed mb-2">
            6.1 Maintaining an average customer rating below 3.8 stars across 15 consecutive jobs triggers an automatic performance review and retraining schedule.
          </Text>
          <Text className="text-xs text-[#6b7280] leading-relaxed">
            6.2 Any legal disputes arising out of service agreements shall be governed under the jurisdiction of the appropriate Courts of Law located at the regional headquarters in Surat, Gujarat.
          </Text>
        </View>

        {/* Agreement Status Card */}
        <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex-row items-center">
          <CheckCircle2 size={16} color="#059669" />
          <Text className="text-[11px] font-semibold text-emerald-800 ml-2 flex-1">
            You digitally accepted the Partner Master Agreement during account activation.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
