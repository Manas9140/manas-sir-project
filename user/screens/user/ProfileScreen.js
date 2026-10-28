import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  MapPin,
  CreditCard,
  ShieldCheck,
  Headphones,
  LogOut,
  UserRound,
  Wrench,
  Pencil,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  ink: '#161A2B',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  page: '#EEF1F8',
  white: '#FFFFFF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
};

/* ---------- Helpers ---------- */
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// "+919876543210" / "9876543210" -> "+91 98765 43210"
const formatPhone = (raw) => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  if (local.length !== 10) return String(raw);
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
};

/* ---------- Pieces ---------- */
function Group({ title, children }) {
  return (
    <View style={styles.groupWrap}>
      {!!title && (
        <Text style={styles.groupTitle} accessibilityRole="header">
          {title}
        </Text>
      )}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Row({ icon: Icon, title, sub, onPress, last, tag, danger }) {
  return (
    <TouchableHighlight onPress={onPress} underlayColor="#F1F3F8" accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.row}>
        <View style={[styles.rowIcon, danger && { backgroundColor: C.errorBg }]}>
          <Icon size={17} color={danger ? C.error : C.indigo} strokeWidth={2} />
        </View>
        <View style={[styles.rowBody, !last && styles.rowDivider]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.rowTitleLine}>
              <Text style={[styles.rowTitle, danger && { color: C.error }]}>{title}</Text>
              {!!tag && <Text style={styles.tag}>{tag}</Text>}
            </View>
            {!!sub && (
              <Text style={styles.rowSub} numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>
          {!danger && <ChevronRight size={17} color="#C3C9D6" />}
        </View>
      </View>
    </TouchableHighlight>
  );
}

/* ---------- Screen ---------- */
export default function ProfileScreen({ navigation }) {
  const { user, logout, switchMode } = useAuth();
  const [switching, setSwitching] = useState(false);

  const name = user?.name?.trim() || '';
  const phone = formatPhone(user?.phone);

  const goToOnboarding = (mobileNumber) =>
    navigation.navigate('VendorOnboarding', { mobileNumber: mobileNumber || user?.phone || '' });

  const handleSwitchToPartner = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      const res = await switchMode('vendor');
      if (res?.requiresOnboarding) {
        goToOnboarding(res.mobileNumber);
      } else if (!res?.success) {
        Alert.alert(
          'Become a service partner',
          'Register your business to get local job leads and send quotes.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Register', onPress: () => goToOnboarding() },
          ]
        );
      }
    } catch (e) {
      Alert.alert('Couldn’t switch to partner mode', 'Check your internet connection and try again.');
    } finally {
      setSwitching(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You’ll need your mobile number and a code to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // This screen sits inside the tab navigator, so reset from the root stack
          let root = navigation;
          while (root?.getParent?.()) root = root.getParent();
          try {
            root.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch (e) {
            // If the app swaps navigators on logout, AuthContext already handled it
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <UserRound size={170} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Account
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.85}
          style={styles.profileRow}
          accessibilityRole="button"
          accessibilityLabel={`${name || 'Your profile'}${phone ? `, ${phone}` : ''}. Edit profile`}
        >
          <View style={styles.avatar}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
            ) : name ? (
              <Text style={styles.avatarText}>{initials(name)}</Text>
            ) : (
              <UserRound size={24} color={C.white} />
            )}
          </View>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.name} numberOfLines={1}>
              {name || 'Add your name'}
            </Text>
            {!!phone && <Text style={styles.phone}>{phone}</Text>}
          </View>
          <View style={styles.editPill}>
            <Pencil size={12} color={C.white} />
            <Text style={styles.editText}>Edit</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Partner */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerIcon}>
              <Wrench size={18} color={C.indigo} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.partnerTitle}>Earn as a service partner</Text>
              <Text style={styles.partnerSub}>Get local job leads and send quotes</Text>
            </View>
            <TouchableOpacity
              onPress={handleSwitchToPartner}
              disabled={switching}
              activeOpacity={0.85}
              style={styles.partnerBtn}
              accessibilityRole="button"
              accessibilityLabel="Switch to partner mode"
              accessibilityState={{ busy: switching }}
            >
              {switching ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={styles.partnerBtnText}>Switch</Text>
              )}
            </TouchableOpacity>
          </View>

          <Group title="Your account">
            <Row
              icon={MapPin}
              title="Saved addresses"
              sub="Add or edit where you need service"
              onPress={() => navigation.navigate('ManageAddresses')}
            />
            <Row
              icon={CreditCard}
              title="Payment options"
              sub="Pay by cash or UPI to your pro for now"
              tag="Soon"
              last
              onPress={() =>
                Alert.alert(
                  'Payment options',
                  'Online payments are coming in a future update. For now, pay your pro by cash or UPI after the job.'
                )
              }
            />
          </Group>

          <Group title="Help and privacy">
            <Row
              icon={Headphones}
              title="Help and support"
              sub="FAQs and WhatsApp support"
              onPress={() => navigation.navigate('CustomerSupport')}
            />
            <Row
              icon={ShieldCheck}
              title="Privacy and safety"
              sub="Privacy settings, terms and your data"
              last
              onPress={() => navigation.navigate('SafetyPrivacy')}
            />
          </Group>

          <Group>
            <Row icon={LogOut} title="Sign out" danger last onPress={handleSignOut} />
          </Group>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },

  /* Header */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 42,
    overflow: 'hidden',
  },
  headerIconWrap: { position: 'absolute', right: -34, bottom: -40, transform: [{ rotate: '-14deg' }] },
  title: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: -0.8, marginBottom: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: C.white, fontSize: 19, fontWeight: '800' },
  name: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  phone: { color: 'rgba(255,255,255,0.74)', fontSize: 13.5, fontWeight: '500', marginTop: 2 },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editText: { color: C.white, fontSize: 12.5, fontWeight: '700', marginLeft: 5 },

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

  /* Partner card */
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD3EE',
    padding: 12,
    marginBottom: 6,
  },
  partnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partnerTitle: { fontSize: 14.5, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  partnerSub: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  partnerBtn: {
    minWidth: 72,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerBtnText: { color: C.white, fontSize: 13.5, fontWeight: '800' },

  /* Groups */
  groupWrap: { marginTop: 12 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: C.muted, marginLeft: 4, marginBottom: 6 },
  group: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: C.white },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    paddingVertical: 11,
    paddingRight: 12,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: C.ink },
  rowSub: { fontSize: 12.5, color: C.muted, marginTop: 2 },
  tag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.muted,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
    overflow: 'hidden',
  },
});