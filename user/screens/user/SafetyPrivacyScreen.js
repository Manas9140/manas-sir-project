import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  Linking,
  StatusBar,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  MessageSquare,
  UserCheck,
  Wallet,
  PhoneCall,
  Siren,
  Headphones,
  FileText,
  ScrollText,
  UserX,
  ChevronRight,
} from 'lucide-react-native';

/* ---------- Fill these in before release ---------- */
// ⚠️ Confirm this is your real, staffed number. Leave '' to hide the button.
const SAFETY_HELPLINE = '18002008899';
const PRIVACY_URL = ''; // e.g. 'https://yourdomain.in/privacy' (row hidden while empty)
const TERMS_URL = ''; // e.g. 'https://yourdomain.in/terms'

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

const SAFETY_POINTS = [
  {
    icon: KeyRound,
    title: 'Jobs start with your code',
    body: 'Share your 4-digit start code only after the pro reaches your door. Work can’t begin without it.',
  },
  {
    icon: MessageSquare,
    title: 'Chat stays in the app',
    body: 'Your phone number isn’t shared with pros. Plan the visit through in-app chat.',
  },
  {
    icon: UserCheck,
    title: 'Verified partners',
    body: 'Partners complete ID and background checks before they can take jobs.',
  },
  {
    icon: Wallet,
    title: 'Never pay in advance',
    body: 'Pay the agreed amount only after the job is done. Report anyone who asks for money upfront.',
  },
];

const dial = (number) =>
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert('Can’t open the dialer', `Call ${number} from your phone app.`)
  );

const openUrl = (url) =>
  Linking.openURL(url).catch(() => Alert.alert('Can’t open this page', 'Check your connection and try again.'));

/* ---------- Pieces ---------- */
function Group({ title, children }) {
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function LinkRow({ icon: Icon, title, sub, onPress, last, danger }) {
  return (
    <TouchableHighlight onPress={onPress} underlayColor="#F1F3F8" accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.row}>
        <View style={[styles.rowIcon, danger && { backgroundColor: C.errorBg }]}>
          <Icon size={17} color={danger ? C.error : C.indigo} />
        </View>
        <View style={[styles.rowBody, !last && styles.divider]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.rowTitle, danger && { color: C.error }]}>{title}</Text>
            {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
          </View>
          <ChevronRight size={17} color="#C3C9D6" />
        </View>
      </View>
    </TouchableHighlight>
  );
}

/* ---------- Screen ---------- */
export default function SafetyPrivacyScreen({ navigation }) {
  const openSupport = (params) => navigation.navigate('CustomerSupport', params);

  const requestDeletion = () =>
    Alert.alert(
      'Delete your account?',
      'Our support team will confirm and delete your account and booking history. Ongoing jobs need to be finished or cancelled first.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact support', onPress: () => openSupport({ topic: 'delete_account' }) },
      ]
    );

  const legalRows = [
    PRIVACY_URL && { icon: FileText, title: 'Privacy policy', onPress: () => openUrl(PRIVACY_URL) },
    TERMS_URL && { icon: ScrollText, title: 'Terms of service', onPress: () => openUrl(TERMS_URL) },
    { icon: UserX, title: 'Delete my account', danger: true, onPress: requestDeletion },
  ].filter(Boolean);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <ShieldCheck size={150} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
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
        <Text style={styles.title} accessibilityRole="header">
          Privacy and safety
        </Text>
        <Text style={styles.subtitle}>How we protect you at home and online</Text>
      </View>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Urgent help first, so it's never buried */}
          <View style={styles.urgent}>
            <View style={styles.urgentHead}>
              <View style={styles.urgentIcon}>
                <Siren size={18} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.urgentTitle}>Need help right now?</Text>
                <Text style={styles.urgentBody}>
                  If you feel unsafe, call 112. For a problem during a job, contact us.
                </Text>
              </View>
            </View>
            <View style={styles.urgentActions}>
              <TouchableOpacity
                onPress={() => dial('112')}
                activeOpacity={0.88}
                style={[styles.btn, styles.btnDanger]}
                accessibilityRole="button"
                accessibilityLabel="Call 112, national emergency number"
              >
                <PhoneCall size={14} color={C.white} style={{ marginRight: 6 }} />
                <Text style={styles.btnDangerText}>Call 112</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              {SAFETY_HELPLINE ? (
                <TouchableOpacity
                  onPress={() => dial(SAFETY_HELPLINE)}
                  activeOpacity={0.85}
                  style={[styles.btn, styles.btnOutline]}
                  accessibilityRole="button"
                  accessibilityLabel="Call our safety helpline"
                >
                  <PhoneCall size={14} color={C.ink} style={{ marginRight: 6 }} />
                  <Text style={styles.btnOutlineText}>Safety helpline</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => openSupport()}
                  activeOpacity={0.85}
                  style={[styles.btn, styles.btnOutline]}
                  accessibilityRole="button"
                >
                  <Headphones size={14} color={C.ink} style={{ marginRight: 6 }} />
                  <Text style={styles.btnOutlineText}>Contact us</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* How we keep you safe */}
          <Group title="How we keep you safe">
            {SAFETY_POINTS.map(({ icon: Icon, title, body }, i) => (
              <View key={title} style={styles.row} accessible accessibilityLabel={`${title}. ${body}`}>
                <View style={[styles.rowIcon, { alignSelf: 'flex-start', marginTop: 12 }]}>
                  <Icon size={17} color={C.indigo} />
                </View>
                <View style={[styles.rowBody, styles.rowBodyText, i < SAFETY_POINTS.length - 1 && styles.divider]}>
                  <Text style={styles.rowTitle}>{title}</Text>
                  <Text style={styles.rowSub}>{body}</Text>
                </View>
              </View>
            ))}
          </Group>

          {/* Help */}
          <Group title="Help">
            <LinkRow
              icon={Headphones}
              title="Report a problem"
              sub="Tell us about a job, a pro or a payment"
              last
              onPress={() => openSupport({ topic: 'report' })}
            />
          </Group>

          {/* Your data */}
          <Group title="Your data">
            {legalRows.map((r, i) => (
              <LinkRow key={r.title} {...r} last={i === legalRows.length - 1} />
            ))}
          </Group>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },

  /* Header */
  header: { backgroundColor: C.indigo, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40, overflow: 'hidden' },
  headerIconWrap: { position: 'absolute', right: -30, bottom: -40, transform: [{ rotate: '-14deg' }] },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
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

  /* Urgent help */
  urgent: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F3C9D3',
    padding: 12,
  },
  urgentHead: { flexDirection: 'row', alignItems: 'center' },
  urgentIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  urgentTitle: { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  urgentBody: { fontSize: 12.5, color: C.muted, marginTop: 1, lineHeight: 17 },
  urgentActions: { flexDirection: 'row', marginTop: 12 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDanger: { backgroundColor: C.error },
  btnDangerText: { color: C.white, fontSize: 13.5, fontWeight: '800' },
  btnOutline: { backgroundColor: C.white, borderWidth: 1, borderColor: '#DCE1EC' },
  btnOutlineText: { color: C.ink, fontSize: 13.5, fontWeight: '700' },

  /* Groups */
  groupWrap: { marginTop: 14 },
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
    minHeight: 56,
    paddingVertical: 11,
    paddingRight: 12,
  },
  rowBodyText: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { fontSize: 14.5, fontWeight: '700', color: C.ink },
  rowSub: { fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 17 },
});