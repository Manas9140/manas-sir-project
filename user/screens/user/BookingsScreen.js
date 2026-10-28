import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Animated,
  Easing,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
  Hourglass,
  ClipboardList,
  History,
  WifiOff,
  Plus,
  Snowflake,
  Droplets,
  Zap,
  Sparkles,
  Hammer,
  PaintRoller,
  Wrench,
  MessageSquare,
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

/* ---------- Status model ---------- */
// step: position on the 4-step track (-1 = not on the track)
const STATUS = {
  pending: {
    label: 'Waiting for quotes',
    fg: '#8A6400',
    bg: C.amberSoft,
    dot: C.amber,
    step: 0,
    hint: 'Pros nearby are reviewing your request',
  },
  accepted: {
    label: 'Pro assigned',
    fg: C.indigo,
    bg: C.indigoSoft,
    dot: C.indigo,
    step: 1,
    hint: 'Your pro will arrive at the scheduled time',
  },
  in_progress: {
    label: 'Work in progress',
    fg: '#2343B5',
    bg: '#E8EEFF',
    dot: '#3C63E0',
    step: 2,
    hint: 'Your pro is working on the job',
  },
  completed: { label: 'Completed', fg: C.success, bg: C.successBg, dot: C.success, step: 3 },
  cancelled: { label: 'Cancelled', fg: C.error, bg: C.errorBg, dot: C.error, step: -1 },
};
STATUS.work_started = STATUS.in_progress;
const TRACK_STEPS = 4;

const getStatus = (status) =>
  STATUS[status] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown',
    fg: C.muted,
    bg: C.field,
    dot: C.faint,
    step: -1,
  };

/* ---------- Helpers ---------- */
const CATEGORY_ICONS = [
  [/\bac\b|air ?con|cooling/i, Snowflake],
  [/plumb|leak|tap|pipe|water/i, Droplets],
  [/electr|wiring|switch|fan/i, Zap],
  [/clean|pest/i, Sparkles],
  [/carpent|furniture|wood/i, Hammer],
  [/paint/i, PaintRoller],
];
const getCategoryIcon = (category = '') =>
  (CATEGORY_ICONS.find(([re]) => re.test(category)) || [null, Wrench])[1];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const sameYear = d.getFullYear() === today.getFullYear();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
};

// "Morning (9 AM - 12 PM)" -> "9 AM–12 PM"; anything else is shown as-is
const shortSlot = (slot) => {
  if (!slot) return null;
  const m = /\((.+)\)/.exec(slot);
  return m ? m[1].replace(/\s*-\s*/, '–') : slot;
};

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/* ---------- Segmented control ---------- */
function SegmentedControl({ value, options, onChange, reduceMotion }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const anim = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(index);
      return;
    }
    Animated.spring(anim, { toValue: index, useNativeDriver: true, speed: 22, bounciness: 0 }).start();
  }, [index, reduceMotion]);

  const segWidth = width ? (width - 8) / options.length : 0;

  return (
    <View
      style={styles.segment}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segWidth > 0 && (
        <Animated.View
          style={[
            styles.segmentThumb,
            {
              width: segWidth,
              transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, segWidth] }) }],
            },
          ]}
        />
      )}
      {options.map(({ value: v, label, Icon }) => {
        const active = v === value;
        return (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            activeOpacity={0.8}
            style={styles.segmentItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Icon size={15} color={active ? C.indigo : 'rgba(255,255,255,0.72)'} style={{ marginRight: 6 }} />
            <Text style={[styles.segmentText, { color: active ? C.ink : 'rgba(255,255,255,0.78)' }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------- Card pieces ---------- */
function StatusPill({ status }) {
  return (
    <View style={[styles.pill, { backgroundColor: status.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: status.dot }]} />
      <Text style={[styles.pillText, { color: status.fg }]} numberOfLines={1}>
        {status.label}
      </Text>
    </View>
  );
}

function ProgressTrack({ status }) {
  return (
    <View
      style={styles.track}
      accessible
      accessibilityLabel={`Step ${status.step + 1} of ${TRACK_STEPS}. ${status.hint}`}
    >
      <View style={styles.trackBars}>
        {Array.from({ length: TRACK_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.trackBar,
              { backgroundColor: i <= status.step ? status.dot : C.line },
              i < TRACK_STEPS - 1 && { marginRight: 3 },
            ]}
          />
        ))}
      </View>
      <View style={styles.trackCaption}>
        <Text style={styles.trackHint} numberOfLines={1}>
          {status.hint}
        </Text>
        <Text style={styles.trackStep}>
          {status.step + 1}/{TRACK_STEPS}
        </Text>
      </View>
    </View>
  );
}

function MetaItem({ Icon, text }) {
  if (!text) return null;
  return (
    <View style={styles.metaItem}>
      <Icon size={12} color={C.faint} style={{ marginRight: 4 }} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function BookingCard({ item, isHistory, onOpen, onRebook, onChat }) {
  const status = getStatus(item.status);
  const CategoryIcon = getCategoryIcon(item.category);
  const vendor = item.assignedVendor;
  const vendorName = vendor ? vendor.businessName || vendor.name : null;
  const orderId = item._id ? String(item._id).slice(-4).toUpperCase() : '';
  const title = item.title || (item.category ? `${item.category} service` : 'Service request');
  const showTrack = !isHistory && status.step >= 0 && status.step < TRACK_STEPS - 1;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status.label}. Open details`}
    >
      {/* Icon + title + status */}
      <View style={styles.cardHead}>
        <View style={styles.catTile}>
          <CategoryIcon size={19} color={C.indigo} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {orderId !== '' && <Text style={styles.orderId}>#{orderId}</Text>}
          </View>
          <StatusPill status={status} />
        </View>
      </View>

      {/* When / where */}
      <View style={styles.metaRow}>
        <MetaItem Icon={CalendarDays} text={formatDate(item.schedule?.date)} />
        <MetaItem Icon={Clock} text={shortSlot(item.schedule?.timeSlot)} />
        <MetaItem Icon={MapPin} text={item.address?.city} />
      </View>

      {showTrack && <ProgressTrack status={status} />}

      {/* Pro + actions */}
      <View style={styles.cardFooter}>
        <View style={styles.vendorRow}>
          {vendorName ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(vendorName)}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Hourglass size={13} color={C.faint} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorLabel}>{vendorName ? 'Your pro' : 'No pro assigned yet'}</Text>
            <Text style={styles.vendorName} numberOfLines={1}>
              {vendorName || (status.step === 0 ? 'Quotes on the way' : '—')}
            </Text>
          </View>
        </View>

        {isHistory ? (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => (onChat ? onChat(item) : onOpen())}
              activeOpacity={0.8}
              style={styles.btnOutline}
              accessibilityRole="button"
              accessibilityLabel={`View chat history for ${title}`}
            >
              <MessageSquare size={13} color={C.ink} style={{ marginRight: 5 }} />
              <Text style={styles.btnOutlineText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRebook}
              activeOpacity={0.8}
              style={[styles.btnOutline, styles.btnIndigo]}
              accessibilityRole="button"
              accessibilityLabel={`Book ${title} again`}
            >
              <RefreshCw size={13} color={C.indigo} style={{ marginRight: 5 }} />
              <Text style={[styles.btnOutlineText, { color: C.indigo }]}>Book again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.btnSolid}>
            <Text style={styles.btnSolidText}>Details</Text>
            <ChevronRight size={15} color={C.white} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ---------- States ---------- */
function Bone({ w, h = 12, r = 6, style }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.line }, style]} />;
}

function SkeletonCard({ pulse }) {
  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.cardHead}>
        <Bone w={40} h={40} r={11} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Bone w="65%" h={14} />
          <Bone w={110} h={18} r={9} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={[styles.metaRow, { marginBottom: 2 }]}>
        <Bone w={70} style={{ marginRight: 12 }} />
        <Bone w={80} style={{ marginRight: 12 }} />
        <Bone w={50} />
      </View>
    </Animated.View>
  );
}

function EmptyState({ isHistory, onBook }) {
  const Icon = isHistory ? History : ClipboardList;
  return (
    <View style={styles.stateBox}>
      <View style={styles.stateIcon}>
        <Icon size={24} color={C.indigo} />
      </View>
      <Text style={styles.stateTitle}>{isHistory ? 'No past bookings' : 'No active requests'}</Text>
      <Text style={styles.stateBody}>
        {isHistory
          ? 'Completed and cancelled jobs will appear here so you can book them again.'
          : 'Post a request and verified pros nearby will send you quotes.'}
      </Text>
      {!isHistory && (
        <TouchableOpacity onPress={onBook} activeOpacity={0.85} style={styles.statePrimary} accessibilityRole="button">
          <Plus size={16} color={C.white} style={{ marginRight: 6 }} />
          <Text style={styles.statePrimaryText}>Book a service</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.stateBox}>
      <View style={[styles.stateIcon, { backgroundColor: C.errorBg }]}>
        <WifiOff size={22} color={C.error} />
      </View>
      <Text style={styles.stateTitle}>Couldn't load your bookings</Text>
      <Text style={styles.stateBody}>{message}</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.85} style={styles.stateSecondary} accessibilityRole="button">
        <RefreshCw size={14} color={C.ink} style={{ marginRight: 6 }} />
        <Text style={styles.stateSecondaryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- Screen ---------- */
const TABS = [
  { value: 'active', label: 'Active', Icon: ClipboardList },
  { value: 'history', label: 'History', Icon: History },
];

export default function BookingsScreen({ navigation }) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const requestId = useRef(0);
  const firstFocus = useRef(true);
  const pulse = useRef(new Animated.Value(1)).current;
  const isHistory = activeTab === 'history';

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduceMotion(!!v));
    return () => {
      requestId.current += 1; // ignore responses that land after unmount
    };
  }, []);

  /* Fetch — only the latest request is allowed to update state, so switching
     tabs quickly can never show one tab's data under the other. */
  const load = useCallback(
    async (mode = 'initial') => {
      if (!token) return;
      const id = ++requestId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError('');

      try {
        const res = await getMyRequestsApi(token, activeTab === 'active' ? 'active' : 'completed');
        if (id !== requestId.current) return;
        if (res?.success) {
          setRequests(Array.isArray(res.requests) ? res.requests : []);
        } else {
          setRequests([]);
          setError(res?.message || 'Something went wrong on our side. Pull down or tap below to try again.');
        }
      } catch (e) {
        if (id !== requestId.current) return;
        console.warn('Error fetching bookings:', e);
        setRequests([]);
        setError('Check your internet connection and try again.');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, activeTab]
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Refresh quietly when coming back from RequestDetails / CreateRequest
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load('silent');
    });
    return unsubscribe;
  }, [navigation, load]);

  // Skeleton pulse
  useEffect(() => {
    if (!loading || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, reduceMotion]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setRequests([]);
    setActiveTab(tab);
  };

  const subtitle = (() => {
    if (loading || error) return isHistory ? 'Your past jobs' : 'Track the jobs you’ve booked';
    const n = requests.length;
    if (isHistory) return n === 0 ? 'Your past jobs' : `${n} past ${n === 1 ? 'job' : 'jobs'}`;
    return n === 0 ? 'Track the jobs you’ve booked' : `${n} ${n === 1 ? 'job' : 'jobs'} in progress`;
  })();

  const handleChat = (item) => {
    const v = item.assignedVendor;
    const vendorName = v?.businessName || v?.name || 'Service Partner';
    const vendorId = v?._id || v?.id || (typeof v === 'string' ? v : null);
    navigation?.navigate('UserChat', {
      serviceRequestId: item._id,
      customerId: user?._id || item.customer,
      vendorId,
      vendorName,
    });
  };

  let content;
  if (loading) {
    content = [0, 1, 2].map((i) => <SkeletonCard key={`sk-${i}`} pulse={pulse} />);
  } else if (error) {
    content = <ErrorState message={error} onRetry={() => load('initial')} />;
  } else if (requests.length === 0) {
    content = <EmptyState isHistory={isHistory} onBook={() => navigation?.navigate('Home')} />;
  } else {
    content = requests.map((item, i) => (
      <BookingCard
        key={item._id || `req-${i}`}
        item={item}
        isHistory={isHistory}
        onOpen={() => navigation?.navigate('RequestDetails', { requestId: item._id })}
        onRebook={() => navigation?.navigate('CreateRequest', { category: item.category })}
        onChat={handleChat}
      />
    ));
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          {isHistory ? (
            <History size={170} color="rgba(255,255,255,0.08)" strokeWidth={1.4} />
          ) : (
            <ClipboardList size={170} color="rgba(255,255,255,0.08)" strokeWidth={1.4} />
          )}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          My bookings
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <SegmentedControl value={activeTab} options={TABS} onChange={switchTab} reduceMotion={reduceMotion} />
      </View>

      <View style={styles.sheet}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
              tintColor={C.indigo}
              colors={[C.indigo]}
            />
          }
        >
          {content}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },

  /* Header (indigo hero, same as LoginScreen customer theme) */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44, // leaves room for the sheet's rounded overlap
    overflow: 'hidden',
  },
  headerIconWrap: {
    position: 'absolute',
    right: -36,
    bottom: -34,
    transform: [{ rotate: '-14deg' }],
  },
  title: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: -0.8 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.74)',
    marginTop: 4,
    marginBottom: 18,
    fontWeight: '500',
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  segmentThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 10,
    backgroundColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '700' },

  /* Sheet that overlaps the header with rounded corners */
  sheet: {
    flex: 1,
    backgroundColor: C.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    overflow: 'hidden',
  },
  body: { flex: 1, backgroundColor: C.page },
  bodyContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 32, flexGrow: 1 },

  /* Card — compact */
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  catTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  orderId: { fontSize: 11.5, color: C.faint, fontWeight: '600', marginLeft: 8 },

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  pillText: { fontSize: 11.5, fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, maxWidth: '100%' },
  metaText: { fontSize: 12, fontWeight: '600', color: C.muted },

  /* Progress track */
  track: { marginTop: 10 },
  trackBars: { flexDirection: 'row' },
  trackBar: { flex: 1, height: 4, borderRadius: 2 },
  trackCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  trackHint: { flex: 1, fontSize: 11.5, color: C.muted, marginRight: 10 },
  trackStep: { fontSize: 11.5, fontWeight: '700', color: C.ink },

  /* Footer */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },
  vendorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarEmpty: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.line,
    borderStyle: 'dashed',
  },
  avatarText: { color: C.white, fontSize: 11, fontWeight: '800' },
  vendorLabel: { fontSize: 10.5, color: C.faint, fontWeight: '600' },
  vendorName: { fontSize: 13, color: C.ink, fontWeight: '700' },

  actions: { flexDirection: 'row', alignItems: 'center' },
  btnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigo,
    height: 34,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 10,
  },
  btnSolidText: { color: C.white, fontSize: 13, fontWeight: '800', marginRight: 1 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE1EC',
    backgroundColor: C.white,
    marginLeft: 6,
  },
  btnIndigo: { borderColor: C.indigo, borderWidth: 1.5 },
  btnOutlineText: { fontSize: 13, fontWeight: '700', color: C.ink },

  /* Empty / error */
  stateBox: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
    marginTop: 4,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3, textAlign: 'center' },
  stateBody: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  statePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigo,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 16,
  },
  statePrimaryText: { color: C.white, fontSize: 14.5, fontWeight: '800' },
  stateSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  stateSecondaryText: { color: C.ink, fontSize: 14, fontWeight: '700' },
});