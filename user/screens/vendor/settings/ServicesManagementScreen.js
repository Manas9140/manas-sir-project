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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Wrench,
  Zap,
  Plus,
  Check,
  X,
  IndianRupee,
  ShieldCheck,
  Clock,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { updateVendorProfileApi } from '../../../services/api';

const DEFAULT_SUB_SERVICES = {
  Electrician: [
    'Ceiling & Exhaust Fan Repair',
    'Short Circuit & MCB Tripping',
    'Complete House Wiring',
    'Switchboard & Socket Repair',
    'Inverter & Battery Wiring',
    'Chandelier & Decorative Lighting',
    'Earthing & Heavy Load Setup',
  ],
  Plumber: [
    'Pipe & Tap Leakage Repair',
    'Water Motor / Pump Repair',
    'Bathroom Sanitary Fitting',
    'Water Tank Cleaning & Float Valve',
    'Drainage & Blockage Removal',
    'Geyser & Water Heater Plumbing',
    'RO & Water Purifier Fitting',
  ],
  Cleaning: [
    'Full Deep House Cleaning',
    'Kitchen Degreasing & Chimney',
    'Bathroom Acid Wash & Disinfection',
    'Sofa & Carpet Shampooing',
    'Balcony & Window Mesh Washing',
  ],
  Appliance: [
    'AC Gas Charging & Jet Service',
    'Refrigerator Cooling Repair',
    'Washing Machine Drum & Motor',
    'Microwave Oven Repair',
    'Television Wall Mount & Display',
  ],
  Carpenter: [
    'Door Locks & Hinges Fitting',
    'Modular Kitchen Furniture Repair',
    'Custom Wardrobe & Cupboard',
    'Bed & Sofa Frame Fixing',
    'Wooden Polishing & Touchup',
  ],
  Painting: [
    'Interior Wall Plastic Paint',
    'Exterior Waterproof Coating',
    'Wood Polish & PU Coating',
    'Wall Stencils & Texture Painting',
    'Crack Filling & Putty Work',
  ],
  'Pest Control': [
    'Termite Anti-Borer Treatment',
    'Cockroach Gel Treatment',
    'Bed Bug Eradication',
    'Mosquito & Fogging Service',
  ],
};

const WARRANTY_OPTIONS = [15, 30, 60, 90];
const SURCHARGE_OPTIONS = [0, 15, 25, 50];

export default function ServicesManagementScreen({ navigation }) {
  const { user, token, updateUser } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(user?.category || 'Electrician');

  // Available options: combination of category defaults + any existing user subServices
  const categoryDefaults = DEFAULT_SUB_SERVICES[selectedCategory] || DEFAULT_SUB_SERVICES.Electrician;
  const initialSelected = user?.subServices?.length > 0 ? user.subServices : categoryDefaults.slice(0, 4);

  const [selectedSubServices, setSelectedSubServices] = useState(initialSelected);
  const [customSkillModal, setCustomSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  // Rates
  const [visitingCharge, setVisitingCharge] = useState(String(user?.baseVisitingCharge ?? 150));
  const [hourlyRate, setHourlyRate] = useState(String(user?.customRates?.hourlyRate ?? 250));
  const [emergencySurcharge, setEmergencySurcharge] = useState(user?.customRates?.emergencySurcharge ?? 25);
  const [warrantyDays, setWarrantyDays] = useState(user?.customRates?.warrantyDays ?? 30);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  const toggleSubService = (item) => {
    if (selectedSubServices.includes(item)) {
      if (selectedSubServices.length === 1) {
        setErrorMsg('At least one sub-service must remain active.');
        return;
      }
      setSelectedSubServices(selectedSubServices.filter((s) => s !== item));
    } else {
      setSelectedSubServices([...selectedSubServices, item]);
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (!selectedSubServices.includes(trimmed)) {
      setSelectedSubServices([...selectedSubServices, trimmed]);
    }
    setNewSkillName('');
    setCustomSkillModal(false);
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessToast(false);

    const numVisit = Number(visitingCharge);
    const numHourly = Number(hourlyRate);

    if (isNaN(numVisit) || numVisit < 0) {
      setErrorMsg('Please enter a valid visit fee.');
      return;
    }
    if (isNaN(numHourly) || numHourly < 0) {
      setErrorMsg('Please enter a valid hourly rate.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        category: selectedCategory,
        subServices: selectedSubServices,
        baseVisitingCharge: numVisit,
        customRates: {
          hourlyRate: numHourly,
          emergencySurcharge,
          warrantyDays,
        },
      };

      const res = await updateVendorProfileApi(token, payload);

      if (res.success && res.vendor) {
        await updateUser(res.vendor);
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 3000);
      } else {
        setErrorMsg(res.message || 'Failed to update services.');
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
            <Text className="text-base font-bold text-[#0f1729]">Services & Rates</Text>
            <Text className="text-[11px] text-[#6b7280]">Job skills, pricing card & warranty</Text>
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
                Services & rates updated successfully!
              </Text>
            </View>
          )}
          {errorMsg !== '' && (
            <View className="mb-3 bg-red-50 border border-red-200 p-2.5 rounded-xl flex-row items-center">
              <AlertCircle size={16} color="#ef4444" />
              <Text className="text-xs font-semibold text-red-600 ml-2 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* Primary Trade Category Card */}
          <View className="bg-[#0f1729] p-3.5 rounded-xl mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pr-2">
                <View className="flex-row items-center mb-1">
                  <Sparkles size={12} color="#60A5FA" />
                  <Text className="text-[10px] font-bold text-blue-300 ml-1 uppercase tracking-wider">
                    Primary Trade License
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-white">{selectedCategory} Specialist</Text>
                <Text className="text-[11px] text-slate-300 mt-0.5">
                  Select your trade to receive relevant job dispatches.
                </Text>
              </View>
              <View className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700">
                <Wrench size={18} color="#ffffff" />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerStyle={{ gap: 6 }}>
              {Object.keys(DEFAULT_SUB_SERVICES).map((catKey) => {
                const isSelected = selectedCategory === catKey;
                return (
                  <TouchableOpacity
                    key={catKey}
                    onPress={() => {
                      setSelectedCategory(catKey);
                      const defaults = DEFAULT_SUB_SERVICES[catKey] || [];
                      setSelectedSubServices(defaults.slice(0, 4));
                    }}
                    className={`px-3 py-1.5 rounded-lg border ${
                      isSelected ? 'bg-amber-400 border-amber-400' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? 'text-[#0f1729]' : 'text-slate-300'}`}>
                      {catKey}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Sub-Services Toggles */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Zap size={15} color="#0f1729" />
                <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                  Sub-Services & Tasks ({selectedSubServices.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCustomSkillModal(true)}
                className="bg-slate-100 px-2 py-1 rounded-lg flex-row items-center"
              >
                <Plus size={12} color="#0f1729" />
                <Text className="text-[11px] font-bold text-[#0f1729] ml-1">Add Custom</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[11px] text-[#6b7280] mb-3">
              Enable the specific jobs you can fulfill on-site. Customers see these in your profile.
            </Text>

            <View className="space-y-1.5 gap-1.5">
              {Array.from(new Set([...categoryDefaults, ...selectedSubServices])).map((service) => {
                const active = selectedSubServices.includes(service);
                return (
                  <TouchableOpacity
                    key={service}
                    onPress={() => toggleSubService(service)}
                    className={`p-2.5 rounded-xl border flex-row items-center justify-between ${
                      active
                        ? 'bg-slate-50 border-[#0f1729]'
                        : 'bg-[#f6f7f8] border-slate-200'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        className={`w-4 h-4 rounded-md items-center justify-center mr-2.5 border ${
                          active
                            ? 'bg-[#0f1729] border-[#0f1729]'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {active && <Check size={10} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        className={`text-xs ${
                          active ? 'font-bold text-[#0f1729]' : 'text-slate-600'
                        }`}
                      >
                        {service}
                      </Text>
                    </View>
                    {active ? (
                      <View className="bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-bold text-emerald-700">ACTIVE</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Pricing & Rate Card */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center mb-2.5">
              <IndianRupee size={15} color="#0f1729" />
              <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">Pricing & Custom Rates</Text>
            </View>

            {/* Visiting / Inspection Charge */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">
                Base Inspection / Visiting Fee (₹) *
              </Text>
              <View className="flex-row items-center bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2">
                <Text className="text-xs font-bold text-slate-500 mr-1.5">₹</Text>
                <TextInput
                  value={visitingCharge}
                  onChangeText={setVisitingCharge}
                  keyboardType="numeric"
                  placeholder="150"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-xs font-bold text-[#0f1729]"
                />
                <Text className="text-[10px] text-slate-400">Doorstep check fee</Text>
              </View>
            </View>

            {/* Standard Hourly Rate */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">
                Standard Hourly Labor Rate (₹) *
              </Text>
              <View className="flex-row items-center bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2">
                <Text className="text-xs font-bold text-slate-500 mr-1.5">₹</Text>
                <TextInput
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  keyboardType="numeric"
                  placeholder="250"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 text-xs font-bold text-[#0f1729]"
                />
                <Text className="text-[10px] text-slate-400">Per hour work</Text>
              </View>
            </View>

            {/* Emergency / Night Surcharge */}
            <View className="mb-3">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-xs font-medium text-[#6b7280]">Emergency / Late-Hour Surcharge</Text>
                <Text className="text-[11px] font-bold text-[#0f1729]">+{emergencySurcharge}%</Text>
              </View>
              <View className="flex-row gap-2">
                {SURCHARGE_OPTIONS.map((val) => {
                  const active = emergencySurcharge === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setEmergencySurcharge(val)}
                      className={`flex-1 py-1.5 rounded-lg border items-center justify-center ${
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
                        {val === 0 ? 'None' : `+${val}%`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Service Warranty Guarantee */}
            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center">
                  <ShieldCheck size={14} color="#059669" />
                  <Text className="text-xs font-medium text-[#6b7280] ml-1">
                    Free Re-Service Warranty
                  </Text>
                </View>
                <Text className="text-[11px] font-bold text-emerald-700">{warrantyDays} Days</Text>
              </View>
              <View className="flex-row gap-2">
                {WARRANTY_OPTIONS.map((days) => {
                  const active = warrantyDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      onPress={() => setWarrantyDays(days)}
                      className={`flex-1 py-1.5 rounded-lg border items-center justify-center ${
                        active
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-[#f6f7f8] border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          active ? 'text-white' : 'text-[#0f1729]'
                        }`}
                      >
                        {days} Days
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
                <Text className="text-xs font-bold text-white ml-2">Save Services & Rates</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Custom Skill Modal */}
      <Modal visible={customSkillModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-sm p-4 border border-slate-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-[#0f1729]">Add Custom Skill</Text>
              <TouchableOpacity onPress={() => setCustomSkillModal(false)}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-[#6b7280] mb-3">
              Enter specialized task or machine repair type you offer.
            </Text>
            <TextInput
              value={newSkillName}
              onChangeText={setNewSkillName}
              placeholder="e.g. Submersible starter rewinding"
              placeholderTextColor="#9ca3af"
              autoFocus
              className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729] mb-4"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setCustomSkillModal(false)}
                className="flex-1 bg-slate-100 py-2.5 rounded-xl items-center"
              >
                <Text className="text-xs font-semibold text-[#0f1729]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCustomSkill}
                className="flex-1 bg-[#0f1729] py-2.5 rounded-xl items-center"
              >
                <Text className="text-xs font-semibold text-white">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
