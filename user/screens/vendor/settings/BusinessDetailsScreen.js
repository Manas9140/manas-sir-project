import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  FileCheck2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Save,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { updateVendorProfileApi } from '../../../services/api';

const REG_TYPES = [
  'Individual / Freelance',
  'Sole Proprietorship',
  'Partnership Firm',
  'Private Limited (Pvt Ltd)',
];

export default function BusinessDetailsScreen({ navigation }) {
  const { user, token, updateUser } = useAuth();

  const [businessName, setBusinessName] = useState(user?.businessName || user?.name || '');
  const [ownerName, setOwnerName] = useState(user?.ownerName || user?.name || '');
  const [registrationType, setRegistrationType] = useState(user?.registrationType || 'Sole Proprietorship');
  const [gstNumber, setGstNumber] = useState(user?.gstNumber || '');
  const [notGstRegistered, setNotGstRegistered] = useState(!user?.gstNumber);
  const [email, setEmail] = useState(user?.email || '');
  const [alternatePhone, setAlternatePhone] = useState(user?.alternatePhone || '');
  const [yearEstablished, setYearEstablished] = useState(user?.yearEstablished || '2019');
  const [bio, setBio] = useState(
    user?.bio ||
      'Authorized multi-brand local repair & installation specialist with trained technicians, genuine parts, and quick on-site service.'
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessToast(false);

    if (!businessName.trim()) {
      setErrorMsg('Business name cannot be empty.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Owner name is required.');
      return;
    }
    if (!notGstRegistered && gstNumber.trim() && gstNumber.trim().length !== 15) {
      setErrorMsg('GST number must be 15 alphanumeric characters.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        registrationType,
        gstNumber: notGstRegistered ? '' : gstNumber.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        alternatePhone: alternatePhone.trim(),
        yearEstablished: yearEstablished.trim(),
        bio: bio.trim(),
      };

      const res = await updateVendorProfileApi(token, payload);

      if (res.success && res.vendor) {
        await updateUser(res.vendor);
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to update business details.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className="flex-1 bg-[#f6f7f8]">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-200/70 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3"
            accessibilityLabel="Go Back"
          >
            <ArrowLeft size={18} color="#0f1729" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-bold text-[#0f1729]">Business Details</Text>
            <Text className="text-[11px] text-[#6b7280]">Profile, registration & owner info</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-[#0f1729] px-3.5 py-2 rounded-xl flex-row items-center active:opacity-90"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={14} color="#ffffff" />
              <Text className="text-xs font-semibold text-white ml-1.5">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 py-3"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          {successToast && (
            <View className="mb-3 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex-row items-center">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-800 ml-2">
                Business details saved successfully!
              </Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMsg !== '' && (
            <View className="mb-3 bg-red-50 border border-red-200 p-2.5 rounded-xl flex-row items-center">
              <AlertCircle size={16} color="#ef4444" />
              <Text className="text-xs font-semibold text-red-600 ml-2 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* Section 1: Business Identity */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center mb-2.5">
              <Building2 size={15} color="#0f1729" />
              <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">Business Identity</Text>
            </View>

            {/* Business Name */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Trade / Business Name *</Text>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Apex Electrical & Cooling Care"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>

            {/* Registration Type */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1.5">Entity Type</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {REG_TYPES.map((type) => {
                  const active = registrationType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setRegistrationType(type)}
                      className={`px-2.5 py-1.5 rounded-lg border ${
                        active
                          ? 'bg-[#0f1729] border-[#0f1729]'
                          : 'bg-[#f6f7f8] border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          active ? 'text-white' : 'text-[#0f1729]'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* GST Number */}
            <View className="mb-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium text-[#6b7280]">GSTIN / Tax ID (Optional)</Text>
                <TouchableOpacity
                  onPress={() => {
                    setNotGstRegistered(!notGstRegistered);
                    if (!notGstRegistered) setGstNumber('');
                  }}
                >
                  <Text className="text-[11px] text-[#0f1729] font-medium">
                    {notGstRegistered ? '✓ Composition / Not Registered' : 'Not Registered?'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={gstNumber}
                onChangeText={setGstNumber}
                editable={!notGstRegistered}
                placeholder={notGstRegistered ? 'Exempted / Not Registered' : 'e.g. 24AAAAA0000A1Z5'}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                maxLength={15}
                className={`border rounded-xl px-3 py-2 text-xs ${
                  notGstRegistered
                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                    : 'bg-[#f6f7f8] border-slate-200 text-[#0f1729]'
                }`}
              />
            </View>

            {/* Year Established */}
            <View>
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Year Established</Text>
              <TextInput
                value={yearEstablished}
                onChangeText={setYearEstablished}
                keyboardType="numeric"
                maxLength={4}
                placeholder="e.g. 2018"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>
          </View>

          {/* Section 2: Owner & Representative Details */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center mb-2.5">
              <User size={15} color="#0f1729" />
              <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">Owner & Contact Information</Text>
            </View>

            {/* Owner Name */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Primary Owner Full Name *</Text>
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="e.g. Rajesh Kumar"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>

            {/* Registered Phone (Verified) */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Primary Registered Mobile</Text>
              <View className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-[#0f1729]">
                  {user?.mobileNumber || user?.phone || 'Not available'}
                </Text>
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center">
                  <CheckCircle2 size={11} color="#059669" />
                  <Text className="text-[10px] font-bold text-emerald-700 ml-1">Verified OTP</Text>
                </View>
              </View>
            </View>

            {/* Email Address */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Business Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. contact@apexservices.in"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>

            {/* Alternate Phone */}
            <View>
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Alternate / Emergency Hotline</Text>
              <TextInput
                value={alternatePhone}
                onChangeText={setAlternatePhone}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                maxLength={10}
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>
          </View>

          {/* Section 3: Business Bio & Highlights */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Sparkles size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">Business Bio & Guarantee</Text>
              </View>
              <Text className="text-[10px] text-[#6b7280]">{bio.length}/300</Text>
            </View>
            <Text className="text-[11px] text-[#6b7280] mb-2 leading-relaxed">
              Shown to customers when you place a bid. Highlight your certifications, equipment, and warranty.
            </Text>
            <TextInput
              value={bio}
              onChangeText={(text) => text.length <= 300 && setBio(text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Describe your expertise, work experience, team size, tools..."
              placeholderTextColor="#9ca3af"
              className="bg-[#f6f7f8] border border-slate-200 rounded-xl p-3 text-xs text-[#0f1729] min-h-[90px]"
            />
          </View>

          {/* Preview Card */}
          <View className="bg-slate-100 border border-slate-200 p-3.5 rounded-xl mb-4">
            <Text className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">
              Customer Bid Sheet Preview
            </Text>
            <View className="bg-white p-3 rounded-lg border border-slate-200/80">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-[#0f1729]">
                  {businessName || 'Your Business'}
                </Text>
                <View className="bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  <Text className="text-[10px] font-bold text-emerald-700">★ 5.0 (New Partner)</Text>
                </View>
              </View>
              <Text className="text-[11px] text-[#6b7280] mt-1" numberOfLines={2}>
                {bio}
              </Text>
              <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                <Text className="text-[10px] text-slate-500 font-medium">
                  Est. {yearEstablished || '2019'}
                </Text>
                <Text className="text-[10px] text-slate-300">•</Text>
                <Text className="text-[10px] text-slate-500 font-medium">
                  {registrationType}
                </Text>
                {gstNumber && !notGstRegistered ? (
                  <>
                    <Text className="text-[10px] text-slate-300">•</Text>
                    <Text className="text-[10px] text-blue-600 font-semibold">GST Verified</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="w-full bg-[#0f1729] py-3 rounded-xl items-center justify-center shadow-sm active:opacity-90 flex-row"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={16} color="#ffffff" />
                <Text className="text-xs font-bold text-white ml-2">Save Business Details</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
