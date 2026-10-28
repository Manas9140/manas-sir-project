import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  ScrollView,
  StatusBar,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Search,
  ShieldCheck,
  Zap,
  Wallet,
  ChevronDown,
  ChevronRight,
  Wrench,
  Droplets,
  Snowflake,
  Sparkles,
  WashingMachine,
  Hammer,
  PaintRoller,
  Bug,
  Home as HomeIcon,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getMyRequestsApi } from '../../services/api';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  amber: '#FFB800',
  amberSoft: '#FFF6DC',
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
  success: '#0F7A4A',
  successBg: '#E7F6EE',
};

// Same group tints as the Categories screen
const TINT = {
  repair: { fg: C.indigo, bg: C.indigoSoft },
  appliance: { fg: '#8A6400', bg: '#FFF6DC' },
  cleaning: { fg: '#0F7A6B', bg: '#E3F5F1' },
};

// `category` is what CreateRequest receives; keep it matching your backend names
const TOP_SERVICES = [
  { id: 's1', label: 'Electrician', category: 'Electrician', icon: Zap, tint: TINT.repair },
  { id: 's2', label: 'Plumbing', category: 'Plumbing', icon: Droplets, tint: TINT.repair },
  { id: 's3', label: 'AC Repair', category: 'AC Repair', icon: Snowflake, tint: TINT.repair },
  { id: 's4', label: 'Cleaning', category: 'Cleaning', icon: Sparkles, tint: TINT.cleaning },
  { id: 's5', label: 'Appliance', category: 'Appliance', icon: WashingMachine, tint: TINT.appliance },
  { id: 's6', label: 'Carpenter', category: 'Carpenter', icon: Hammer, tint: TINT.repair },
  { id: 's7', label: 'Painting', category: 'Painting', icon: PaintRoller, tint: TINT.repair },
  { id: 's8', label: 'Pest Control', category: 'Pest Control', icon: Bug, tint: TINT.cleaning },
];

const TRUST = [
  { icon: ShieldCheck, title: 'Verified pros', sub: 'Background-checked' },
  { icon: Zap, title: 'Quick quotes', sub: 'Usually in minutes' },
  { icon: Wallet, title: 'Pay after', sub: 'Once the job is done' },
];

const STATUS = {
  pending: { label: 'Waiting for quotes', fg: '#8A6400', bg: C.amberSoft, dot: C.amber, step: 0 },
  accepted: { label: 'Pro assigned', fg: C.indigo, bg: C.indigoSoft, dot: C.indigo, step: 1 },
  in_progress: { label: 'Work in progress', fg: '#2343B5', bg: '#E8EEFF', dot: '#3C63E0', step: 2 },
  completed: { label: 'Completed', fg: C.success, bg: C.successBg, dot: C.success, step: 3 },
  cancelled: { label: 'Cancelled', fg: C.error, bg: C.errorBg, dot: C.error, step: -1 },
};
STATUS.work_started = STATUS.in_progress;
const getStatus = (s) => STATUS[s] || STATUS.pending;

const CATEGORY_ICONS = [
  [/\bac\b|air ?con|cooling/i, Snowflake],
  [/plumb|leak|tap|pipe|water/i, Droplets],
  [/electr|wiring|switch|fan/i, Zap],
  [/clean|sanit/i, Sparkles],
  [/pest/i, Bug],
  [/carpent|furniture|wood/i, Hammer],
  [/paint/i, PaintRoller],
  [/applian|washing|fridge|refrigerator/i, WashingMachine],
];
const getCategoryIcon = (c = '') => (CATEGORY_ICONS.find(([re]) => re.test(c)) || [null, Wrench])[1];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const t = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(t)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/* ---------- Pieces ---------- */
function SectionHead({ title, action, onAction }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.sectionLink}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActiveCard({ item, onPress }) {
  const st = getStatus(item.status);
  const Icon = getCategoryIcon(item.category);
  const vendor = item.assignedVendor;
  const vendorName = vendor ? vendor.businessName || vendor.name : null;
  return (
    <TouchableOpacity
      style={styles.activeCard}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`Ongoing: ${item.title || item.category}, ${st.label}. Track`}
    >
      <View style={styles.rowCenter}>
        <View style={styles.activeIcon}>
          <Icon size={19} color={C.indigo} />
        </View>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.activeTitle} numberOfLines={1}>
            {item.title || `${item.category} service`}
          </Text>
          <Text style={styles.activeSub} numberOfLines={1}>
            {vendorName ? `with ${vendorName}` : 'Pros nearby are sending quotes'}
          </Text>
        </View>
        <View style={styles.trackBtn}>
          <Text style={styles.trackBtnText}>Track</Text>
          <ChevronRight size={15} color={C.white} />
        </View>
      </View>

      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i <= st.step ? st.dot : C.line }, i < 3 && { marginRight: 3 }]}
          />
        ))}
      </View>
      <View style={[styles.rowCenter, { marginTop: 6 }]}>
        <View style={[styles.dot, { backgroundColor: st.dot }]} />
        <Text style={[styles.activeStatus, { color: st.fg }]}>{st.label}</Text>
        <Text style={styles.activeOrder}>#{String(item._id).slice(-4).toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
}

function RecentRow({ item, last, onPress }) {
  const st = getStatus(item.status);
  const Icon = getCategoryIcon(item.category);
  const vendor = item.assignedVendor;
  const sub = [
    vendor ? vendor.businessName || vendor.name : null,
    formatDate(item.schedule?.date || item.createdAt),
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <TouchableHighlight onPress={onPress} underlayColor="#F1F3F8" accessibilityRole="button">
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: C.indigoSoft }]}>
          <Icon size={17} color={C.indigo} />
        </View>
        <View style={[styles.rowBody, !last && styles.rowDivider]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || `${item.category} service`}
            </Text>
            {!!sub && (
              <Text style={styles.rowSub} numberOfLines={1}>
                {sub}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
            {item.finalAmount != null && item.finalAmount !== '' && (
              <Text style={styles.rowAmount}>₹{item.finalAmount}</Text>
            )}
            <Text style={[styles.rowStatus, { color: st.fg }]}>{st.label}</Text>
          </View>
          <ChevronRight size={16} color="#C3C9D6" />
        </View>
      </View>
    </TouchableHighlight>
  );
}

/* ---------- Screen ---------- */
export default function HomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [activeRequest, setActiveRequest] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const firstFocus = useRef(true);

  const fetchDashboardData = useCallback(
    async (mode = 'initial') => {
      if (!token) return;
      if (mode === 'initial') setLoadingData(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const [activeRes, recentRes] = await Promise.all([
          getMyRequestsApi(token, 'active', 1),
          getMyRequestsApi(token, '', 3),
        ]);
        setActiveRequest(activeRes?.success && activeRes.requests?.length ? activeRes.requests[0] : null);
        if (recentRes?.success && Array.isArray(recentRes.requests)) setRecentRequests(recentRes.requests);
      } catch (err) {
        console.warn('Error fetching dashboard requests:', err);
      } finally {
        setLoadingData(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchDashboardData('initial');
  }, [fetchDashboardData]);

  // Refresh when returning from a booking flow
  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      fetchDashboardData('silent');
    });
    return unsub;
  }, [navigation, fetchDashboardData]);

  const addr = user?.addressDetails || user?.address || null;
  const area = addr ? addr.area || addr.street || addr.label || '' : '';
  const locationLabel = addr ? [area, addr.city].filter(Boolean).join(', ') || 'Set location' : 'Set location';
  const firstName = user?.name ? user.name.trim().split(' ')[0] : '';

  const open = (route, params) => navigation?.navigate(route, params);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <HomeIcon size={170} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
        </View>

        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => open('LocationSetup')}
            activeOpacity={0.8}
            style={styles.locPill}
            accessibilityRole="button"
            accessibilityLabel={`Service location: ${locationLabel}. Change`}
          >
            <MapPin size={14} color={C.white} />
            <Text style={styles.locText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <ChevronDown size={14} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hello}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text style={styles.headline} accessibilityRole="header">
          What needs fixing today?
        </Text>

        <TouchableOpacity
          onPress={() => open('Categories', { focusSearch: true })}
          activeOpacity={0.9}
          style={styles.search}
          accessibilityRole="search"
          accessibilityLabel="Search services"
        >
          <Search size={18} color={C.muted} />
          <Text style={styles.searchText}>Search for AC, plumber, cleaning…</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDashboardData('refresh')}
              tintColor={C.indigo}
              colors={[C.indigo]}
            />
          }
        >
          {/* Ongoing job */}
          {activeRequest && (
            <ActiveCard item={activeRequest} onPress={() => open('RequestDetails', { requestId: activeRequest._id })} />
          )}

          {/* Services grid */}
          <SectionHead title="Popular services" action="See all" onAction={() => open('Categories')} />
          <View style={styles.gridCard}>
            {TOP_SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => open('CreateRequest', { category: s.category })}
                  activeOpacity={0.7}
                  style={styles.gridItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Book ${s.label}`}
                >
                  <View style={[styles.gridIcon, { backgroundColor: s.tint.bg }]}>
                    <Icon size={21} color={s.tint.fg} strokeWidth={2} />
                  </View>
                  <Text style={styles.gridLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Trust strip */}
          <View style={styles.trustCard}>
            {TRUST.map((t, i) => {
              const Icon = t.icon;
              return (
                <View key={t.title} style={[styles.trustItem, i > 0 && styles.trustDivider]}>
                  <Icon size={17} color={C.indigo} />
                  <Text style={styles.trustTitle}>{t.title}</Text>
                  <Text style={styles.trustSub} numberOfLines={1}>
                    {t.sub}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Recent */}
          {recentRequests.length > 0 ? (
            <>
              <SectionHead title="Recent bookings" action="See all" onAction={() => open('Bookings')} />
              <View style={styles.group}>
                {recentRequests.map((item, i) => (
                  <RecentRow
                    key={item._id || i}
                    item={item}
                    last={i === recentRequests.length - 1}
                    onPress={() => open('RequestDetails', { requestId: item._id })}
                  />
                ))}
              </View>
            </>
          ) : (
            !loadingData && (
              <View style={styles.firstCard}>
                <Text style={styles.firstTitle}>Ready for your first booking?</Text>
                <Text style={styles.firstSub}>
                  Pick a service above, describe the problem and compare quotes from pros near you.
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  /* Header */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  headerIconWrap: { position: 'absolute', right: -34, bottom: -40, transform: [{ rotate: '-14deg' }] },
  topRow: { flexDirection: 'row', marginBottom: 14 },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  locText: { flexShrink: 1, color: C.white, fontSize: 13, fontWeight: '700', marginHorizontal: 6 },
  hello: { color: 'rgba(255,255,255,0.74)', fontSize: 13.5, fontWeight: '600' },
  headline: { color: C.white, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.white,
  },
  searchText: { flex: 1, marginLeft: 10, fontSize: 14.5, color: C.faint, fontWeight: '500' },

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

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4, marginTop: 6, marginBottom: 8 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  sectionLink: { fontSize: 13, fontWeight: '700', color: C.indigo },

  /* Ongoing job */
  activeCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD3EE',
    padding: 12,
    marginBottom: 12,
  },
  activeIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activeTitle: { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  activeSub: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 10,
    backgroundColor: C.indigo,
  },
  trackBtnText: { color: C.white, fontSize: 13, fontWeight: '800', marginRight: 1 },
  bars: { flexDirection: 'row', marginTop: 12 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  activeStatus: { flex: 1, fontSize: 12, fontWeight: '700' },
  activeOrder: { fontSize: 11.5, color: C.faint, fontWeight: '600' },

  /* Services grid: one panel, no per-tile boxes */
  gridCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 8,
    marginBottom: 12,
  },
  gridItem: { width: '25%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2 },
  gridIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridLabel: { fontSize: 12, fontWeight: '600', color: C.ink, textAlign: 'center' },

  /* Trust strip */
  trustCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 12,
    marginBottom: 12,
  },
  trustItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  trustDivider: { borderLeftWidth: 1, borderLeftColor: C.hair },
  trustTitle: { fontSize: 12.5, fontWeight: '800', color: C.ink, marginTop: 5 },
  trustSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  /* Recent list */
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingRight: 10, minHeight: 58 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowAmount: { fontSize: 13, fontWeight: '800', color: C.ink },
  rowStatus: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },

  /* First-time */
  firstCard: {
    backgroundColor: C.indigoSoft,
    borderRadius: 16,
    padding: 14,
  },
  firstTitle: { fontSize: 15, fontWeight: '800', color: C.indigo },
  firstSub: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
});