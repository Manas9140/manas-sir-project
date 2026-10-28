import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StatusBar,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Star,
  MessageSquare,
  KeyRound,
  Check,
  X,
  Clock,
  Wrench,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Droplets,
  Zap,
  Sparkles,
  Hammer,
  PaintRoller,
  FileText,
} from 'lucide-react-native';
import io from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import {
  getServiceRequestByIdApi,
  getOffersByRequestIdApi,
  acceptOfferApi,
  getUnreadChatCountApi,
  submitServiceRequestReviewApi,
  API_BASE_URL,
} from '../../services/api';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  amber: '#FFB800',
  amberSoft: '#FFF6DC',
  star: '#F5A300',
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

const STATUS = {
  pending: { label: 'Waiting for quotes', fg: '#8A6400', bg: C.amberSoft, dot: C.amber },
  accepted: { label: 'Pro assigned', fg: C.indigo, bg: C.indigoSoft, dot: C.indigo },
  in_progress: { label: 'Work in progress', fg: '#2343B5', bg: '#E8EEFF', dot: '#3C63E0' },
  completed: { label: 'Completed', fg: C.success, bg: C.successBg, dot: C.success },
  cancelled: { label: 'Cancelled', fg: C.error, bg: C.errorBg, dot: C.error },
};
STATUS.work_started = STATUS.in_progress;

const STEPS = ['Requested', 'Pro assigned', 'In progress', 'Done'];
const stepFor = (status) => {
  if (status === 'completed') return 3;
  if (status === 'in_progress' || status === 'work_started') return 2;
  if (status === 'accepted') return 1;
  return 0;
};

const CATEGORY_ICONS = [
  [/\bac\b|air ?con|cooling/i, Snowflake],
  [/plumb|leak|tap|pipe|water/i, Droplets],
  [/electr|wiring|switch|fan/i, Zap],
  [/clean|pest|sanit/i, Sparkles],
  [/carpent|furniture|wood/i, Hammer],
  [/paint/i, PaintRoller],
];
const getCategoryIcon = (c = '') => (CATEGORY_ICONS.find(([re]) => re.test(c)) || [null, Wrench])[1];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatDate = (raw) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw); // e.g. "Today" stored as text
  const t = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(t)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const formatSlot = (slot) => (slot ? slot.replace(/\s*-\s*/, '–') : null);
const rupees = (n) => (n === undefined || n === null || n === '' ? null : `₹${n}`);
const vendorNameOf = (v) => v?.businessName || v?.name || v?.ownerName || 'Service partner';
const vendorPhotoOf = (v) => v?.profilePic || v?.profileImage || null;
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const RATING_WORDS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

/* ---------- Small pieces ---------- */
function Avatar({ uri, name, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={[box, { backgroundColor: C.field }]} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[box, styles.avatarFallback]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(10, Math.round(size * 0.34)) }]}>{initials(name)}</Text>
    </View>
  );
}

function PulseDot() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={styles.pulseWrap}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
          },
        ]}
      />
      <View style={styles.pulseDot} />
    </View>
  );
}

function Stepper({ step = 0 }) {
  const safeStep = Math.max(0, Math.min(STEPS.length - 1, Number(step) || 0));
  const totalSteps = STEPS.length;
  const progressRatio = totalSteps > 1 ? safeStep / (totalSteps - 1) : 0;
  const widthPercent = `${Math.round(progressRatio * 100)}%`;
  return (
    <View style={styles.stepper} accessible accessibilityLabel={`Step ${safeStep + 1} of ${totalSteps}: ${STEPS[safeStep]}`}>
      <View style={styles.stepLineBg}>
        <View style={[styles.stepLineFill, { width: widthPercent }]} />
      </View>
      {STEPS.map((label, i) => {
        const done = i < safeStep || safeStep === totalSteps - 1;
        const current = i === safeStep && !done;
        return (
          <View key={label} style={styles.stepCol}>
            <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
              {done ? <Check size={11} color={C.white} strokeWidth={3} /> : current ? <View style={styles.stepInner} /> : null}
            </View>
            <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function OtpBlock({ otp }) {
  const digits = otp ? String(otp).split('') : [];
  return (
    <View style={styles.otpBox}>
      <View style={styles.otpHead}>
        <KeyRound size={14} color={C.indigo} />
        <Text style={styles.otpTitle}>Start code</Text>
      </View>
      {digits.length ? (
        <>
          <View style={styles.otpDigits} accessible accessibilityLabel={`Start code ${digits.join(' ')}`}>
            {digits.map((d, i) => (
              <View key={i} style={styles.otpDigit}>
                <Text style={styles.otpDigitText}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.otpHint}>Share this code only after the pro reaches your door.</Text>
        </>
      ) : (
        <Text style={styles.otpHint}>Your code will appear here before the pro arrives.</Text>
      )}
    </View>
  );
}

/* ---------- Screen ---------- */
export default function RequestDetailsScreen({ route, navigation }) {
  const { requestId } = route.params;
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();

  const [requestDetails, setRequestDetails] = useState(null);
  const [offers, setOffers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [accepting, setAccepting] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const sortOffers = (list) => [...list].sort((a, b) => Number(a.bidAmount) - Number(b.bidAmount));

  /* ---------- Data ---------- */
  const fetchRequestDetailsAndOffers = async (mode = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);
    try {
      const [reqRes, offersRes, unreadRes] = await Promise.all([
        getServiceRequestByIdApi(requestId),
        getOffersByRequestIdApi(requestId),
        token ? getUnreadChatCountApi(token, requestId) : Promise.resolve({ success: false }),
      ]);
      if (reqRes?.success) {
        setRequestDetails(reqRes.request);
        setLoadError(false);
        if (reqRes.request?.review?.rating) {
          setRating(reqRes.request.review.rating);
          setReviewComment(reqRes.request.review.comment || '');
        }
      } else if (mode === 'initial') {
        setLoadError(true);
      }
      if (offersRes?.success && Array.isArray(offersRes.data)) setOffers(sortOffers(offersRes.data));
      if (unreadRes?.success) setUnreadCount(unreadRes.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch details', error);
      if (mode === 'initial') setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequestDetailsAndOffers('initial');

    const socket = io(API_BASE_URL.replace('/api', ''));
    socket.on('connect', () => {
      socket.emit('joinRequestRoom', requestId);
      socket.emit('joinChatRoom', requestId);
    });

    socket.on('newOffer', (bid) => {
      // De-duplicate in case the same bid also arrives through a refetch
      setOffers((prev) => sortOffers([bid, ...prev.filter((o) => o._id !== bid?._id)]));
    });

    socket.on('offerAccepted', () => fetchRequestDetailsAndOffers('silent'));

    socket.on('jobStatusUpdated', (payload) => {
      if (String(payload?.serviceRequestId) !== String(requestId)) return;
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status,
              workStartedAt: payload.workStartedAt || prev.workStartedAt,
              completedAt: payload.completedAt || prev.completedAt,
              finalAmount: payload.finalAmount !== undefined ? payload.finalAmount : prev.finalAmount,
              paymentMode: payload.paymentMode || prev.paymentMode,
            }
          : prev
      );
      if (payload.status === 'completed') setShowReviewModal(true);
    });

    socket.on('receiveMessage', () => {
      if (token && requestId) {
        getUnreadChatCountApi(token, requestId).then((res) => {
          if (res?.success) setUnreadCount(res.unreadCount || 0);
        });
      }
    });

    return () => {
      socket.emit('leaveRequestRoom', requestId);
      socket.emit('leaveChatRoom', requestId);
      socket.disconnect();
    };
  }, [requestId, token]);

  /* ---------- Derived ---------- */
  const status = requestDetails?.status || 'pending';
  const statusMeta = STATUS[status] || STATUS.pending;
  const isCancelled = status === 'cancelled';
  const isAssigned =
    !isCancelled &&
    (['accepted', 'in_progress', 'work_started', 'completed'].includes(status) || !!requestDetails?.assignedVendor);
  const assignedVendor = requestDetails?.assignedVendor || (selectedOffer ? selectedOffer.vendor : null);
  const step = stepFor(status);

  /* ---------- Actions ---------- */
  useFocusEffect(
    useCallback(() => {
      if (token && requestId) {
        getUnreadChatCountApi(token, requestId).then((res) => {
          if (res?.success) setUnreadCount(res.unreadCount || 0);
        });
      }
    }, [token, requestId])
  );

  const handleOpenLiveChat = (vendorTarget) => {
    const v = vendorTarget || assignedVendor;
    const vendorName = vendorNameOf(v);
    const vendorId = v?._id || v?.id || (typeof v === 'string' ? v : null);
    navigation.navigate('UserChat', {
      serviceRequestId: requestDetails?._id || requestId,
      customerId: requestDetails?.customer?._id || requestDetails?.customer || user?._id,
      vendorId,
      vendorName,
    });
  };

  const handleAcceptOffer = async () => {
    if (!selectedOffer) return;
    setAccepting(true);
    try {
      const res = await acceptOfferApi(selectedOffer._id);
      if (res?.success) {
        setShowAcceptModal(false);
        fetchRequestDetailsAndOffers('silent');
      } else {
        Alert.alert('Couldn’t book this pro', res?.message || 'Try again in a moment.');
      }
    } catch (error) {
      Alert.alert('Couldn’t book this pro', 'Check your internet connection and try again.');
    } finally {
      setAccepting(false);
    }
  };

  const openAcceptModal = (offer) => {
    setSelectedOffer(offer);
    setShowAcceptModal(true);
  };

  const handleSubmitReview = async () => {
    if (submittingReview) return;
    setSubmittingReview(true);
    try {
      const res = await submitServiceRequestReviewApi(token, requestId, {
        rating,
        comment: reviewComment,
      });
      if (res?.success) {
        setReviewSubmitted(true);
        setRequestDetails((prev) =>
          prev
            ? {
                ...prev,
                review: res.review || { rating, comment: reviewComment },
              }
            : prev
        );
      } else {
        Alert.alert('Couldn’t submit review', res?.message || 'Please try again.');
      }
    } catch (err) {
      Alert.alert('Connection error', 'Check your internet connection and try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ---------- Loading / error ---------- */
  if (loading && !requestDetails) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: C.page }]}>
        <ActivityIndicator size="large" color={C.indigo} />
      </SafeAreaView>
    );
  }

  if (!requestDetails) {
    return (
      <SafeAreaView style={[styles.safe, styles.center, { backgroundColor: C.page, padding: 24 }]}>
        <View style={styles.stateIcon}>
          <AlertCircle size={24} color={C.error} />
        </View>
        <Text style={styles.stateTitle}>{loadError ? 'Couldn’t load this request' : 'Request not found'}</Text>
        <Text style={styles.stateBody}>Check your connection, then try again.</Text>
        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.goBack()}>
            <Text style={styles.btnOutlineText}>Go back</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={styles.btnSolid} onPress={() => fetchRequestDetailsAndOffers('initial')}>
            <RefreshCw size={14} color={C.white} style={{ marginRight: 6 }} />
            <Text style={styles.btnSolidText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const CategoryIcon = getCategoryIcon(requestDetails.category);
  const orderId = String(requestDetails._id || '').slice(-4).toUpperCase();
  const title = requestDetails.title || `${requestDetails.category || 'Service'} request`;
  const addr = requestDetails.address || {};
  const addressText = [addr.street, addr.city, addr.pincode].filter(Boolean).join(', ');
  const when = [formatDate(requestDetails.schedule?.date), formatSlot(requestDetails.schedule?.timeSlot)]
    .filter(Boolean)
    .join(', ');
  const description = requestDetails.description || '';
  const longDesc = description.length > 140;
  const images = Array.isArray(requestDetails.images) ? requestDetails.images : [];

  const statusCopy =
    status === 'completed'
      ? { title: 'Job completed', sub: 'Thanks for booking. Rate your pro to help others choose.' }
      : step === 2
      ? { title: 'Work in progress', sub: 'Your pro verified the start code and is working on the job.' }
      : { title: 'Pro assigned', sub: `${vendorNameOf(assignedVendor)} will arrive at the scheduled time.` };

  /* ---------- Render ---------- */
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
              {title}
            </Text>
            <View style={styles.headerMeta}>
              <View style={[styles.pill, { backgroundColor: statusMeta.bg }]}>
                <View style={[styles.pillDot, { backgroundColor: statusMeta.dot }]} />
                <Text style={[styles.pillText, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
              </View>
              {!!orderId && <Text style={styles.headerOrder}>Order #{orderId}</Text>}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRequestDetailsAndOffers('refresh')}
              tintColor={C.indigo}
              colors={[C.indigo]}
            />
          }
        >
          {/* Job details */}
          <View style={styles.card}>
            {!!description && (
              <>
                <Text style={styles.desc} numberOfLines={descExpanded ? undefined : 3}>
                  {description}
                </Text>
                {longDesc && (
                  <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} hitSlop={{ top: 6, bottom: 6 }}>
                    <Text style={styles.moreLink}>{descExpanded ? 'Show less' : 'Show more'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={[styles.infoBlock, !description && { marginTop: 0, paddingTop: 0, borderTopWidth: 0 }]}>
              {!!when && (
                <View style={styles.infoRow}>
                  <CalendarDays size={14} color={C.faint} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{when}</Text>
                </View>
              )}
              {!!addressText && (
                <View style={styles.infoRow}>
                  <MapPin size={14} color={C.faint} style={styles.infoIcon} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {addressText}
                  </Text>
                </View>
              )}
            </View>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {images.map((uri, idx) => (
                  <TouchableOpacity
                    key={`${uri}-${idx}`}
                    onPress={() => setPreviewUri(uri)}
                    activeOpacity={0.85}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Open photo ${idx + 1}`}
                  >
                    <Image source={{ uri }} style={styles.photo} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Cancelled */}
          {isCancelled && (
            <View style={[styles.card, styles.rowCenter]}>
              <View style={[styles.iconCircle, { backgroundColor: C.errorBg }]}>
                <AlertCircle size={18} color={C.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>This request was cancelled</Text>
                <Text style={styles.cardSub}>You can post a new request any time.</Text>
              </View>
            </View>
          )}

          {/* Quotes (before a pro is booked) */}
          {!isAssigned && !isCancelled && (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Quotes</Text>
                {offers.length > 0 && (
                  <Text style={styles.sectionAside}>
                    {offers.length} {offers.length === 1 ? 'pro' : 'pros'} replied
                  </Text>
                )}
              </View>

              {offers.length === 0 ? (
                <View style={[styles.card, styles.rowCenter]}>
                  <PulseDot />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      Finding pros near {addr.pincode || 'you'}
                    </Text>
                    <Text style={styles.cardSub}>
                      Quotes usually arrive in 2–5 minutes. This page updates on its own.
                    </Text>
                  </View>
                </View>
              ) : (
                offers.map((offer, idx) => {
                  const v = offer.vendor || {};
                  const name = vendorNameOf(v);
                  return (
                    <View key={offer._id || idx} style={styles.card}>
                      <View style={styles.rowCenter}>
                        <Avatar uri={vendorPhotoOf(v)} name={name} size={40} />
                        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
                          <View style={styles.rowCenter}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                              {name}
                            </Text>
                            {idx === 0 && offers.length > 1 && <Text style={styles.lowestTag}>Lowest</Text>}
                          </View>
                          <View style={styles.vendorMeta}>
                            {!!v.rating && (
                              <View style={styles.metaItem}>
                                <Star size={12} color={C.star} fill={C.star} />
                                <Text style={styles.metaStrong}>{v.rating}</Text>
                              </View>
                            )}
                            {!!v.completedJobsCount && (
                              <Text style={[styles.metaText, styles.metaItem]}>{v.completedJobsCount} jobs</Text>
                            )}
                            {!!offer.estimatedTime && (
                              <View style={styles.metaItem}>
                                <Clock size={12} color={C.faint} />
                                <Text style={[styles.metaText, { marginLeft: 3 }]}>{offer.estimatedTime}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={styles.price}>{rupees(offer.bidAmount)}</Text>
                      </View>

                      {!!offer.message && (
                        <Text style={styles.quoteMsg} numberOfLines={3}>
                          “{offer.message}”
                        </Text>
                      )}

                      <View style={styles.quoteActions}>
                        <TouchableOpacity
                          onPress={() => handleOpenLiveChat(v)}
                          activeOpacity={0.8}
                          style={[styles.btnOutline, { flex: 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Chat with ${name}`}
                        >
                          <MessageSquare size={14} color={C.ink} style={{ marginRight: 6 }} />
                          <Text style={styles.btnOutlineText}>Chat</Text>
                        </TouchableOpacity>
                        <View style={{ width: 8 }} />
                        <TouchableOpacity
                          onPress={() => openAcceptModal(offer)}
                          activeOpacity={0.88}
                          style={[styles.btnSolid, { flex: 1 }]}
                          accessibilityRole="button"
                          accessibilityLabel={`Accept ${name}'s quote of ${rupees(offer.bidAmount)}`}
                        >
                          <Text style={styles.btnSolidText}>Accept quote</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* Booked: progress, code, pro */}
          {isAssigned && (
            <View style={styles.card}>
              <Stepper step={step} />

              <Text style={styles.statusTitle}>{statusCopy.title}</Text>
              <Text style={styles.statusSub}>{statusCopy.sub}</Text>

              {status === 'accepted' && <OtpBlock otp={requestDetails.startOtp} />}

              {status === 'completed' && (
                <>
                  <View style={styles.paidBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paidLabel}>
                        Paid{requestDetails.paymentMode ? ` by ${String(requestDetails.paymentMode).toLowerCase()}` : ''}
                      </Text>
                      <Text style={styles.paidAmount}>{rupees(requestDetails.finalAmount) || '—'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowReviewModal(true)}
                      activeOpacity={0.85}
                      style={styles.rateBtn}
                      accessibilityRole="button"
                    >
                      <Star size={14} color={C.star} fill={C.star} style={{ marginRight: 6 }} />
                      <Text style={styles.rateBtnText}>
                        {requestDetails.review?.rating ? `${requestDetails.review.rating}★ Rated` : 'Rate pro'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Invoice', { serviceRequestId: requestId, requestId })}
                    activeOpacity={0.88}
                    style={styles.invoiceBtn}
                    accessibilityRole="button"
                    accessibilityLabel="View digital invoice"
                  >
                    <FileText size={15} color={C.indigo} style={{ marginRight: 6 }} />
                    <Text style={styles.invoiceBtnText}>View Digital Invoice</Text>
                  </TouchableOpacity>
                </>
              )}

              {assignedVendor && (
                <View style={styles.proRow}>
                  <Avatar uri={vendorPhotoOf(assignedVendor)} name={vendorNameOf(assignedVendor)} size={40} />
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {vendorNameOf(assignedVendor)}
                    </Text>
                    <View style={styles.vendorMeta}>
                      {!!assignedVendor.rating && (
                        <View style={styles.metaItem}>
                          <Star size={12} color={C.star} fill={C.star} />
                          <Text style={styles.metaStrong}>{assignedVendor.rating}</Text>
                        </View>
                      )}
                      <View style={styles.metaItem}>
                        <ShieldCheck size={12} color={C.success} />
                        <Text style={[styles.metaText, { marginLeft: 3 }]}>Verified partner</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenLiveChat(assignedVendor)}
                    activeOpacity={0.88}
                    style={styles.btnSolid}
                    accessibilityRole="button"
                    accessibilityLabel={`Chat with your pro${unreadCount ? `, ${unreadCount} unread` : ''}`}
                  >
                    <MessageSquare size={14} color={C.white} style={{ marginRight: 6 }} />
                    <Text style={styles.btnSolidText}>Chat</Text>
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Photo preview */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.previewBg}>
          <TouchableOpacity
            style={[styles.previewClose, { top: insets.top + 12 }]}
            onPress={() => setPreviewUri(null)}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <X size={20} color={C.white} />
          </TouchableOpacity>
          {previewUri && <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Accept quote */}
      <Modal
        visible={showAcceptModal}
        animationType="slide"
        transparent
        onRequestClose={() => !accepting && setShowAcceptModal(false)}
      >
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => !accepting && setShowAcceptModal(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Book this pro?</Text>
              <TouchableOpacity onPress={() => setShowAcceptModal(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            {selectedOffer && (
              <>
                <View style={styles.acceptRow}>
                  <Avatar uri={vendorPhotoOf(selectedOffer.vendor)} name={vendorNameOf(selectedOffer.vendor)} size={44} />
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {vendorNameOf(selectedOffer.vendor)}
                    </Text>
                    <Text style={styles.cardSub}>Quoted price</Text>
                  </View>
                  <Text style={styles.price}>{rupees(selectedOffer.bidAmount)}</Text>
                </View>

                <View style={styles.checkLine}>
                  <Check size={15} color={C.success} strokeWidth={3} />
                  <Text style={styles.checkText}>Pay after the job is done</Text>
                </View>
                <View style={styles.checkLine}>
                  <Check size={15} color={C.success} strokeWidth={3} />
                  <Text style={styles.checkText}>Background-verified professional</Text>
                </View>

                <TouchableOpacity
                  onPress={handleAcceptOffer}
                  disabled={accepting}
                  activeOpacity={0.88}
                  style={[styles.bigCta, accepting && { opacity: 0.85 }]}
                  accessibilityRole="button"
                >
                  {accepting ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <Text style={styles.bigCtaText}>Confirm booking</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Review */}
      <Modal visible={showReviewModal} animationType="slide" transparent onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowReviewModal(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {reviewSubmitted ? 'Thanks for rating' : `Rate ${vendorNameOf(assignedVendor)}`}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            {reviewSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <View style={[styles.iconCircle, { width: 52, height: 52, borderRadius: 26, backgroundColor: C.successBg, marginRight: 0 }]}>
                  <Check size={26} color={C.success} strokeWidth={3} />
                </View>
                <Text style={[styles.cardSub, { textAlign: 'center', marginTop: 10 }]}>
                  Your rating helps other customers pick the right pro.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowReviewModal(false);
                    setReviewSubmitted(false);
                  }}
                  style={[styles.bigCta, { alignSelf: 'stretch' }]}
                >
                  <Text style={styles.bigCtaText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.stars} accessibilityRole="radiogroup">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setRating(n)}
                      activeOpacity={0.8}
                      style={{ padding: 4 }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: rating === n }}
                      accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star size={34} color={n <= rating ? C.star : '#C3C9D6'} fill={n <= rating ? C.star : 'transparent'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingWord}>{RATING_WORDS[rating]}</Text>

                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Write a brief comment (optional)..."
                  placeholderTextColor={C.faint}
                  style={styles.reviewInput}
                  multiline
                  maxLength={250}
                />

                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                  activeOpacity={0.88}
                  style={[styles.bigCta, submittingReview && { opacity: 0.7 }]}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <Text style={styles.bigCtaText}>Submit rating</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },
  center: { alignItems: 'center', justifyContent: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  /* Header */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  headerIconWrap: { position: 'absolute', right: -30, bottom: -36, transform: [{ rotate: '-14deg' }] },
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
  headerTitle: { fontSize: 21, lineHeight: 26, fontWeight: '800', color: C.white, letterSpacing: -0.5 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  headerOrder: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginLeft: 8 },

  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  pillText: { fontSize: 11.5, fontWeight: '700' },

  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: C.page,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
  content: { paddingHorizontal: 12, paddingTop: 14 },

  /* Cards */
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { flexShrink: 1, fontSize: 14.5, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  cardSub: { fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 17 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  /* Job details */
  desc: { fontSize: 14, lineHeight: 20, color: C.ink },
  moreLink: { fontSize: 13, fontWeight: '700', color: C.indigo, marginTop: 4 },
  infoBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.hair },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  infoIcon: { marginTop: 2, marginRight: 8 },
  infoText: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '500', lineHeight: 18 },
  photo: { width: 56, height: 56, borderRadius: 10, marginRight: 8, backgroundColor: C.field },

  /* Section */
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4, marginTop: 4, marginBottom: 8 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
  sectionAside: { fontSize: 12, fontWeight: '600', color: C.faint },

  /* Waiting */
  pulseWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  pulseRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: C.amber },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.amber },

  /* Quote card */
  avatarFallback: { backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '800' },
  lowestTag: {
    fontSize: 10.5,
    fontWeight: '800',
    color: C.success,
    backgroundColor: C.successBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
    overflow: 'hidden',
  },
  vendorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  metaStrong: { fontSize: 12, fontWeight: '700', color: C.ink, marginLeft: 3 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  price: { fontSize: 19, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  quoteMsg: {
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
    backgroundColor: C.field,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  quoteActions: { flexDirection: 'row', marginTop: 10 },

  /* Buttons */
  btnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.indigo,
  },
  btnSolidText: { color: C.white, fontSize: 13.5, fontWeight: '800' },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCE1EC',
    backgroundColor: C.white,
  },
  btnOutlineText: { color: C.ink, fontSize: 13.5, fontWeight: '700' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: C.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  badgeText: { color: C.white, fontSize: 10.5, fontWeight: '800' },

  /* Stepper */
  stepper: { flexDirection: 'row', marginBottom: 12 },
  stepLineBg: {
    position: 'absolute',
    top: 10,
    left: '12.5%',
    right: '12.5%',
    height: 2,
    backgroundColor: C.line,
    borderRadius: 1,
  },
  stepLineFill: { height: 2, backgroundColor: C.indigo, borderRadius: 1 },
  stepCol: { flex: 1, alignItems: 'center' },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: C.indigo, borderColor: C.indigo },
  stepDotCurrent: { borderColor: C.indigo },
  stepInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.indigo },
  stepLabel: { fontSize: 10.5, color: C.faint, fontWeight: '600', marginTop: 4 },
  stepLabelOn: { color: C.ink, fontWeight: '700' },

  statusTitle: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  statusSub: { fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 2 },

  /* Start code */
  otpBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.indigoSoft,
    borderWidth: 1,
    borderColor: '#D3DAF2',
  },
  otpHead: { flexDirection: 'row', alignItems: 'center' },
  otpTitle: { fontSize: 13, fontWeight: '800', color: C.indigo, marginLeft: 6 },
  otpDigits: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 8 },
  otpDigit: {
    width: 46,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  otpDigitText: { fontSize: 24, fontWeight: '800', color: C.ink },
  otpHint: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 },

  /* Completed */
  paidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.successBg,
  },
  paidLabel: { fontSize: 12, color: C.success, fontWeight: '700' },
  paidAmount: { fontSize: 20, color: C.ink, fontWeight: '800', marginTop: 1 },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.white,
  },
  rateBtnText: { fontSize: 13, fontWeight: '800', color: C.ink },

  /* Pro row */
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.hair,
  },

  /* Error state */
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: { fontSize: 17, fontWeight: '800', color: C.ink, textAlign: 'center' },
  stateBody: { fontSize: 13.5, color: C.muted, textAlign: 'center', marginTop: 4 },

  /* Photo preview */
  previewBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  previewImg: { width: '100%', height: '80%' },
  previewClose: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bottom sheets */
  backdrop: { flex: 1, backgroundColor: 'rgba(22,26,43,0.55)', justifyContent: 'flex-end' },
  bottomSheet: {
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
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.field,
    marginBottom: 12,
  },
  checkLine: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  checkText: { fontSize: 13.5, color: C.muted, marginLeft: 8, fontWeight: '500' },
  bigCta: {
    height: 48,
    borderRadius: 14,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  bigCtaText: { color: C.white, fontSize: 15, fontWeight: '800' },
  stars: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  ratingWord: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 6 },
  reviewInput: {
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.ink,
    marginTop: 12,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: '#CBD3EE',
    borderRadius: 12,
    height: 42,
    marginTop: 8,
  },
  invoiceBtnText: {
    color: C.indigo,
    fontSize: 13,
    fontWeight: '800',
  },
});