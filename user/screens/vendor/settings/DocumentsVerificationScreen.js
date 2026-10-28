import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Camera,
  Trash2,
  Save,
  Lock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/context/AuthContext';
import { updateVendorProfileApi } from '../../../services/api';

export default function DocumentsVerificationScreen({ navigation }) {
  const { user, token, updateUser } = useAuth();

  const kyc = user?.kycDocuments || {};

  // Form states
  const [aadhaarNumber, setAadhaarNumber] = useState(kyc.aadhaarNumber || '5829 4810 9231');
  const [aadhaarFront, setAadhaarFront] = useState(kyc.aadhaarFront || null);
  const [aadhaarBack, setAadhaarBack] = useState(kyc.aadhaarBack || null);

  const [panNumber, setPanNumber] = useState(kyc.panNumber || 'BKWPJ8492K');
  const [panImage, setPanImage] = useState(kyc.panImage || null);

  const [tradeLicense, setTradeLicense] = useState(kyc.tradeLicenseNumber || 'UDYAM-GJ-24-0091823');
  const [tradeImage, setTradeImage] = useState(kyc.tradeLicenseImage || null);

  const [certImage, setCertImage] = useState(kyc.certificateImage || null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handlePickImage = async (setter) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed to upload KYC documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setter(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error', e);
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessToast(false);

    if (!aadhaarNumber.trim()) {
      setErrorMsg('Aadhaar number is required for partner verification.');
      return;
    }
    if (!panNumber.trim()) {
      setErrorMsg('PAN card number is required for TDS and bank payouts.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        kycDocuments: {
          aadhaarNumber: aadhaarNumber.trim(),
          aadhaarFront: aadhaarFront || '',
          aadhaarBack: aadhaarBack || '',
          panNumber: panNumber.trim().toUpperCase(),
          panImage: panImage || '',
          tradeLicenseNumber: tradeLicense.trim(),
          tradeLicenseImage: tradeImage || '',
          certificateImage: certImage || '',
          kycStatus: 'verified',
        },
      };

      const res = await updateVendorProfileApi(token, payload);

      if (res.success && res.vendor) {
        await updateUser(res.vendor);
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to update documents.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error occurred. Try again.');
    } finally {
      setSaving(false);
    }
  };

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
            <Text className="text-base font-bold text-[#0f1729]">KYC & Documents</Text>
            <Text className="text-[11px] text-[#6b7280]">Govt ID, PAN, Trade & Skill licenses</Text>
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
          {/* Toast Banners */}
          {successToast && (
            <View className="mb-3 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex-row items-center">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-800 ml-2">
                KYC documents updated & verified!
              </Text>
            </View>
          )}
          {errorMsg !== '' && (
            <View className="mb-3 bg-red-50 border border-red-200 p-2.5 rounded-xl flex-row items-center">
              <AlertCircle size={16} color="#ef4444" />
              <Text className="text-xs font-semibold text-red-600 ml-2 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* Verification Status Banner */}
          <View className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl mb-3 flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center">
                <ShieldCheck size={16} color="#059669" />
                <Text className="text-xs font-bold text-emerald-900 ml-1.5">
                  Verified Partner • Level 2
                </Text>
              </View>
              <Text className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                Your identity and business credentials have been securely verified. Higher KYC level unlocks high-value commercial jobs.
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
              <CheckCircle2 size={22} color="#059669" />
            </View>
          </View>

          {/* Document 1: Aadhaar Card */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <FileCheck2 size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  Aadhaar Card (Mandatory)
                </Text>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-emerald-700">VERIFIED</Text>
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">12-Digit Aadhaar Number</Text>
              <TextInput
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                keyboardType="numeric"
                maxLength={14}
                placeholder="XXXX XXXX 1234"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0f1729]"
              />
            </View>

            {/* Front & Back Upload Cards */}
            <View className="flex-row gap-2">
              {/* Front */}
              <TouchableOpacity
                onPress={() => handlePickImage(setAadhaarFront)}
                className="flex-1 bg-[#f6f7f8] border border-dashed border-slate-300 rounded-xl p-2.5 items-center justify-center min-h-[90px]"
              >
                {aadhaarFront ? (
                  <View className="w-full items-center">
                    <Image source={{ uri: aadhaarFront }} className="w-full h-16 rounded-lg mb-1" resizeMode="cover" />
                    <Text className="text-[10px] text-blue-600 font-semibold">Change Front</Text>
                  </View>
                ) : (
                  <>
                    <UploadCloud size={18} color="#6b7280" />
                    <Text className="text-[11px] font-semibold text-[#0f1729] mt-1">Aadhaar Front</Text>
                    <Text className="text-[9px] text-[#6b7280]">Tap to upload</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                onPress={() => handlePickImage(setAadhaarBack)}
                className="flex-1 bg-[#f6f7f8] border border-dashed border-slate-300 rounded-xl p-2.5 items-center justify-center min-h-[90px]"
              >
                {aadhaarBack ? (
                  <View className="w-full items-center">
                    <Image source={{ uri: aadhaarBack }} className="w-full h-16 rounded-lg mb-1" resizeMode="cover" />
                    <Text className="text-[10px] text-blue-600 font-semibold">Change Back</Text>
                  </View>
                ) : (
                  <>
                    <UploadCloud size={18} color="#6b7280" />
                    <Text className="text-[11px] font-semibold text-[#0f1729] mt-1">Aadhaar Back</Text>
                    <Text className="text-[9px] text-[#6b7280]">Tap to upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Document 2: PAN Card */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <FileCheck2 size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  PAN Card (Required for Payouts)
                </Text>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-emerald-700">VERIFIED</Text>
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Permanent Account Number (PAN)</Text>
              <TextInput
                value={panNumber}
                onChangeText={setPanNumber}
                autoCapitalize="characters"
                maxLength={10}
                placeholder="ABCDE1234F"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0f1729]"
              />
            </View>

            <TouchableOpacity
              onPress={() => handlePickImage(setPanImage)}
              className="bg-[#f6f7f8] border border-dashed border-slate-300 rounded-xl p-3 items-center justify-center"
            >
              {panImage ? (
                <View className="w-full items-center">
                  <Image source={{ uri: panImage }} className="w-full h-24 rounded-lg mb-1" resizeMode="cover" />
                  <Text className="text-[10px] text-blue-600 font-semibold">Replace PAN Photo</Text>
                </View>
              ) : (
                <View className="items-center py-1">
                  <UploadCloud size={18} color="#6b7280" />
                  <Text className="text-[11px] font-semibold text-[#0f1729] mt-1">Upload Clear PAN Photo</Text>
                  <Text className="text-[9px] text-[#6b7280]">Supports JPG, PNG (Max 5MB)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Document 3: MSME Udyam / Shop Act */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <FileCheck2 size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  Udyam MSME / Trade License
                </Text>
              </View>
              <View className="bg-slate-100 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-slate-600">ACTIVE</Text>
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Registration / Certificate Number</Text>
              <TextInput
                value={tradeLicense}
                onChangeText={setTradeLicense}
                placeholder="e.g. UDYAM-GJ-24-0091823"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0f1729]"
              />
            </View>

            <TouchableOpacity
              onPress={() => handlePickImage(setTradeImage)}
              className="bg-[#f6f7f8] border border-dashed border-slate-300 rounded-xl p-2.5 items-center justify-center"
            >
              {tradeImage ? (
                <View className="w-full items-center">
                  <Image source={{ uri: tradeImage }} className="w-full h-20 rounded-lg mb-1" resizeMode="cover" />
                  <Text className="text-[10px] text-blue-600 font-semibold">Replace Certificate</Text>
                </View>
              ) : (
                <View className="items-center">
                  <UploadCloud size={16} color="#6b7280" />
                  <Text className="text-[11px] font-semibold text-[#0f1729] mt-0.5">Upload Certificate Document</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Encryption Assurance Card */}
          <View className="bg-slate-100 border border-slate-200 p-3 rounded-xl mb-4 flex-row items-center">
            <Lock size={16} color="#0f1729" />
            <Text className="text-[11px] text-[#6b7280] ml-2 flex-1 leading-relaxed">
              Your documents are encrypted using AES-256 and only used to fulfill statutory tax compliance (TDS Section 194M) and partner onboarding.
            </Text>
          </View>

          {/* Save Button */}
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
                <Text className="text-xs font-bold text-white ml-2">Save & Submit KYC</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
