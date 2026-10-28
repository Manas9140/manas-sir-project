import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  X,
  MapPin,
  AlertCircle,
  Check,
  Home,
  Briefcase,
  Plus,
  Navigation as NavIcon,
  FileText,
  AlignLeft,
  CalendarDays,
  Clock,
  Snowflake,
  Droplets,
  Zap,
  Sparkles,
  Hammer,
  PaintRoller,
  Wrench,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { createServiceRequestApi, getSavedAddressesApi } from '../../services/api';
import { useAuth } from '../../src/context/AuthContext';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  amber: '#FFB800',
  ink: '#161A2B',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  page: '#EEF1F8',
  white: '#FFFFFF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
  success: '#0F7A4A',
  successBg: '#E7F6EE',
};

const MAX_PHOTOS = 5;
const DATE_OPTIONS = ['Today', 'Tomorrow', 'Day After'];
const TIME_SLOTS = [
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 3 PM)',
  'Evening (3 PM - 7 PM)',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- Helpers ---------- */
const CATEGORY_ICONS = [
  [/\bac\b|air ?con|cooling/i, Snowflake],
  [/plumb|leak|tap|pipe|water/i, Droplets],
  [/electr|wiring|switch|fan/i, Zap],
  [/clean|pest|sanit/i, Sparkles],
  [/carpent|furniture|wood/i, Hammer],
  [/paint/i, PaintRoller],
];
const getCategoryIcon = (c = '') => (CATEGORY_ICONS.find(([re]) => re.test(c)) || [null, Wrench])[1];

// "Morning (9 AM - 12 PM)" -> { name: 'Morning', range: '9 AM–12 PM' }
const splitSlot = (slot) => {
  const m = /^(.+?)\s*\((.+)\)$/.exec(slot);
  return m ? { name: m[1], range: m[2].replace(/\s*-\s*/, '–') } : { name: slot, range: '' };
};

const dateCaption = (option) => {
  const d = new Date();
  d.setDate(d.getDate() + DATE_OPTIONS.indexOf(option));
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const formatAddress = (addr) => {
  if (!addr) return '';
  if (addr.formattedAddress) return addr.formattedAddress;
  return [
    addr.houseNo,
    addr.street || addr.streetAddress || addr.area,
    addr.landmark ? `near ${addr.landmark}` : null,
    addr.city || addr.cityState,
    addr.pincode || addr.zipCode,
  ]
    .filter(Boolean)
    .join(', ');
};

const AddressIcon = ({ label, size = 16 }) => {
  if (label === 'Work') return <Briefcase size={size} color={C.indigo} />;
  if (label === 'Home') return <Home size={size} color={C.indigo} />;
  return <MapPin size={size} color={C.indigo} />;
};

// Normalises a picked image into the { uri, name, type } shape multipart uploads expect
const toUploadFile = (rawUri, idx) => {
  let uri = String(rawUri).split('?')[0];
  try {
    uri = decodeURI(uri);
  } catch (e) {}
  const hasScheme =
    Platform.OS === 'android'
      ? /^(file|content):\/\//.test(uri)
      : /^(file|ph|assets-library):\/\//.test(uri);
  if (!hasScheme) uri = `file://${uri}`;

  const name = uri.split('/').pop() || `image_${idx}.jpg`;
  const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase();
  const type = ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'image/jpeg';
  return { uri, name, type };
};

/* ---------- Small pieces ---------- */
function Field({ label, Icon, aside, children }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        {Icon ? <Icon size={15} color={C.indigo} strokeWidth={2.2} style={{ marginRight: 7 }} /> : null}
        <Text style={styles.fieldLabel}>{label}</Text>
        {aside ? <Text style={styles.fieldAside}>{aside}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function OptionTile({ selected, top, bottom, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.tile, selected && styles.tileOn]}
    >
      <Text style={[styles.tileTop, selected && { color: C.white }]} numberOfLines={1}>
        {top}
      </Text>
      {!!bottom && (
        <Text style={[styles.tileBottom, selected && { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
          {bottom}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/* ---------- Screen ---------- */
export default function CreateRequestScreen({
  route,
  navigation,
  userToken: propUserToken,
  userAddress: propUserAddress,
}) {
  const categoryName = route?.params?.category || 'General Service';
  const { token: contextToken, user } = useAuth();
  const token = contextToken || propUserToken;
  const insets = useSafeAreaInsets();
  const CategoryIcon = getCategoryIcon(categoryName);

  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [descError, setDescError] = useState(false);
  const [focused, setFocused] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState(null);

  const [selectedAddress, setSelectedAddress] = useState(route?.params?.address || null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Locally selected > profile addressDetails > user.address > prop. No fake fallback:
  // if nothing is set, the user is asked to add one instead of posting to a dummy address.
  const currentAddress =
    selectedAddress || user?.addressDetails || user?.address || propUserAddress || null;

  /* ---------- Addresses (logic unchanged) ---------- */
  useEffect(() => {
    loadSavedAddresses();
    const unsubscribe = navigation.addListener('focus', loadSavedAddresses);
    return unsubscribe;
  }, [navigation, user]);

  const loadSavedAddresses = async () => {
    let list = [];
    if (token) {
      try {
        const res = await getSavedAddressesApi(token);
        if (res.success && Array.isArray(res.addresses) && res.addresses.length > 0) list = res.addresses;
      } catch (e) {}
    }
    if (list.length === 0) {
      try {
        const cached = await AsyncStorage.getItem('@user_saved_addresses');
        if (cached) list = JSON.parse(cached);
      } catch (e) {}
    }
    if (list.length === 0 && user?.savedAddresses?.length > 0) list = user.savedAddresses;
    const ad = user?.addressDetails;
    if (list.length === 0 && (ad?.formattedAddress || ad?.area || ad?.city)) {
      list = [
        {
          id: 'primary',
          label: ad.label || 'Home',
          houseNo: ad.houseNo || '',
          area: ad.area || ad.street || '',
          city: ad.city || '',
          pincode: ad.pincode || '',
          formattedAddress: ad.formattedAddress || `${ad.area || ''}, ${ad.city || ''}`,
          isDefault: true,
        },
      ];
    }
    setSavedAddresses(list);
  };

  const isAddressSelected = (addr) => {
    if (!currentAddress || !addr) return false;
    if (addr._id && (currentAddress._id === addr._id || currentAddress.id === addr._id)) return true;
    if (addr.id && (currentAddress.id === addr.id || currentAddress._id === addr.id)) return true;
    return !!(addr.formattedAddress && addr.formattedAddress === currentAddress.formattedAddress);
  };

  const openAddressPicker = async () => {
    await loadSavedAddresses();
    setShowAddressPicker(true);
  };

  /* ---------- Photos ---------- */
  const handlePickImage = async () => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert('Photo limit reached', `You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Allow photo access', 'Turn on photo access in Settings to attach pictures of the problem.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - images.length,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
      }
    } catch (error) {
      console.warn('Image picker error:', error);
    }
  };

  const handleRemoveImage = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

  /* ---------- Submit ---------- */
  const buildAddressObj = (a) => ({
    label: a.label || a.addressTag || 'Home',
    street: a.street || a.streetAddress || a.houseNo || a.formattedAddress || 'Main Street',
    city: a.city || a.cityState || a.state || 'Mumbai',
    pincode: a.pincode || a.zipCode || '400001',
    location: a.location || {
      type: 'Point',
      coordinates: [
        a.coordinate?.longitude || a.location?.coordinates?.[0] || 72.8777,
        a.coordinate?.latitude || a.location?.coordinates?.[1] || 19.076,
      ],
    },
  });

  const buildPayload = async () => {
    const title = issueTitle.trim() || `${categoryName} Service`;
    const schedule = { date: selectedDate, timeSlot: selectedTimeSlot };
    const address = buildAddressObj(currentAddress);

    if (images.length === 0) {
      return { category: categoryName, title, description: description.trim(), images: [], schedule, address };
    }

    const fd = new FormData();
    fd.append('category', String(categoryName));
    fd.append('title', String(title));
    fd.append('description', description.trim());
    fd.append('schedule', JSON.stringify(schedule));
    fd.append('address', JSON.stringify(address));

    for (let i = 0; i < images.length; i++) {
      const raw = typeof images[i] === 'string' ? images[i] : images[i]?.uri;
      if (!raw) continue;
      if (Platform.OS === 'web') {
        // Browsers need a real Blob; the { uri } shape only works on native
        try {
          const blob = await (await fetch(raw)).blob();
          fd.append('images', blob, `image_${i}.${(blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`);
          continue;
        } catch (e) {}
      }
      fd.append('images', toUploadFile(raw, i));
    }
    return fd;
  };

  const handleSubmitRequest = async () => {
    setErrorMessage('');
    if (!description.trim()) {
      setDescError(true);
      setErrorMessage('Describe the problem so pros can quote accurately.');
      return;
    }
    if (!currentAddress) {
      setErrorMessage('Add the address where you need the service.');
      return;
    }

    setLoading(true);
    try {
      const payload = await buildPayload();
      const res = await createServiceRequestApi(token, payload);
      if (res?.success) {
        setCreatedRequestId(res.request?._id || res.data?._id || res._id || null);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(res?.message || 'Your request wasn’t posted. Try again.');
      }
    } catch (e) {
      console.warn('Create request error:', e);
      setErrorMessage('Check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToBookings = () => {
    setShowSuccessModal(false);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'Bookings' } }] });
  };

  const viewRequest = () => {
    if (!createdRequestId) return goToBookings();
    setShowSuccessModal(false);
    navigation.replace('RequestDetails', { requestId: createdRequestId });
  };

  /* ---------- Render ---------- */
  const pincode = currentAddress?.pincode || currentAddress?.zipCode;
  const addrLabel = currentAddress?.label || currentAddress?.addressTag || 'Saved address';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <CategoryIcon size={150} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={C.white} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.catTile}>
            <CategoryIcon size={22} color={C.white} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={2} accessibilityRole="header">
              {categoryName}
            </Text>
            <Text style={styles.headerSub} numberOfLines={2}>
              Tell us what’s wrong and get quotes from verified pros
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.sheet}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="Title" Icon={FileText} aside="Optional">
            <TextInput
              value={issueTitle}
              onChangeText={setIssueTitle}
              onFocus={() => setFocused('title')}
              onBlur={() => setFocused('')}
              placeholder="e.g. AC not cooling properly"
              placeholderTextColor={C.faint}
              returnKeyType="next"
              accessibilityLabel="Title, optional"
              style={[styles.input, focused === 'title' && styles.inputFocus]}
            />
          </Field>

          <Field label="Describe the problem" Icon={AlignLeft}>
            <TextInput
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (descError) setDescError(false);
                if (errorMessage) setErrorMessage('');
              }}
              onFocus={() => setFocused('desc')}
              onBlur={() => setFocused('')}
              placeholder="What’s wrong, since when, brand or model"
              placeholderTextColor={C.faint}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Describe the problem"
              style={[
                styles.input,
                styles.textarea,
                focused === 'desc' && styles.inputFocus,
                descError && styles.inputError,
              ]}
            />
          </Field>

          <Field label="Photos" Icon={Camera} aside={`Optional, ${images.length}/${MAX_PHOTOS}`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {images.length < MAX_PHOTOS && (
                <TouchableOpacity
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  style={styles.addPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                >
                  <Plus size={18} color={C.indigo} strokeWidth={2.5} />
                  <Text style={styles.addPhotoText}>Add</Text>
                </TouchableOpacity>
              )}
              {images.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => handleRemoveImage(index)}
                    style={styles.thumbRemove}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                  >
                    <X size={10} color={C.white} strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </Field>

          <Field label="Date" Icon={CalendarDays}>
            <View style={styles.tileRow} accessibilityRole="radiogroup">
              {DATE_OPTIONS.map((opt, i) => (
                <React.Fragment key={opt}>
                  {i > 0 && <View style={{ width: 8 }} />}
                  <OptionTile
                    selected={selectedDate === opt}
                    top={opt === 'Day After' ? 'Day after' : opt}
                    bottom={dateCaption(opt)}
                    onPress={() => setSelectedDate(opt)}
                    accessibilityLabel={`${opt}, ${dateCaption(opt)}`}
                  />
                </React.Fragment>
              ))}
            </View>
          </Field>

          <Field label="Time" Icon={Clock}>
            <View style={styles.tileRow} accessibilityRole="radiogroup">
              {TIME_SLOTS.map((slot, i) => {
                const { name, range } = splitSlot(slot);
                return (
                  <React.Fragment key={slot}>
                    {i > 0 && <View style={{ width: 8 }} />}
                    <OptionTile
                      selected={selectedTimeSlot === slot}
                      top={name}
                      bottom={range}
                      onPress={() => setSelectedTimeSlot(slot)}
                      accessibilityLabel={`${name}, ${range}`}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          </Field>

          <Field label="Address" Icon={MapPin}>
            {currentAddress ? (
              <TouchableOpacity
                onPress={openAddressPicker}
                activeOpacity={0.8}
                style={styles.addrRow}
                accessibilityRole="button"
                accessibilityLabel={`${addrLabel}: ${formatAddress(currentAddress)}. Change address`}
              >
                <View style={styles.addrIcon}>
                  <AddressIcon label={currentAddress.label} />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={styles.addrTopRow}>
                    <Text style={styles.addrLabel}>{addrLabel}</Text>
                    {!!pincode && <Text style={styles.addrPin}>{pincode}</Text>}
                  </View>
                  <Text style={styles.addrText} numberOfLines={2}>
                    {formatAddress(currentAddress)}
                  </Text>
                </View>
                <Text style={styles.link}>Change</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={openAddressPicker}
                activeOpacity={0.8}
                style={[styles.addrRow, styles.addrEmpty]}
                accessibilityRole="button"
              >
                <View style={styles.addrIcon}>
                  <Plus size={16} color={C.indigo} strokeWidth={2.5} />
                </View>
                <Text style={[styles.addrLabel, { flex: 1 }]}>Add service address</Text>
              </TouchableOpacity>
            )}
          </Field>
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {errorMessage !== '' && (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <AlertCircle size={15} color={C.error} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={handleSubmitRequest}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.cta, loading && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={styles.ctaText}>Post request</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Success */}
      <Modal visible={showSuccessModal} animationType="fade" transparent onRequestClose={goToBookings}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIcon}>
              <Check size={28} color={C.success} strokeWidth={3} />
            </View>
            <Text style={styles.modalTitle}>Request posted</Text>
            <Text style={styles.modalBody}>
              Pros near you can now see your request. Their quotes will appear on the request page.
            </Text>
            <TouchableOpacity onPress={viewRequest} activeOpacity={0.88} style={[styles.cta, { alignSelf: 'stretch' }]}>
              <Text style={styles.ctaText}>View request</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToBookings} activeOpacity={0.8} style={styles.modalSecondary}>
              <Text style={styles.modalSecondaryText}>Go to my bookings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Address picker */}
      <Modal
        visible={showAddressPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddressPicker(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAddressPicker(false)} />
          <View style={[styles.pickSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.pickHead}>
              <Text style={styles.pickTitle}>Choose address</Text>
              <TouchableOpacity
                onPress={() => setShowAddressPicker(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {savedAddresses.length === 0 ? (
                <View style={styles.pickEmpty}>
                  <MapPin size={24} color={C.faint} />
                  <Text style={styles.pickEmptyText}>No saved addresses yet</Text>
                </View>
              ) : (
                <View style={styles.pickGroup}>
                  {savedAddresses.map((addr, idx) => {
                    const selected = isAddressSelected(addr);
                    const last = idx === savedAddresses.length - 1;
                    return (
                      <TouchableOpacity
                        key={addr._id || addr.id || String(idx)}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedAddress(addr);
                          setShowAddressPicker(false);
                          if (errorMessage) setErrorMessage('');
                        }}
                        style={styles.pickRow}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                      >
                        <View style={styles.addrIcon}>
                          <AddressIcon label={addr.label} />
                        </View>
                        <View style={[styles.pickRowBody, !last && styles.pickDivider]}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <View style={styles.addrTopRow}>
                              <Text style={styles.addrLabel}>{addr.label || 'Saved address'}</Text>
                              {addr.isDefault && <Text style={styles.defaultTag}>Default</Text>}
                            </View>
                            <Text style={styles.addrText} numberOfLines={2}>
                              {formatAddress(addr)}
                            </Text>
                          </View>
                          <View style={[styles.radio, selected && styles.radioOn]}>
                            {selected && <View style={styles.radioDot} />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.pickActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddressPicker(false);
                  navigation.navigate('ManageAddresses', { onSelectAddress: (a) => setSelectedAddress(a) });
                }}
                activeOpacity={0.85}
                style={styles.pickPrimary}
              >
                <Plus size={16} color={C.indigo} strokeWidth={2.5} />
                <Text style={styles.pickPrimaryText}>Add or manage</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                onPress={() => {
                  setShowAddressPicker(false);
                  navigation.navigate('LocationSetup', {
                    currentAddress,
                    onSelectAddress: (a) => setSelectedAddress(a),
                  });
                }}
                activeOpacity={0.85}
                style={styles.pickSecondary}
              >
                <NavIcon size={15} color={C.ink} />
                <Text style={styles.pickSecondaryText}>Pick on map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },

  /* Header */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40, // room for the sheet's rounded overlap
    overflow: 'hidden',
  },
  headerIconWrap: {
    position: 'absolute',
    right: -30,
    bottom: -36,
    transform: [{ rotate: '-14deg' }],
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  catTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.74)', marginTop: 2, fontWeight: '500' },

  /* One continuous white sheet */
  sheet: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 6 },

  /* Field */
  field: { marginBottom: 14 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  fieldLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },
  fieldAside: { fontSize: 12, fontWeight: '500', color: C.faint },

  /* Inputs */
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    paddingHorizontal: 12,
    fontSize: 14.5,
    color: C.ink,
  },
  textarea: { height: undefined, minHeight: 80, paddingTop: 10, paddingBottom: 10, lineHeight: 20 },
  inputFocus: { borderColor: C.indigo, borderWidth: 1.5, backgroundColor: C.white },
  inputError: { borderColor: C.error, borderWidth: 1.5, backgroundColor: C.white },

  /* Photos */
  photoRow: { alignItems: 'center' },
  addPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9FAED6',
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addPhotoText: { fontSize: 11, fontWeight: '700', color: C.indigo, marginTop: 1 },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', marginRight: 8 },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(22,26,43,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Date / time tiles */
  tileRow: { flexDirection: 'row' },
  tile: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tileOn: { backgroundColor: C.indigo, borderColor: C.indigo },
  tileTop: { fontSize: 13, fontWeight: '700', color: C.ink },
  tileBottom: { fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 1 },

  /* Address */
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 10,
  },
  addrEmpty: { borderStyle: 'dashed', borderColor: '#9FAED6', backgroundColor: C.white },
  addrIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addrTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
  addrLabel: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  addrPin: { fontSize: 12, fontWeight: '600', color: C.faint, marginLeft: 6 },
  addrText: { fontSize: 12.5, color: C.muted, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '800', color: C.indigo },

  /* Footer */
  footer: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.errorBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.error, lineHeight: 18 },
  cta: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },

  /* Success modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,26,43,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  modalBody: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  modalSecondary: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4, alignSelf: 'stretch' },
  modalSecondaryText: { fontSize: 15, fontWeight: '700', color: C.indigo },

  /* Address picker sheet */
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(22,26,43,0.5)', justifyContent: 'flex-end' },
  pickSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 8,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.line,
    alignSelf: 'center',
    marginBottom: 10,
  },
  pickHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pickTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickGroup: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: 'hidden',
  },
  pickRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: C.white },
  pickRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
  },
  pickDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  defaultTag: { fontSize: 11, fontWeight: '700', color: C.indigo, marginLeft: 6 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C3C9D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: C.indigo },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.indigo },
  pickEmpty: { alignItems: 'center', paddingVertical: 20 },
  pickEmptyText: { fontSize: 13, color: C.muted, marginTop: 6, fontWeight: '500' },
  pickActions: { flexDirection: 'row', marginTop: 12 },
  pickPrimary: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.indigoSoft,
    borderRadius: 12,
  },
  pickPrimaryText: { fontSize: 14, fontWeight: '700', color: C.indigo, marginLeft: 6 },
  pickSecondary: {
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
  },
  pickSecondaryText: { fontSize: 14, fontWeight: '700', color: C.ink, marginLeft: 6 },
});