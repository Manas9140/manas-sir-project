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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Building,
  Plus,
  X,
  Compass,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Navigation,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { updateVendorProfileApi } from '../../../services/api';

const RADIUS_OPTIONS = [5, 10, 15, 25, 35];

export default function ServiceAreasScreen({ navigation }) {
  const { user, token, updateUser } = useAuth();

  // Operating pincodes
  const [pincodes, setPincodes] = useState(
    user?.pincodes && user.pincodes.length > 0 ? user.pincodes : ['395007', '395001']
  );
  const [newPincode, setNewPincode] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(user?.serviceRadiusKm || 10);

  // Workshop & Branch addresses
  const defaultBranch = {
    id: 'primary-1',
    title: 'Main Workshop & HQ',
    street: user?.address?.street || 'Shop 14, City Center Mall',
    landmark: user?.address?.area || 'Near Ring Road',
    city: user?.address?.city || 'Surat',
    pincode: user?.address?.pincode || (user?.pincodes?.[0] || '395007'),
    isPrimary: true,
    phone: user?.mobileNumber || user?.phone || '',
  };

  const initialBranches =
    user?.branchAddresses && user.branchAddresses.length > 0
      ? user.branchAddresses
      : [defaultBranch];

  const [branches, setBranches] = useState(initialBranches);

  // Add Branch Modal state
  const [branchModal, setBranchModal] = useState(false);
  const [bTitle, setBTitle] = useState('');
  const [bStreet, setBStreet] = useState('');
  const [bLandmark, setBLandmark] = useState('');
  const [bCity, setBCity] = useState(user?.address?.city || 'Surat');
  const [bPincode, setBPincode] = useState('');
  const [bPhone, setBPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const handleAddPincode = () => {
    setErrorMsg('');
    const clean = newPincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      setErrorMsg('Please enter a valid 6-digit Indian postal code.');
      return;
    }
    if (pincodes.includes(clean)) {
      setErrorMsg('This pincode is already added.');
      return;
    }
    setPincodes([...pincodes, clean]);
    setNewPincode('');
  };

  const handleRemovePincode = (code) => {
    if (pincodes.length === 1) {
      setErrorMsg('At least one operating pincode is required to receive leads.');
      return;
    }
    setPincodes(pincodes.filter((p) => p !== code));
  };

  const handleAddBranch = () => {
    if (!bTitle.trim() || !bStreet.trim() || !bPincode.trim()) {
      Alert.alert('Incomplete Branch', 'Branch title, street address, and pincode are required.');
      return;
    }
    if (!/^\d{6}$/.test(bPincode.trim())) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }

    const newBranchObj = {
      id: Date.now().toString(),
      title: bTitle.trim(),
      street: bStreet.trim(),
      landmark: bLandmark.trim(),
      city: bCity.trim(),
      pincode: bPincode.trim(),
      phone: bPhone.trim() || (user?.mobileNumber || ''),
      isPrimary: branches.length === 0,
    };

    setBranches([...branches, newBranchObj]);

    // Automatically add branch pincode if not present
    if (!pincodes.includes(bPincode.trim())) {
      setPincodes([...pincodes, bPincode.trim()]);
    }

    setBTitle('');
    setBStreet('');
    setBLandmark('');
    setBPincode('');
    setBPhone('');
    setBranchModal(false);
  };

  const setPrimaryBranch = (id) => {
    setBranches(
      branches.map((b) => ({
        ...b,
        isPrimary: b.id === id,
      }))
    );
  };

  const handleDeleteBranch = (id) => {
    if (branches.length === 1) {
      Alert.alert('Cannot Remove', 'You must maintain at least one workshop/branch location.');
      return;
    }
    const filtered = branches.filter((b) => b.id !== id);
    if (!filtered.some((b) => b.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    setBranches(filtered);
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessToast(false);

    if (pincodes.length === 0) {
      setErrorMsg('Please specify at least one operating pincode.');
      return;
    }

    try {
      setSaving(true);
      const primary = branches.find((b) => b.isPrimary) || branches[0];

      const payload = {
        pincodes,
        serviceRadiusKm,
        branchAddresses: branches,
        address: {
          street: primary.street,
          area: primary.landmark,
          city: primary.city,
          pincode: primary.pincode,
        },
      };

      const res = await updateVendorProfileApi(token, payload);

      if (res.success && res.vendor) {
        await updateUser(res.vendor);
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to update service areas.');
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
            <Text className="text-base font-bold text-[#0f1729]">Service Areas & Branches</Text>
            <Text className="text-[11px] text-[#6b7280]">Pincodes, coverage radius & workshops</Text>
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
                Service areas & branches updated!
              </Text>
            </View>
          )}
          {errorMsg !== '' && (
            <View className="mb-3 bg-red-50 border border-red-200 p-2.5 rounded-xl flex-row items-center">
              <AlertCircle size={16} color="#ef4444" />
              <Text className="text-xs font-semibold text-red-600 ml-2 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* Service Radius Card */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Compass size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">Travel & Service Radius</Text>
              </View>
              <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                <Text className="text-xs font-bold text-[#0f1729]">{serviceRadiusKm} km</Text>
              </View>
            </View>
            <Text className="text-[11px] text-[#6b7280] mb-3">
              Maximum distance from your workshop to which your technicians will travel for doorstep jobs.
            </Text>

            <View className="flex-row gap-2">
              {RADIUS_OPTIONS.map((km) => {
                const active = serviceRadiusKm === km;
                return (
                  <TouchableOpacity
                    key={km}
                    onPress={() => setServiceRadiusKm(km)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      active
                        ? 'bg-[#0f1729] border-[#0f1729]'
                        : 'bg-[#f6f7f8] border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? 'text-white' : 'text-[#0f1729]'
                      }`}
                    >
                      {km} km
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Operating Pincodes Section */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <MapPin size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  Operating Pincodes ({pincodes.length})
                </Text>
              </View>
            </View>
            <Text className="text-[11px] text-[#6b7280] mb-3">
              You receive live job broadcasts whenever a customer books inside any of these pincodes.
            </Text>

            {/* Add Pincode Input Bar */}
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1 flex-row items-center bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5">
                <Navigation size={13} color="#9ca3af" />
                <TextInput
                  value={newPincode}
                  onChangeText={setNewPincode}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-xs text-[#0f1729] ml-2 font-semibold"
                />
              </View>
              <TouchableOpacity
                onPress={handleAddPincode}
                className="bg-[#0f1729] px-3.5 py-2.5 rounded-xl flex-row items-center"
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white ml-1">Add</Text>
              </TouchableOpacity>
            </View>

            {/* Pincode Chips Grid */}
            <View className="flex-row flex-wrap gap-2">
              {pincodes.map((code) => (
                <View
                  key={code}
                  className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-2.5 py-1.5 flex-row items-center"
                >
                  <Text className="text-xs font-bold text-[#0f1729] mr-1.5">{code}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemovePincode(code)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Workshop & Branch Locations */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-4 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Building size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  Workshop & Branches ({branches.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBranchModal(true)}
                className="bg-slate-100 px-2 py-1 rounded-lg flex-row items-center"
              >
                <Plus size={12} color="#0f1729" />
                <Text className="text-[11px] font-bold text-[#0f1729] ml-1">Add Branch</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[11px] text-[#6b7280] mb-3">
              Your primary branch determines customer map distances and billing address.
            </Text>

            <View className="space-y-2.5 gap-2.5">
              {branches.map((b) => (
                <View
                  key={b.id}
                  className={`p-3 rounded-xl border ${
                    b.isPrimary ? 'bg-slate-50 border-[#0f1729]' : 'bg-[#f6f7f8] border-slate-200'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center">
                      <Text className="text-xs font-bold text-[#0f1729]">{b.title}</Text>
                      {b.isPrimary && (
                        <View className="ml-2 bg-[#0f1729] px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-bold text-white">PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    {!b.isPrimary && (
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => setPrimaryBranch(b.id)}>
                          <Text className="text-[11px] font-bold text-[#0f1729] underline">
                            Set Primary
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteBranch(b.id)}>
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-[#0f1729] leading-relaxed">
                    {b.street}
                    {b.landmark ? `, ${b.landmark}` : ''}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-200/60">
                    <Text className="text-[10px] text-slate-500 font-medium">
                      {b.city} - {b.pincode}
                    </Text>
                    {b.phone ? (
                      <>
                        <Text className="text-[10px] text-slate-300">•</Text>
                        <Text className="text-[10px] text-slate-500 font-medium">{b.phone}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
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
                <Text className="text-xs font-bold text-white ml-2">Save Operating Areas</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Branch Modal */}
      <Modal visible={branchModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-sm p-4 border border-slate-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-[#0f1729]">Add Workshop / Branch</Text>
              <TouchableOpacity onPress={() => setBranchModal(false)}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-2.5">
              <Text className="text-[11px] font-medium text-[#6b7280] mb-1">Branch Name *</Text>
              <TextInput
                value={bTitle}
                onChangeText={setBTitle}
                placeholder="e.g. Adajan Service Center"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0f1729]"
              />
            </View>

            <View className="mb-2.5">
              <Text className="text-[11px] font-medium text-[#6b7280] mb-1">Street Address *</Text>
              <TextInput
                value={bStreet}
                onChangeText={setBStreet}
                placeholder="Shop No., Complex, Road"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0f1729]"
              />
            </View>

            <View className="flex-row gap-2 mb-2.5">
              <View className="flex-1">
                <Text className="text-[11px] font-medium text-[#6b7280] mb-1">City</Text>
                <TextInput
                  value={bCity}
                  onChangeText={setBCity}
                  placeholder="Surat"
                  placeholderTextColor="#9ca3af"
                  className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0f1729]"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium text-[#6b7280] mb-1">Pincode *</Text>
                <TextInput
                  value={bPincode}
                  onChangeText={setBPincode}
                  keyboardType="numeric"
                  maxLength={6}
                  placeholder="395009"
                  placeholderTextColor="#9ca3af"
                  className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0f1729]"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-[11px] font-medium text-[#6b7280] mb-1">Branch Contact Mobile</Text>
              <TextInput
                value={bPhone}
                onChangeText={setBPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="e.g. 9825000000"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0f1729]"
              />
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setBranchModal(false)}
                className="flex-1 bg-slate-100 py-2.5 rounded-xl items-center"
              >
                <Text className="text-xs font-semibold text-[#0f1729]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddBranch}
                className="flex-1 bg-[#0f1729] py-2.5 rounded-xl items-center"
              >
                <Text className="text-xs font-semibold text-white">Save Branch</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
