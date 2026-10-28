import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { User, ArrowRight, ChevronDown, Check, Smartphone, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react-native';
import { sendOtpApi, verifyOtpApi } from '../../services/api';
import { useAuth } from '../../src/context/AuthContext';

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
];

export default function SignupScreen({ route, navigation, onNavigateToLogin, onSignupSuccess }) {
  const { login } = useAuth();
  const initialPhone = (route?.params?.mobileNumber || '').replace('+91', '').trim();
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [fullName, setFullName] = useState(route?.params?.name || '');
  const [phone, setPhone] = useState(initialPhone);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [testOtpBanner, setTestOtpBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const otpInputs = useRef([]);

  const handleSendOtp = async () => {
    setErrorMessage('');
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your mobile number.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    const fullPhone = `${selectedCountry.code}${phone.trim()}`;
    const res = await sendOtpApi(fullPhone);
    setLoading(false);

    if (res.success) {
      // Display received OTP directly on the screen in test banner as per Rule #3
      if (res.otp) {
        setTestOtpBanner(res.otp);
        const digits = res.otp.split('');
        if (digits.length === 6) setOtp(digits);
      }
      setStep('otp');
    } else {
      setErrorMessage(res.message || 'Failed to send OTP code.');
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const fullPhone = `${selectedCountry.code}${phone.trim()}`;
    const res = await verifyOtpApi(fullPhone, fullOtp, fullName.trim(), 'customer');
    setLoading(false);

    if (res.success) {
      if (onSignupSuccess) {
        onSignupSuccess(res.user, res.token);
      } else {
        await login(res.token, res.user, 'customer');
        const addr = res.user?.address || res.user?.addressDetails;
        if (!addr?.street && !addr?.pincode) {
          navigation?.navigate('LocationSetup');
        }
      }
    } else {
      setErrorMessage(res.message || 'Invalid OTP code. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#f6f7f8]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
        className="px-6 py-10"
      >
        {step === 'otp' && (
          <TouchableOpacity
            onPress={() => {
              setStep('details');
              setErrorMessage('');
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center mb-6 shadow-sm"
          >
            <ArrowLeft size={20} color="#0f1729" />
          </TouchableOpacity>
        )}

        <View className="mb-6">
          <Text className="text-3xl font-extrabold text-[#0f1729] tracking-tight font-display mb-2">
            {step === 'details' ? 'Create Account' : 'Verify Mobile'}
          </Text>
          <Text className="text-base text-[#6b7280]">
            {step === 'details'
              ? 'Sign up with your mobile number to create your profile'
              : `Enter the 6-digit OTP sent to ${selectedCountry.code} ${phone}`}
          </Text>
        </View>

        {/* Test OTP Banner as per Rule #3 */}
        {testOtpBanner !== '' && step === 'otp' && (
          <View className="mb-6 bg-amber-50 border-2 border-amber-400 p-4 rounded-xl flex-row items-center justify-between shadow-sm">
            <View className="flex-row items-center flex-1 mr-2">
              <KeyRound size={22} color="#d97706" />
              <View className="ml-3">
                <Text className="text-xs font-bold text-amber-800 uppercase tracking-wider">Test Verification Mode</Text>
                <Text className="text-base font-extrabold text-amber-900">
                  Received OTP: <Text className="text-lg underline">{testOtpBanner}</Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error Feedback Message */}
        {errorMessage !== '' && (
          <View className="mb-4 bg-red-50 border border-red-200 p-3 rounded-xl">
            <Text className="text-sm font-semibold text-red-600 text-center">{errorMessage}</Text>
          </View>
        )}

        {step === 'details' ? (
          /* Step 1: User Profile & Mobile Inputs */
          <View className="space-y-3 mb-4">
            {/* Full Name */}
            <View>
              <Text className="text-xs font-semibold text-[#0f1729] uppercase tracking-wider mb-1">
                Full Name
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                <User size={18} color="#6b7280" />
                <TextInput
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setErrorMessage('');
                  }}
                  placeholder="John Doe"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-2.5 text-sm text-[#0f1729]"
                />
              </View>
            </View>

            {/* Mobile Number with Country Code */}
            <View className="mt-2.5">
              <Text className="text-xs font-semibold text-[#0f1729] uppercase tracking-wider mb-1">
                Mobile Number
              </Text>
              <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                <TouchableOpacity
                  onPress={() => setShowCountryModal(true)}
                  className="flex-row items-center pr-2.5 border-r border-gray-200"
                >
                  <Text className="text-sm mr-1">{selectedCountry.flag}</Text>
                  <Text className="text-sm font-semibold text-[#0f1729] mr-1">
                    {selectedCountry.code}
                  </Text>
                  <ChevronDown size={14} color="#6b7280" />
                </TouchableOpacity>
                <Smartphone size={18} color="#6b7280" className="ml-2.5 mr-2" />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setErrorMessage('');
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="flex-1 text-sm text-[#0f1729]"
                />
              </View>
            </View>

            {/* Terms Agreement */}
            <View className="flex-row items-center mt-2.5">
              <TouchableOpacity
                onPress={() => {
                  setAgreeTerms(!agreeTerms);
                  setErrorMessage('');
                }}
                className="flex-row items-center"
              >
                <View
                  className={`w-4 h-4 rounded border items-center justify-center mr-2 ${
                    agreeTerms ? 'bg-[#0f1729] border-[#0f1729]' : 'border-gray-300 bg-white'
                  }`}
                >
                  {agreeTerms && <Text className="text-white text-[10px] font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-[#6b7280]">
                  I agree to the{' '}
                  <Text className="font-semibold text-[#0f1729]">
                    Terms & Conditions
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit & Get OTP Button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading}
              style={{ backgroundColor: '#0f1729' }}
              className="bg-[#0f1729] py-3.5 rounded-xl flex-row items-center justify-center shadow-md active:opacity-90 mt-4 mb-2"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-sm mr-2">Get OTP Code</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Step 2: 6-Digit OTP Verification */
          <View className="space-y-6 mb-6">
            <View className="flex-row justify-between my-4">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpInputs.current[index] = ref)}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={{ borderColor: digit ? '#0f1729' : '#e5e7eb' }}
                  className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold text-[#0f1729] bg-white ${
                    digit ? 'border-[#0f1729]' : 'border-gray-200'
                  }`}
                />
              ))}
            </View>

            {/* Resend Code Option */}
            <TouchableOpacity onPress={handleSendOtp} className="flex-row items-center justify-center space-x-1 mb-4">
              <RefreshCw size={16} color="#0f1729" />
              <Text style={{ color: '#0f1729' }} className="text-sm font-semibold text-[#0f1729] ml-1">
                Resend OTP Code
              </Text>
            </TouchableOpacity>

            {/* Verify & Proceed Button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading}
              style={{ backgroundColor: '#0f1729' }}
              className="bg-[#0f1729] py-4 rounded-xl flex-row items-center justify-center shadow-md active:opacity-90"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base mr-2">Verify & Continue</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Link */}
        <View className="flex-row justify-center items-center">
          <Text className="text-sm text-[#6b7280]">Already have an account? </Text>
          <TouchableOpacity onPress={() => onNavigateToLogin ? onNavigateToLogin() : navigation?.navigate('Login')}>
            <Text className="text-sm font-bold text-[#0f1729]">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Country Code Modal */}
      <Modal visible={showCountryModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 max-h-[60%] border-t border-gray-100">
            <View className="flex-row justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <Text className="text-lg font-bold text-[#0f1729]">Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Text className="text-sm font-bold text-[#6b7280]">Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                  }}
                  className="flex-row items-center justify-between p-3.5 border-b border-gray-100"
                >
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-3">{item.flag}</Text>
                    <Text className="text-base font-semibold text-[#0f1729]">
                      {item.name} ({item.code})
                    </Text>
                  </View>
                  {selectedCountry.code === item.code && (
                    <Check size={18} color="#0f1729" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
