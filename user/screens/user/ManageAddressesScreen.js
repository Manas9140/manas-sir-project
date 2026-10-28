import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, MapPin, Home, Briefcase, Trash2, Pencil, X, Check, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  getSavedAddressesApi,
  addSavedAddressApi,
  updateSavedAddressApi,
  deleteSavedAddressApi,
  setDefaultAddressApi,
} from '../../services/api';

const ASYNC_ADDR_KEY = '@user_saved_addresses';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  ink: '#161A2B',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  hair: '#EEF1F6',
  field: '#F5F7FB',
  page: '#EEF1F8',
  white: '#FFFFFF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
};

const LABELS = [
  { value: 'Home', Icon: Home },
  { value: 'Work', Icon: Briefcase },
  { value: 'Other', Icon: MapPin },
];

const EMPTY_FORM = { label: 'Home', houseNo: '', area: '', landmark: '', city: '', state: '', pincode: '', isDefault: false };

/* ---------- Helpers ---------- */
const idOf = (a) => a?.id || a?._id;
// Ids that only exist on this phone (profile fallback, offline saves, old Date.now() ids)
const isLocalId = (id) => !id || /^(primary|local_)/.test(String(id)) || /^\d{13}$/.test(String(id));

const formatAddress = (a) =>
  a.formattedAddress ||
  [a.houseNo, a.area || a.street, a.landmark ? `near ${a.landmark}` : null, a.city, a.pincode].filter(Boolean).join(', ');

const LabelIcon = ({ label, size = 17, color = C.indigo }) => {
  const l = (label || '').toLowerCase();
  if (l === 'home') return <Home size={size} color={color} />;
  if (l === 'work') return <Briefcase size={size} color={color} />;
  return <MapPin size={size} color={color} />;
};

/* ---------- Pieces ---------- */
function AddressCard({ addr, selectMode, onSelect, onEdit, onDelete, onSetDefault }) {
  return (
    <TouchableOpacity
      activeOpacity={selectMode ? 0.75 : 1}
      disabled={!selectMode}
      onPress={onSelect}
      style={[styles.card, addr.isDefault && styles.cardDefault]}
      accessibilityRole={selectMode ? 'button' : undefined}
      accessibilityLabel={`${addr.label || 'Address'}${addr.isDefault ? ', default' : ''}: ${formatAddress(addr)}${selectMode ? '. Use this address' : ''}`}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <LabelIcon label={addr.label} />
        </View>
        <View style={{ flex: 1, marginRight: 6 }}>
          <View style={styles.labelLine}>
            <Text style={styles.cardLabel}>{addr.label || 'Saved address'}</Text>
            {addr.isDefault && (
              <View style={styles.defaultTag}>
                <Check size={10} color={C.indigo} strokeWidth={3} />
                <Text style={styles.defaultTagText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardText} numberOfLines={2}>
            {formatAddress(addr)}
          </Text>
          {!addr.isDefault && (
            <TouchableOpacity onPress={onSetDefault} hitSlop={{ top: 8, bottom: 8 }} style={{ alignSelf: 'flex-start' }}>
              <Text style={styles.setDefault}>Set as default</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.iconBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${addr.label || 'address'}`}
        >
          <Pencil size={16} color={C.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.iconBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${addr.label || 'address'}`}
        >
          <Trash2 size={16} color={C.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function Field({ label, aside, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <View style={styles.fieldHead}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {!!aside && <Text style={styles.fieldAside}>{aside}</Text>}
      </View>
      {children}
    </View>
  );
}

/* ---------- Screen ---------- */
export default function ManageAddressesScreen({ navigation, route }) {
  const { user, token, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const onSelectAddress = route?.params?.onSelectAddress;
  const selectMode = !!onSelectAddress;

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [focused, setFocused] = useState('');

  const setField = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (formError) setFormError('');
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  /* ---------- Load (same sources as before) ---------- */
  const loadAddresses = async () => {
    setLoading(true);
    let loaded = [];

    if (token) {
      try {
        const res = await getSavedAddressesApi(token);
        if (res?.success && Array.isArray(res.addresses)) loaded = res.addresses.map((a) => ({ id: idOf(a), ...a }));
      } catch (e) {
        console.warn('Backend address fetch error:', e);
      }
    }
    if (loaded.length === 0) {
      try {
        const cached = await AsyncStorage.getItem(ASYNC_ADDR_KEY);
        if (cached) loaded = JSON.parse(cached);
      } catch (e) {}
    }
    const ad = user?.addressDetails;
    if (loaded.length === 0 && (ad?.formattedAddress || ad?.area || ad?.city)) {
      loaded = [
        {
          id: 'primary-1',
          label: ad.label || 'Home',
          houseNo: ad.houseNo || '',
          area: ad.area || ad.street || '',
          landmark: ad.landmark || '',
          city: ad.city || '',
          state: ad.state || '',
          pincode: ad.pincode || '',
          formattedAddress: ad.formattedAddress || '',
          isDefault: true,
        },
      ];
    }
    if (loaded.length > 0 && !loaded.some((a) => a.isDefault)) loaded[0] = { ...loaded[0], isDefault: true };

    setAddresses(loaded);
    setLoading(false);
  };

  const persistAddresses = async (list) => {
    setAddresses(list);
    try {
      await AsyncStorage.setItem(ASYNC_ADDR_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed saving address to storage:', e);
    }
    const def = list.find((a) => a.isDefault) || list[0];
    updateUser?.(
      def
        ? {
            savedAddresses: list,
            addressDetails: {
              houseNo: def.houseNo || '',
              street: def.area || def.houseNo || '',
              area: def.area || '',
              landmark: def.landmark || '',
              city: def.city || '',
              state: def.state || '',
              pincode: def.pincode || '',
              formattedAddress: def.formattedAddress || '',
              label: def.label || 'Home',
            },
          }
        : { savedAddresses: list }
    );
  };

  /* ---------- Sheet ---------- */
  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      city: user?.addressDetails?.city || '',
      state: user?.addressDetails?.state || '',
      isDefault: addresses.length === 0,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (a) => {
    setEditingId(idOf(a));
    setForm({
      label: a.label || 'Home',
      houseNo: a.houseNo || '',
      area: a.area || a.street || '',
      landmark: a.landmark || '',
      city: a.city || '',
      state: a.state || '',
      pincode: a.pincode || '',
      isDefault: !!a.isDefault,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    if (!f.houseNo && !f.area) return setFormError('Add a house number or the road and area.');
    if (!f.city) return setFormError('Add the city.');
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) return setFormError('Pincode should be 6 digits.');

    const formattedAddress = [f.houseNo, f.area, f.landmark ? `near ${f.landmark}` : null, f.city]
      .filter(Boolean)
      .join(', ')
      .concat(f.pincode ? ` ${f.pincode}` : '');
    const payload = { ...f, formattedAddress, isDefault: f.isDefault || addresses.length === 0 };

    setSaving(true);
    try {
      let savedId = editingId;
      if (token) {
        // Addresses that only exist on this phone get created on the server instead of updated
        const res =
          editingId && !isLocalId(editingId)
            ? await updateSavedAddressApi(token, editingId, payload)
            : await addSavedAddressApi(token, payload);
        if (res && res.success === false) throw new Error(res.message || 'Save failed');
        if (!editingId || isLocalId(editingId)) {
          const added = res?.address || res?.addresses?.[res.addresses.length - 1];
          savedId = idOf(added) || savedId;
        }
      }
      if (!savedId) savedId = `local_${Date.now()}`;

      const saved = { ...payload, id: savedId };
      const base = payload.isDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses;
      const list = editingId
        ? base.map((a) => (idOf(a) === editingId ? { ...a, ...saved } : a))
        : [...base, saved];

      await persistAddresses(list);
      setShowModal(false);

      // Added from the booking flow: use it straight away
      if (!editingId && selectMode) {
        onSelectAddress(saved);
        navigation.goBack();
      }
    } catch (err) {
      console.warn('Error saving address:', err);
      setFormError('Couldn’t save this address. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Row actions ---------- */
  const handleSetDefault = async (targetId) => {
    try {
      if (token && !isLocalId(targetId)) {
        const res = await setDefaultAddressApi(token, targetId);
        if (res && res.success === false) throw new Error(res.message);
      }
      await persistAddresses(addresses.map((a) => ({ ...a, isDefault: idOf(a) === targetId })));
    } catch (e) {
      Alert.alert('Couldn’t change your default', 'Check your connection and try again.');
    }
  };

  const handleDelete = (addr) => {
    const targetId = idOf(addr);
    Alert.alert('Delete this address?', formatAddress(addr), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (token && !isLocalId(targetId)) {
              const res = await deleteSavedAddressApi(token, targetId);
              if (res && res.success === false) throw new Error(res.message);
            }
            const remaining = addresses.filter((a) => idOf(a) !== targetId);
            if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
              remaining[0] = { ...remaining[0], isDefault: true };
            }
            await persistAddresses(remaining);
          } catch (e) {
            Alert.alert('Couldn’t delete this address', 'Check your connection and try again.');
          }
        },
      },
    ]);
  };

  /* ---------- Render ---------- */
  const subtitle = selectMode
    ? 'Tap an address to use it for this booking'
    : addresses.length
    ? `${addresses.length} saved ${addresses.length === 1 ? 'address' : 'addresses'}`
    : 'Where you need service';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <MapPin size={150} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
        </View>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={C.white} />
          </TouchableOpacity>
          {addresses.length > 0 && (
            <TouchableOpacity onPress={openAddModal} style={styles.addPill} accessibilityRole="button">
              <Plus size={15} color={C.indigo} strokeWidth={2.6} />
              <Text style={styles.addPillText}>Add new</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Saved addresses
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* List */}
      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.indigo} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {addresses.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <MapPin size={24} color={C.indigo} />
                </View>
                <Text style={styles.emptyTitle}>No saved addresses</Text>
                <Text style={styles.emptyBody}>Save your home or work address so booking takes a few taps.</Text>
                <TouchableOpacity onPress={openAddModal} style={styles.emptyBtn} accessibilityRole="button">
                  <Plus size={16} color={C.white} style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>Add address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map((addr, i) => (
                <AddressCard
                  key={idOf(addr) || i}
                  addr={addr}
                  selectMode={selectMode}
                  onSelect={() => {
                    onSelectAddress?.(addr);
                    navigation.goBack();
                  }}
                  onEdit={() => openEditModal(addr)}
                  onDelete={() => handleDelete(addr)}
                  onSetDefault={() => handleSetDefault(idOf(addr))}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Add / edit sheet */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => !saving && setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !saving && setShowModal(false)} />
          <View style={styles.formSheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{editingId ? 'Edit address' : 'New address'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="Save as">
                <View style={styles.chipRow} accessibilityRole="radiogroup">
                  {LABELS.map(({ value, Icon }, i) => {
                    const on = form.label === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setField('label')(value)}
                        style={[styles.chip, on && styles.chipOn, i > 0 && { marginLeft: 8 }]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                      >
                        <Icon size={15} color={on ? C.white : C.ink} />
                        <Text style={[styles.chipText, on && { color: C.white }]}>{value}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>

              <Field label="House or flat number">
                <TextInput
                  value={form.houseNo}
                  onChangeText={setField('houseNo')}
                  onFocus={() => setFocused('houseNo')}
                  onBlur={() => setFocused('')}
                  placeholder="e.g. B-402, Shanti Apartments"
                  placeholderTextColor={C.faint}
                  style={[styles.input, focused === 'houseNo' && styles.inputFocus]}
                />
              </Field>

              <Field label="Road and area">
                <TextInput
                  value={form.area}
                  onChangeText={setField('area')}
                  onFocus={() => setFocused('area')}
                  onBlur={() => setFocused('')}
                  placeholder="e.g. Ghod Dod Road, Athwa"
                  placeholderTextColor={C.faint}
                  style={[styles.input, focused === 'area' && styles.inputFocus]}
                />
              </Field>

              <Field label="Landmark" aside="Optional">
                <TextInput
                  value={form.landmark}
                  onChangeText={setField('landmark')}
                  onFocus={() => setFocused('landmark')}
                  onBlur={() => setFocused('')}
                  placeholder="e.g. Opposite City Light mall"
                  placeholderTextColor={C.faint}
                  style={[styles.input, focused === 'landmark' && styles.inputFocus]}
                />
              </Field>

              <View style={{ flexDirection: 'row' }}>
                <Field label="City" style={{ flex: 1, marginRight: 8 }}>
                  <TextInput
                    value={form.city}
                    onChangeText={setField('city')}
                    onFocus={() => setFocused('city')}
                    onBlur={() => setFocused('')}
                    placeholder="City"
                    placeholderTextColor={C.faint}
                    style={[styles.input, focused === 'city' && styles.inputFocus]}
                  />
                </Field>
                <Field label="Pincode" style={{ width: 120 }}>
                  <TextInput
                    value={form.pincode}
                    onChangeText={(v) => setField('pincode')(v.replace(/\D/g, ''))}
                    onFocus={() => setFocused('pincode')}
                    onBlur={() => setFocused('')}
                    placeholder="395007"
                    placeholderTextColor={C.faint}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.input, focused === 'pincode' && styles.inputFocus]}
                  />
                </Field>
              </View>

              <Field label="State" aside="Optional">
                <TextInput
                  value={form.state}
                  onChangeText={setField('state')}
                  onFocus={() => setFocused('state')}
                  onBlur={() => setFocused('')}
                  placeholder="e.g. Gujarat"
                  placeholderTextColor={C.faint}
                  style={[styles.input, focused === 'state' && styles.inputFocus]}
                />
              </Field>

              <TouchableOpacity
                onPress={() => setField('isDefault')(!form.isDefault)}
                style={styles.checkRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: form.isDefault }}
              >
                <View style={[styles.checkbox, form.isDefault && styles.checkboxOn]}>
                  {form.isDefault && <Check size={13} color={C.white} strokeWidth={3} />}
                </View>
                <Text style={styles.checkText}>Use as my default address</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              {!!formError && (
                <View style={styles.errorBox} accessibilityLiveRegion="polite">
                  <AlertCircle size={15} color={C.error} style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.88}
                style={[styles.saveBtn, saving && { opacity: 0.85 }]}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>{editingId ? 'Save changes' : 'Save address'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: { backgroundColor: C.indigo, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40, overflow: 'hidden' },
  headerIconWrap: { position: 'absolute', right: -30, bottom: -40, transform: [{ rotate: '-14deg' }] },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.white,
  },
  addPillText: { color: C.indigo, fontSize: 13, fontWeight: '800', marginLeft: 4 },
  title: { fontSize: 24, fontWeight: '800', color: C.white, letterSpacing: -0.6 },
  subtitle: { fontSize: 13.5, color: 'rgba(255,255,255,0.74)', marginTop: 2, fontWeight: '500' },

  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: C.page,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  content: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 28 },

  /* Address card */
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 10,
  },
  cardDefault: { borderColor: '#B9C3E8', borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  labelLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  cardLabel: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigoSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  defaultTagText: { fontSize: 10.5, fontWeight: '800', color: C.indigo, marginLeft: 3 },
  cardText: { fontSize: 13, color: C.muted, lineHeight: 18 },
  setDefault: { fontSize: 12.5, fontWeight: '700', color: C.indigo, marginTop: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  /* Empty */
  empty: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  emptyBody: { fontSize: 13.5, color: C.muted, textAlign: 'center', marginTop: 4, lineHeight: 19, maxWidth: 270 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: C.indigo,
    marginTop: 16,
  },
  emptyBtnText: { color: C.white, fontSize: 14.5, fontWeight: '800' },

  /* Form sheet */
  backdrop: { flex: 1, backgroundColor: 'rgba(22,26,43,0.5)', justifyContent: 'flex-end' },
  formSheet: {
    maxHeight: '90%',
    backgroundColor: C.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: { marginBottom: 12 },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  fieldLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },
  fieldAside: { fontSize: 12, color: C.faint, fontWeight: '500' },
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
  inputFocus: { borderColor: C.indigo, borderWidth: 1.5, backgroundColor: C.white },

  chipRow: { flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
  },
  chipOn: { backgroundColor: C.indigo, borderColor: C.indigo },
  chipText: { fontSize: 13.5, fontWeight: '700', color: C.ink, marginLeft: 6 },

  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C3C9D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: C.indigo, borderColor: C.indigo },
  checkText: { fontSize: 13.5, fontWeight: '600', color: C.ink },

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
  saveBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveText: { color: C.white, fontSize: 15, fontWeight: '800' },
});