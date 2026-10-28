import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  BadgeCheck,
  Star,
  Store,
  Wrench,
  MapPin,
  CreditCard,
  FileCheck,
  Bell,
  Languages,
  Headphones,
  HelpCircle,
  MessageSquareHeart,
  Shield,
  FileText,
  LogOut,
  Trash2,
  ShoppingBag,
  ChevronRight,
  Phone,
  MessageCircle,
  Mail,
  X,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { updateVendorProfileApi } from '../../services/api';

/* ---------- App config: replace with your real details ---------- */
const SUPPORT = {
  phone: '+919999999999',
  whatsapp: '919999999999',
  email: 'support@localservices.in',
  hours: 'Every day, 8 AM to 10 PM',
};
const LINKS = {
  privacy: 'https://localservices.in/privacy',
  terms: 'https://localservices.in/terms',
  help: 'https://localservices.in/help/partners',
  rate: 'https://play.google.com/store/apps/details?id=com.localservices.app',
};
// Screen names in your navigator.
const ROUTES = {
  businessDetails: 'BusinessDetails',
  services: 'ServicesManagement',
  addresses: 'ServiceAreas',
  payout: 'PaymentOptions',
  documents: 'DocumentsVerification',
  customerCare: 'CustomerCare',
  help: 'HelpAndFaq',
  terms: 'TermsAndConditions',
  privacy: 'PrivacyPolicy',
};
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
];

const C = {
  amber: '#FFB800',
  amberSoft: '#FFF6DC',
  amberDeep: '#8A6400',
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  ink: '#161A2B',
  inkSub: 'rgba(22,26,43,0.7)',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  white: '#FFFFFF',
  green: '#16A34A',
  greenSoft: '#E9F8EF',
  red: '#C8264E',
  redSoft: '#FDF0F3',
};

const initials = (s = '') =>
  s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'P';

const formatPhone = (p = '') => {
  const d = String(p).replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p || '';
};

// True if `name` is registered in this navigator or any parent navigator
const canNavigate = (navigation, name) => {
  let nav = navigation;
  while (nav) {
    if (nav.getState?.()?.routeNames?.includes(name)) return true;
    nav = nav.getParent?.();
  }
  return false;
};

/* ---------- Menu pieces ---------- */
function MenuRow({ Icon, label, value, onPress, right, last, tint = C.ink, iconBg = C.field }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[styles.row, !last && styles.rowDivider]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: tint === C.red ? C.red : C.ink }]}>{label}</Text>
        {!!value && (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      {right !== undefined ? right : onPress ? <ChevronRight size={18} color={C.faint} /> : null}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </>
  );
}

export default function VendorProfileScreen({ navigation }) {
  const { user, token, logout, switchMode } = useAuth();
  const insets = useSafeAreaInsets();

  const [isOnline, setIsOnline] = useState(Boolean(user?.isOnline ?? true));
  const [switching, setSwitching] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'en');

  /* ---------- Existing logic ---------- */
  const handleToggleOnline = async (val) => {
    setIsOnline(val);
    try {
      await updateVendorProfileApi(token, { isOnline: val });
    } catch (e) {
      console.warn('Failed to update online status', e);
    }
  };

  const handleSwitchToCustomer = async () => {
    setSwitching(true);
    const res = await switchMode('customer');
    setSwitching(false);
    if (!res.success) {
      Alert.alert('Could not switch', res.message || 'Could not switch to customer mode. Try again.');
    }
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    await logout();
  };

  /* ---------- Actions ---------- */
  const go = (key) => {
    const name = ROUTES[key];
    if (canNavigate(navigation, name)) navigation.navigate(name);
    else Alert.alert('Coming soon', 'This section will be available in the next update.');
  };

  const openUrl = async (url, fallbackMsg = 'Could not open this link. Try again later.') => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Not available', fallbackMsg);
    } catch {
      Alert.alert('Not available', fallbackMsg);
    }
  };

  const callSupport = () => openUrl(`tel:${SUPPORT.phone}`, 'Calling is not available on this device.');
  const whatsappSupport = () => {
    const msg = encodeURIComponent(`Hi, I'm a partner (${user?.businessName || user?.name || ''}). I need help with `);
    openUrl(`whatsapp://send?phone=${SUPPORT.whatsapp}&text=${msg}`, 'WhatsApp is not installed on this phone.');
  };
  const emailSupport = (subject = 'Partner support') => {
    const body = encodeURIComponent(
      `\n\n---\nName: ${user?.name || ''}\nBusiness: ${user?.businessName || ''}\nMobile: ${formatPhone(
        user?.phone || user?.mobileNumber
      )}`
    );
    openUrl(`mailto:${SUPPORT.email}?subject=${encodeURIComponent(subject)}&body=${body}`, 'No email app found on this phone.');
  };

  const requestDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This removes your partner profile, job history and payout details. Our team will confirm by email within 7 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request deletion', style: 'destructive', onPress: () => emailSupport('Account deletion request') },
      ]
    );
  };

  const chooseLanguage = async (code) => {
    setLanguage(code);
    setLanguageOpen(false);
    try {
      await updateVendorProfileApi(token, { language: code });
    } catch (e) {
      console.warn('Failed to save language', e);
    }
  };

  /* ---------- Derived ---------- */
  const displayName = user?.businessName || user?.name || 'Partner business';
  const rating = user?.rating ? Number(user.rating).toFixed(1) : null;
  const reviews = user?.reviewCount ?? user?.totalReviews;
  const skills = user?.subServices || [];
  const skillsText = skills.length
    ? skills.slice(0, 2).join(', ') + (skills.length > 2 ? ` +${skills.length - 2} more` : '')
    : 'Add the work you do';
  const address =
    [user?.address?.street, user?.address?.city, user?.address?.pincode].filter(Boolean).join(', ') ||
    'Add your shop address';
  const phone = formatPhone(user?.phone || user?.mobileNumber);
  const languageLabel = LANGUAGES.find((l) => l.code === language)?.label || 'English';
  const version = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.amber }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.amber} />
      <ScrollView
        style={{ backgroundColor: C.field }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity header */}
        <View style={styles.header}>
          <View style={styles.inner}>
            <View style={styles.idRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user?.name || displayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={2}>
                    {displayName}
                  </Text>
                  <BadgeCheck size={20} color={C.ink} style={{ marginLeft: 6 }} />
                </View>
                <Text style={styles.trade}>
                  {user?.category || 'Service partner'}
                  {user?.experienceYears ? `, ${user.experienceYears}` : ''}
                </Text>
                {!!phone && <Text style={styles.phone}>{phone}</Text>}
              </View>
            </View>

            <View style={styles.ratingPill}>
              <Star size={14} color={C.ink} fill={C.ink} />
              <Text style={styles.ratingText}>
                {rating ? `${rating} rating` : 'New partner'}
                {rating && reviews ? `  ·  ${reviews} reviews` : ''}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{user?.baseVisitingCharge || 150}</Text>
                <Text style={styles.statLabel}>Visit fee</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user?.serviceRadiusKm || 10} km</Text>
                <Text style={styles.statLabel}>Travel area</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{user?.pincodes?.[0] || '—'}</Text>
                <Text style={styles.statLabel}>Pincode</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.inner, styles.body]}>
          {/* Availability */}
          <View style={styles.card}>
            <MenuRow
              Icon={Bell}
              tint={isOnline ? C.green : C.muted}
              iconBg={isOnline ? C.greenSoft : C.field}
              label={isOnline ? 'Accepting jobs' : 'Not accepting jobs'}
              value={isOnline ? 'New jobs in your area reach you instantly' : 'Turn on to get job alerts'}
              last
              right={
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: '#CBD2DE', true: C.green }}
                  thumbColor={C.white}
                  ios_backgroundColor="#CBD2DE"
                  accessibilityLabel="Accepting jobs"
                />
              }
            />
          </View>

          <Section title="Your business">
            <MenuRow
              Icon={Store}
              label="Business details"
              value={`${displayName}${user?.email ? `, ${user.email}` : ''}`}
              onPress={() => go('businessDetails')}
            />
            <MenuRow Icon={Wrench} label="Services and pricing" value={skillsText} onPress={() => go('services')} />
            <MenuRow Icon={MapPin} label="Addresses and service area" value={address} onPress={() => go('addresses')} />
            <MenuRow
              Icon={CreditCard}
              label="Payouts and UPI"
              value={user?.upiId || 'Add a UPI ID to get paid'}
              onPress={() => go('payout')}
            />
            <MenuRow
              Icon={FileCheck}
              label="Documents and verification"
              value={user?.isVerified === false ? 'Upload Aadhaar to get verified' : 'Verified partner'}
              onPress={() => go('documents')}
              last
            />
          </Section>

          <Section title="Settings">
            <MenuRow
              Icon={Bell}
              label="Notifications and permissions"
              value="Job alert sound, location access"
              onPress={() => Linking.openSettings()}
            />
            <MenuRow
              Icon={Languages}
              label="App language"
              value={languageLabel}
              onPress={() => setLanguageOpen(true)}
              last
            />
          </Section>

          <Section title="Help and support">
            <MenuRow
              Icon={Headphones}
              tint={C.amberDeep}
              iconBg={C.amberSoft}
              label="Customer care"
              value="Call, WhatsApp or in-app ticket"
              onPress={() => go('customerCare')}
            />
            <MenuRow
              Icon={HelpCircle}
              label="Help and FAQs"
              value="Quotes, payouts, OTP and more"
              onPress={() => go('help')}
            />
            <MenuRow Icon={MessageSquareHeart} label="Rate the app" onPress={() => openUrl(LINKS.rate)} last />
          </Section>

          <Section title="Legal">
            <MenuRow Icon={Shield} label="Privacy policy" onPress={() => go('privacy')} />
            <MenuRow Icon={FileText} label="Terms of service" onPress={() => go('terms')} last />
          </Section>

          {/* Customer mode */}
          <TouchableOpacity
            onPress={handleSwitchToCustomer}
            disabled={switching}
            activeOpacity={0.9}
            style={styles.switchCard}
            accessibilityRole="button"
          >
            <View style={styles.switchIcon}>
              <ShoppingBag size={18} color={C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Need a service yourself?</Text>
              <Text style={styles.switchSub}>Switch to customer mode to book a pro.</Text>
            </View>
            {switching ? <ActivityIndicator color={C.white} /> : <ChevronRight size={20} color={C.white} />}
          </TouchableOpacity>

          {/* Account actions */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <MenuRow
              Icon={LogOut}
              tint={C.red}
              iconBg={C.redSoft}
              label="Sign out"
              onPress={() => setLogoutModalVisible(true)}
              right={null}
            />
            <MenuRow
              Icon={Trash2}
              tint={C.red}
              iconBg={C.redSoft}
              label="Delete account"
              onPress={requestDeleteAccount}
              right={null}
              last
            />
          </View>

          <Text style={styles.version}>LocalServices Partner  ·  Version {version}</Text>
        </View>
      </ScrollView>

      {/* Customer care sheet */}
      <Modal visible={supportOpen} animationType="slide" transparent onRequestClose={() => setSupportOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSupportOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Customer care</Text>
                <Text style={styles.sheetSub}>{SUPPORT.hours}</Text>
              </View>
              <TouchableOpacity onPress={() => setSupportOpen(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <MenuRow
                Icon={Phone}
                tint={C.amberDeep}
                iconBg={C.amberSoft}
                label="Call us"
                value={formatPhone(SUPPORT.phone)}
                onPress={callSupport}
              />
              <MenuRow
                Icon={MessageCircle}
                tint={C.green}
                iconBg={C.greenSoft}
                label="Chat on WhatsApp"
                value="Usually replies in a few minutes"
                onPress={whatsappSupport}
              />
              <MenuRow Icon={Mail} label="Email us" value={SUPPORT.email} onPress={() => emailSupport()} last />
            </View>
            <Text style={styles.sheetNote}>
              For a problem with a specific job, keep the customer's name and job date ready.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Language sheet */}
      <Modal visible={languageOpen} animationType="slide" transparent onRequestClose={() => setLanguageOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setLanguageOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { flex: 1 }]}>App language</Text>
              <TouchableOpacity onPress={() => setLanguageOpen(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {LANGUAGES.map((l, i) => {
                const sel = l.code === language;
                return (
                  <TouchableOpacity
                    key={l.code}
                    onPress={() => chooseLanguage(l.code)}
                    activeOpacity={0.7}
                    style={[styles.langRow, i < LANGUAGES.length - 1 && styles.rowDivider]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.langLabel}>{l.label}</Text>
                      {!!l.sub && <Text style={styles.rowValue}>{l.sub}</Text>}
                    </View>
                    <View style={[styles.radio, sel && styles.radioOn]}>
                      {sel && <Check size={13} color={C.ink} strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign out confirm */}
      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <LogOut size={22} color={C.red} />
            </View>
            <Text style={styles.dialogTitle}>Sign out of this phone?</Text>
            <Text style={styles.dialogSub}>You won't get job alerts until you sign in again.</Text>
            <View style={styles.dialogRow}>
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.dialogBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelText}>Stay signed in</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogoutConfirm} style={[styles.dialogBtn, styles.confirmBtn]}>
                <Text style={styles.confirmText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },

  /* Header */
  header: {
    backgroundColor: C.amber,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: C.amber },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.4, flexShrink: 1 },
  trade: { fontSize: 13, color: C.inkSub, fontWeight: '600', marginTop: 3 },
  phone: { fontSize: 13, color: C.inkSub, fontWeight: '600', marginTop: 1 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  ratingText: { fontSize: 13, fontWeight: '800', color: C.ink },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: C.line },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 16 },
  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  section: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 10, marginLeft: 2 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, minHeight: 60 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowValue: { fontSize: 13, color: C.muted, marginTop: 2 },

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigo,
    borderRadius: 18,
    padding: 16,
    marginTop: 24,
  },
  switchIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  switchTitle: { fontSize: 15, fontWeight: '800', color: C.white },
  switchSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  version: { fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 20 },

  /* Bottom sheets */
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(22,26,43,0.5)' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: C.field,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  sheetSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  sheetNote: { fontSize: 12, color: C.muted, marginTop: 12, marginHorizontal: 4, lineHeight: 17 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, minHeight: 60 },
  langLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: C.amber, borderColor: C.amber },

  /* Dialog */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,26,43,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { width: '100%', maxWidth: 340, backgroundColor: C.white, borderRadius: 24, padding: 22, alignItems: 'center' },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 14, textAlign: 'center' },
  dialogSub: { fontSize: 14, color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  dialogRow: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  dialogBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: C.field },
  cancelText: { fontSize: 14, fontWeight: '800', color: C.ink },
  confirmBtn: { backgroundColor: C.red },
  confirmText: { fontSize: 14, fontWeight: '800', color: C.white },
});