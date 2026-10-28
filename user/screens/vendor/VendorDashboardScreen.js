import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Calendar,
  Send,
  X,
  CheckCircle,
  ChevronRight,
  IndianRupee,
  Briefcase,
  Inbox,
  WifiOff,
  Wrench,
  Zap,
  Droplet,
  Wind,
  WashingMachine,
  Hammer,
  PaintRoller,
  Sparkles,
  Bug,
} from 'lucide-react-native';
import io from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import {
  getAvailableRequestsApi,
  getAssignedRequestsApi,
  getMyBidsApi,
  submitOfferApi,
  updateVendorProfileApi,
  SOCKET_URL,
} from '../../services/api';

const ARRIVAL_TIMES = ['15 mins', '30 mins', '45 mins', '1 hour', 'Tomorrow'];
const NOTE_SUGGESTIONS = ['Carrying all tools', 'Can come right now', 'Spare parts charged extra'];

const C = {
  amber: '#FFB800',
  amberSoft: '#FFF6DC',
  amberDeep: '#8A6400',
  ink: '#161A2B',
  inkSub: 'rgba(22,26,43,0.7)',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  page: '#F5F7FB',
  white: '#FFFFFF',
  offline: '#E4E7EE',
  green: '#16A34A',
  greenSoft: '#E9F8EF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
};

const CATEGORY_ICONS = {
  Electrician: Zap,
  Plumber: Droplet,
  'AC Repair': Wind,
  'Appliance Repair': WashingMachine,
  Carpentry: Hammer,
  Painting: PaintRoller,
  'Home Cleaning': Sparkles,
  'Pest Control': Bug,
};

const timeAgo = (iso) => {
  if (!iso) return 'Just now';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function VendorDashboardScreen({ navigation }) {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentMax = 640;

  const [isOnline, setIsOnline] = useState(Boolean(user?.isOnline ?? true));
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [leads, setLeads] = useState([]);
  const [bids, setBids] = useState([]);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newIds, setNewIds] = useState([]);

  // Quote sheet
  const [selectedLead, setSelectedLead] = useState(null);
  const [bidAmount, setBidAmount] = useState(user?.baseVisitingCharge?.toString() || '150');
  const [estimatedTime, setEstimatedTime] = useState('30 mins');
  const [bidMessage, setBidMessage] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  const baseFee = Number(user?.baseVisitingCharge) || 150;
  const firstName = (user?.name || '').split(' ')[0];

  /* ---------- Data ---------- */
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const [leadsRes, bidsRes, jobsRes] = await Promise.all([
        getAvailableRequestsApi(token),
        getMyBidsApi(token),
        getAssignedRequestsApi(token),
      ]);
      if (leadsRes.success) setLeads(leadsRes.requests || []);
      if (bidsRes.success) setBids(bidsRes.offers || []);
      if (jobsRes.success) setAssignedJobs(jobsRes.requests || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!token || !user) return;
    let socket;
    try {
      socket = io(SOCKET_URL, { transports: ['websocket'] });
      socket.on('connect', () => {
        const pinSet = new Set([
          ...(user.pincodes || []),
          user.address?.pincode,
          '395010',
          '395007',
          '395009',
        ].filter(Boolean));
        pinSet.forEach((pin) => socket.emit('joinPincodeRoom', String(pin).trim()));
      });
      socket.on('newServiceRequest', (newReq) => {
        if (!newReq || !newReq._id) return;
        setLeads((prev) => [newReq, ...prev.filter((item) => item._id !== newReq._id)]);
        setNewIds((prev) => [newReq._id, ...prev]);
      });
    } catch (err) {
      console.warn('Socket error on vendor dashboard:', err);
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [token, user]);

  const onRefresh = () => {
    setRefreshing(true);
    setNewIds([]);
    fetchDashboardData();
  };

  const handleToggleOnline = async (val) => {
    setIsOnline(val);
    try {
      await updateVendorProfileApi(token, { isOnline: val });
    } catch (e) {
      console.warn('Failed to update online status', e);
    }
  };

  const openBidSheet = (lead) => {
    setSelectedLead(lead);
    setNewIds((prev) => prev.filter((id) => id !== lead._id));
    setBidAmount(String(baseFee));
    setEstimatedTime('30 mins');
    setBidMessage('');
    setBidError('');
    setBidSuccess('');
  };

  const handleSubmitBid = async () => {
    if (!bidAmount || isNaN(bidAmount) || Number(bidAmount) <= 0) {
      setBidError('Enter an amount greater than ₹0.');
      return;
    }
    setSubmittingBid(true);
    setBidError('');
    try {
      const res = await submitOfferApi(token, {
        serviceRequest: selectedLead._id,
        serviceRequestId: selectedLead._id,
        bidAmount: Number(bidAmount),
        price: Number(bidAmount),
        estimatedTime,
        estimatedArrivalTime: estimatedTime,
        message: bidMessage.trim(),
      });
      if (res.success) {
        setBidSuccess('Quote sent');
        setTimeout(() => {
          setSelectedLead(null);
          fetchDashboardData();
        }, 1400);
      } else {
        setBidError(res.message || 'Could not send the quote. Try again.');
      }
    } catch (err) {
      setBidError('No internet connection. Check your network and try again.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const hasAlreadyBid = (requestId) =>
    bids.some((b) => b.serviceRequest?._id === requestId || b.serviceRequest === requestId);

  const addNote = (s) => {
    const cur = bidMessage.trim();
    if (cur.includes(s)) return;
    setBidMessage(cur ? `${cur}. ${s}` : s);
  };

  /* ---------- Pieces ---------- */
  const Stat = ({ value, label, onPress }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.8} style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const LeadCard = ({ lead }) => {
    const alreadyBid = hasAlreadyBid(lead._id);
    const isNew = newIds.includes(lead._id);
    const Icon = CATEGORY_ICONS[lead.category] || Wrench;
    const tag = lead.subCategory || lead.category;

    return (
      <View style={[styles.card, isNew && styles.cardNew]}>
        <View style={styles.cardTop}>
          <View style={styles.cardIcon}>
            <Icon size={18} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {lead.title || `${lead.category} repair`}
            </Text>
            <Text style={styles.cardMeta}>
              {lead.customer?.name || 'Verified customer'}  ·  {timeAgo(lead.createdAt)}
            </Text>
          </View>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>

        {!!lead.description && (
          <Text style={styles.cardDesc} numberOfLines={3}>
            {lead.description}
          </Text>
        )}

        <View style={styles.cardFacts}>
          {!!tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          )}
          <View style={styles.fact}>
            <MapPin size={13} color={C.muted} />
            <Text style={styles.factText}>
              {lead.address?.city || 'Surat'} {lead.address?.pincode || ''}
            </Text>
          </View>
          <View style={styles.fact}>
            <Calendar size={13} color={C.muted} />
            <Text style={styles.factText}>
              {lead.schedule?.date || 'Today'}, {lead.schedule?.timeSlot || 'Urgent'}
            </Text>
          </View>
        </View>

        {alreadyBid ? (
          <View style={styles.sentRow}>
            <CheckCircle size={16} color={C.green} />
            <Text style={styles.sentText}>Quote sent. Waiting for the customer.</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => openBidSheet(lead)}
            activeOpacity={0.85}
            style={styles.quoteBtn}
            accessibilityRole="button"
          >
            <Send size={15} color={C.ink} />
            <Text style={styles.quoteBtnText}>Send quote</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const displayedLeads = leads.filter((lead) => {
    if (selectedCategory === 'All') return true;
    const cat = (lead.category || '').toLowerCase();
    const target = selectedCategory.toLowerCase();
    if (target.includes('electric') && cat.includes('electric')) return true;
    if (target.includes('plumb') && cat.includes('plumb')) return true;
    if (
      target.includes('appliance') &&
      (cat.includes('appliance') || cat.includes('refrigerat') || cat.includes('washing') || cat.includes('purifier') || cat.includes('stove'))
    ) {
      return true;
    }
    if (target.includes('clean') && cat.includes('clean')) return true;
    if (target.includes('carpent') && cat.includes('carpent')) return true;
    if (target.includes('paint') && cat.includes('paint')) return true;
    return cat.includes(target) || target.includes(cat);
  });

  /* ---------- Layout ---------- */
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: isOnline ? C.amber : C.offline }}>
      <StatusBar barStyle="dark-content" backgroundColor={isOnline ? C.amber : C.offline} />

      <ScrollView
        style={{ backgroundColor: C.page }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ink} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isOnline ? C.amber : C.offline }]}>
          <View style={[styles.inner, { maxWidth: contentMax }]}>
            <Text style={styles.hello}>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={styles.business} numberOfLines={1}>
              {user?.businessName || user?.name || 'Service partner'}
            </Text>

            <View style={styles.onlineCard}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? C.green : C.faint }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.onlineTitle}>{isOnline ? "You're online" : "You're offline"}</Text>
                <Text style={styles.onlineSub}>
                  {isOnline
                    ? `Getting ${user?.category || 'service'} jobs within ${user?.serviceRadiusKm || 10} km`
                    : "You won't get new job alerts"}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: '#CBD2DE', true: C.green }}
                thumbColor={C.white}
                ios_backgroundColor="#CBD2DE"
                accessibilityLabel="Online status"
              />
            </View>

            <View style={styles.statsRow}>
              <Stat value={displayedLeads.length} label="Live leads" />
              <View style={styles.statDivider} />
              <Stat value={bids.length} label="Quotes sent" />
              <View style={styles.statDivider} />
              <Stat value={assignedJobs.length} label="Active jobs" onPress={() => navigation.navigate('Jobs')} />
            </View>
          </View>
        </View>

        <View style={[styles.inner, { maxWidth: contentMax, paddingHorizontal: 16, alignSelf: 'center' }]}>
          {/* Active job */}
          {assignedJobs.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Jobs')}
              activeOpacity={0.9}
              style={styles.activeJob}
              accessibilityRole="button"
            >
              <View style={styles.activeIcon}>
                <Briefcase size={18} color={C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeTitle}>
                  {assignedJobs.length === 1 ? '1 job in progress' : `${assignedJobs.length} jobs in progress`}
                </Text>
                <Text style={styles.activeSub}>Customer is waiting. Enter their start OTP at the door.</Text>
              </View>
              <ChevronRight size={20} color={C.white} />
            </TouchableOpacity>
          )}

          {/* List header */}
          <View style={styles.listHead}>
            <View>
              <Text style={styles.listTitle}>Jobs near you</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.muted, marginTop: 2 }}>
                Service Area: {user?.pincodes?.join(', ') || user?.address?.pincode || '395010, Surat'}
              </Text>
            </View>
            {isOnline ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            ) : (
              <Text style={styles.listHint}>Paused</Text>
            )}
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={{ marginBottom: 12, marginTop: 4 }}
          >
            {['All', 'Electrician', 'Plumber', 'Appliance Repair', 'Cleaning', 'Carpenter', 'Painting'].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!isOnline && (
            <View style={styles.offlineNote}>
              <WifiOff size={16} color={C.muted} />
              <Text style={styles.offlineText}>Go online above to start getting new jobs.</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.ink} />
              <Text style={styles.centerText}>Loading jobs…</Text>
            </View>
          ) : displayedLeads.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Inbox size={26} color={C.amberDeep} />
              </View>
              <Text style={styles.emptyTitle}>
                No open jobs in {selectedCategory === 'All' ? 'your area' : selectedCategory}
              </Text>
              <Text style={styles.emptySub}>
                {selectedCategory === 'All'
                  ? `New service requests in ${user?.pincodes?.[0] || 'your area'} will appear here the moment they're posted. Pull down to refresh.`
                  : `No ${selectedCategory} jobs found right now in your area. Tap "All" to view all available jobs.`}
              </Text>
            </View>
          ) : (
            displayedLeads.map((lead) => <LeadCard key={lead._id} lead={lead} />)
          )}
        </View>
      </ScrollView>

      {/* Quote sheet */}
      <Modal visible={!!selectedLead} animationType="slide" transparent onRequestClose={() => setSelectedLead(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedLead(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxWidth: Math.min(width, 640) }]}>
            <View style={styles.handle} />

            {bidSuccess !== '' ? (
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <CheckCircle size={34} color={C.green} />
                </View>
                <Text style={styles.successTitle}>Quote sent</Text>
                <Text style={styles.successSub}>
                  ₹{bidAmount}, arriving in {estimatedTime}. We'll tell you if the customer accepts.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Send a quote</Text>
                    <Text style={styles.sheetSub} numberOfLines={1}>
                      {selectedLead?.title || selectedLead?.category}
                      {selectedLead?.address?.pincode ? `  ·  ${selectedLead.address.pincode}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedLead(null)}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <X size={18} color={C.ink} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.label}>Your price</Text>
                  <View style={styles.amountRow}>
                    <IndianRupee size={26} color={C.ink} strokeWidth={2.5} />
                    <TextInput
                      value={bidAmount}
                      onChangeText={(v) => setBidAmount(v.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      placeholder={String(baseFee)}
                      placeholderTextColor={C.faint}
                      accessibilityLabel="Quote amount in rupees"
                      style={styles.amountInput}
                    />
                  </View>
                  <View style={styles.rowWrap}>
                    {[baseFee, baseFee + 100, baseFee + 200, baseFee + 350].map((v, i) => {
                      const sel = bidAmount === String(v);
                      return (
                        <TouchableOpacity
                          key={v}
                          onPress={() => setBidAmount(String(v))}
                          style={[styles.chip, sel && styles.chipOn]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextOn]}>
                            ₹{v}
                            {i === 0 ? ' visit fee' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { marginTop: 22 }]}>When can you reach?</Text>
                  <View style={styles.rowWrap}>
                    {ARRIVAL_TIMES.map((t) => {
                      const sel = estimatedTime === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setEstimatedTime(t)}
                          style={[styles.chip, sel && styles.chipOn]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextOn]}>{t}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { marginTop: 22 }]}>
                    Note to customer <Text style={styles.optional}> Optional</Text>
                  </Text>
                  <TextInput
                    value={bidMessage}
                    onChangeText={setBidMessage}
                    placeholder="Anything the customer should know"
                    placeholderTextColor={C.faint}
                    multiline
                    maxLength={200}
                    style={styles.note}
                  />
                  <View style={[styles.rowWrap, { marginTop: 8 }]}>
                    {NOTE_SUGGESTIONS.map((s) => (
                      <TouchableOpacity key={s} onPress={() => addNote(s)} style={styles.suggest} activeOpacity={0.8}>
                        <Text style={styles.suggestText}>+ {s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {bidError !== '' && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{bidError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleSubmitBid}
                    disabled={submittingBid}
                    activeOpacity={0.85}
                    style={styles.submit}
                    accessibilityRole="button"
                  >
                    {submittingBid ? (
                      <ActivityIndicator color={C.ink} />
                    ) : (
                      <Text style={styles.submitText}>Send quote{bidAmount ? ` of ₹${bidAmount}` : ''}</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%' },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hello: { fontSize: 14, fontWeight: '600', color: C.inkSub },
  business: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginTop: 2 },
  onlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    marginTop: 16,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  onlineTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  onlineSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 18,
    paddingVertical: 12,
    marginTop: 10,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 12, fontWeight: '600', color: C.inkSub, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(22,26,43,0.12)' },

  /* Active job */
  activeJob: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  activeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeTitle: { fontSize: 15, fontWeight: '800', color: C.white },
  activeSub: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2, lineHeight: 16 },

  /* List */
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  listTitle: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  listHint: { fontSize: 13, fontWeight: '700', color: C.faint },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green, marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: '800', color: C.green },
  filterScroll: { gap: 8, paddingRight: 16 },
  filterChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkSub,
  },
  filterChipTextActive: {
    color: C.white,
  },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  offlineText: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600' },
  center: { paddingVertical: 48, alignItems: 'center' },
  centerText: { fontSize: 13, color: C.muted, marginTop: 10 },
  empty: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 28, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 14 },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 300 },

  /* Lead card */
  card: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, marginBottom: 12 },
  cardNew: { borderColor: C.amber, borderWidth: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.ink, lineHeight: 21 },
  cardMeta: { fontSize: 12, color: C.muted, marginTop: 3 },
  newBadge: { backgroundColor: C.amber, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 8 },
  newBadgeText: { fontSize: 11, fontWeight: '800', color: C.ink },
  cardDesc: { fontSize: 14, color: C.ink, lineHeight: 20, marginTop: 12 },
  cardFacts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12, gap: 10 },
  tag: { backgroundColor: C.field, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '700', color: C.ink },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.amber,
    marginTop: 14,
  },
  quoteBtnText: { fontSize: 15, fontWeight: '800', color: C.ink },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.greenSoft,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  sentText: { fontSize: 13, fontWeight: '700', color: C.green },

  /* Sheet */
  backdrop: { flex: 1, backgroundColor: 'rgba(22,26,43,0.5)' },
  sheet: {
    width: '100%',
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  sheetSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  optional: { fontSize: 12, fontWeight: '500', color: C.faint },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 6 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: '800', color: C.ink, letterSpacing: -1, marginLeft: 6, padding: 0 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, height: 42, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontSize: 14, fontWeight: '700', color: C.ink },
  chipTextOn: { color: C.white },
  note: {
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    backgroundColor: C.field,
    padding: 14,
    fontSize: 14,
    color: C.ink,
    textAlignVertical: 'top',
  },
  suggest: { backgroundColor: C.amberSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  suggestText: { fontSize: 12, fontWeight: '700', color: C.amberDeep },
  errorBox: { backgroundColor: C.errorBg, borderRadius: 12, padding: 12, marginTop: 16 },
  errorText: { fontSize: 13, fontWeight: '600', color: C.error },
  submit: { height: 56, borderRadius: 14, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 4 },
  submitText: { fontSize: 16, fontWeight: '800', color: C.ink },
  successBox: { alignItems: 'center', paddingVertical: 36 },
  successIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 16 },
  successSub: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 300 },
});