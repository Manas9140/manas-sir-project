import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  MessageSquare,
  Navigation,
  CheckCircle2,
  Calendar,
  X,
  KeyRound,
  Check,
  Briefcase,
  CircleCheckBig,
} from 'lucide-react-native';
import io from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import {
  getAssignedRequestsApi,
  verifyStartOtpApi,
  completeServiceRequestApi,
  getUnreadChatCountApi,
  SOCKET_URL,
} from '../../services/api';

const C = {
  navy: '#0f1729',
  page: '#f6f7f8',
  white: '#ffffff',
  slateBorder: '#E2E8F0',
  emerald: '#10b981',
  emeraldBg: '#ECFDF5',
  emeraldText: '#065F46',
  muted: '#6b7280',
  inkSub: '#475569',
  field: '#f6f7f8',
  line: '#E2E8F0',
  error: '#EF4444',
  errorBg: '#FEF2F2',
};

const START_OTP_LENGTH = 4;
const PROGRESS_STEPS = ['Accepted', 'Arrived / Start OTP', 'Work in Progress', 'Completed'];

export default function VendorJobsScreen({ navigation }) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('in_progress');
  const [jobs, setJobs] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Start OTP modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const otpInputRef = useRef(null);

  // Complete job modal
  const [completingJob, setCompletingJob] = useState(null);
  const [finalAmount, setFinalAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [completeDone, setCompleteDone] = useState(false);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAssignedRequestsApi(token);
      if (res.success && Array.isArray(res.requests)) {
        const list = res.requests || [];
        setJobs(list);
        fetchUnreadCounts(list);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Fetch unread chat message counts
  const fetchUnreadCounts = async (jobList) => {
    if (!token || !jobList || jobList.length === 0) return;
    try {
      const counts = {};
      const activeList = jobList.filter(
        (j) => j.status === 'accepted' || j.status === 'in_progress' || j.status === 'work_started'
      );
      await Promise.all(
        activeList.map(async (j) => {
          const res = await getUnreadChatCountApi(token, j._id);
          if (res?.success && res.unreadCount > 0) {
            counts[j._id] = res.unreadCount;
          }
        })
      );
      setUnreadCounts(counts);
    } catch (e) {}
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time socket listener for incoming chat messages to bump unread badges
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('receiveMessage', (msg) => {
      if (msg?.serviceRequestId && msg.senderModel === 'User') {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.serviceRequestId]: (prev[msg.serviceRequestId] || 0) + 1,
        }));
      }
    });

    socket.on('jobStatusUpdated', (payload) => {
      if (payload?.serviceRequestId) {
        fetchJobs();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const inProgressJobs = jobs.filter(
    (j) => j.status === 'accepted' || j.status === 'in_progress' || j.status === 'work_started'
  );
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const completedTotal = completedJobs.reduce((s, j) => s + (Number(j.finalAmount) || 0), 0);

  // Open Maps
  const openMaps = (address) => {
    const coords = address?.location?.coordinates;
    const street = [address?.street, address?.city].filter(Boolean).join(', ');
    if (coords && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)) {
      const [lng, lat] = coords;
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(street)})`,
      });
      Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(street)}`);
    }
  };

  // Navigate to Chat
  const handleOpenChat = (job) => {
    setUnreadCounts((prev) => ({ ...prev, [job._id]: 0 }));
    navigation.navigate('VendorChat', {
      serviceRequestId: job._id,
      customerId: job.customer?._id || job.customer?.id,
      customerName: job.customer?.name || 'Customer',
      jobTitle: job.title || `${job.category} service`,
    });
  };

  // OTP handlers
  const openOtpSheet = (job) => {
    setSelectedJob(job);
    setOtpCode('');
    setOtpError('');
    setOtpSuccess('');
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== START_OTP_LENGTH) {
      setOtpError('Enter the 4-digit code from the customer.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError('');
    try {
      const res = await verifyStartOtpApi(token, selectedJob._id, otpCode.trim());
      if (res.success) {
        setOtpSuccess('Security code verified. Job started.');
        setTimeout(() => {
          setSelectedJob(null);
          setOtpCode('');
          setOtpSuccess('');
          fetchJobs();
        }, 1200);
      } else {
        setOtpError(res.message || 'Incorrect code. Ask customer to verify from their booking screen.');
      }
    } catch (err) {
      setOtpError('Network connection issue. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Complete handlers
  const openCompleteSheet = (job) => {
    setCompletingJob(job);
    setFinalAmount(String(job.finalAmount || 250));
    setPaymentMode(job.paymentMode || 'Cash');
    setCompleteError('');
    setCompleteDone(false);
  };

  const handleCompleteJob = async () => {
    if (!finalAmount || isNaN(finalAmount) || Number(finalAmount) <= 0) {
      setCompleteError('Please enter a valid final charged amount.');
      return;
    }
    setSubmittingComplete(true);
    setCompleteError('');
    try {
      const res = await completeServiceRequestApi(
        token,
        completingJob._id,
        Number(finalAmount),
        paymentMode
      );
      if (res.success) {
        setCompleteDone(true);
        fetchJobs();
        setTimeout(() => {
          setCompletingJob(null);
          setFinalAmount('');
          setCompleteDone(false);
        }, 1400);
      } else {
        setCompleteError(res.message || 'Could not complete job. Try again.');
      }
    } catch (e) {
      setCompleteError('Network connection issue. Please try again.');
    } finally {
      setSubmittingComplete(false);
    }
  };

  // Progress Stepper Component
  const Progress = ({ current }) => (
    <View style={styles.progress}>
      {PROGRESS_STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  done && { backgroundColor: C.navy, borderColor: C.navy },
                  active && { backgroundColor: '#ffffff', borderColor: C.navy, borderWidth: 2.5 },
                ]}
              >
                {done && <Check size={11} color="#ffffff" strokeWidth={3} />}
                {active && <View style={styles.activeDotInner} />}
              </View>
              <Text style={[styles.progressLabel, (done || active) && { color: C.navy, fontWeight: '700' }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
            {i < PROGRESS_STEPS.length - 1 && (
              <View style={[styles.progressLine, done && { backgroundColor: C.navy }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Active Job Card
  const ActiveJobCard = ({ job }) => {
    const isWorkStarted = job.status === 'work_started';
    const address = [job.address?.street, job.address?.city].filter(Boolean).join(', ');
    const customerName = job.customer?.name || 'Customer';
    const unread = unreadCounts[job._id] || 0;

    return (
      <View style={styles.card}>
        {/* Customer Identity Header */}
        <View style={styles.cardHead}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>{job.category || 'General Service'}</Text>
              <Text style={styles.jobIdTag}>#{String(job._id || '').slice(-4).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {job.title || `${job.category} service`}
            </Text>
            <Text style={styles.cardSub}>
              {job.schedule?.date || 'Today'} · {job.schedule?.timeSlot || 'Scheduled'}
            </Text>
          </View>

          {/* Agreed Price Badge */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>₹{job.finalAmount || 250}</Text>
          </View>
        </View>

        {/* 4-Step Progress Stepper: Accepted -> Arrived/Start OTP -> Work in Progress -> Completed */}
        <Progress current={isWorkStarted ? 2 : 1} />

        {/* Customer Identity Row with Dedicated Chat Action Button */}
        <View style={styles.customerCardSection}>
          <View style={styles.customerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{String(customerName)[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.infoTitle} numberOfLines={1}>{customerName}</Text>
              <Text style={styles.secureTag}>In-App Chat Channel</Text>
            </View>
          </View>

          {/* Dedicated Chat Action Button (Strictly No Phone Icon/Call) */}
          <TouchableOpacity
            onPress={() => handleOpenChat(job)}
            activeOpacity={0.85}
            style={styles.chatActionBtn}
          >
            <MessageSquare size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.chatActionBtnText}>Chat with Customer</Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Doorstep Address with "Open Maps" Button */}
        <View style={styles.addressSection}>
          <View style={styles.addressLeft}>
            <View style={styles.mapPinBox}>
              <MapPin size={16} color={C.navy} />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.addressLabel}>{job.address?.label || 'Doorstep Address'}</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {address || 'Address provided upon confirmation'}
              </Text>
              {!!job.address?.pincode && (
                <Text style={styles.pincodeText}>Pincode: {job.address.pincode}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => openMaps(job.address)}
            style={styles.openMapsBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open Maps"
          >
            <Navigation size={13} color={C.navy} style={{ marginRight: 4 }} />
            <Text style={styles.openMapsBtnText}>Open Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Job Actions: Start OTP CTA / Complete */}
        {!isWorkStarted ? (
          <TouchableOpacity
            onPress={() => openOtpSheet(job)}
            activeOpacity={0.88}
            style={styles.primaryBtn}
          >
            <KeyRound size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryText}>Arrived at Location • Enter Start OTP</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => openCompleteSheet(job)}
            activeOpacity={0.88}
            style={[styles.primaryBtn, { backgroundColor: '#059669' }]}
          >
            <CheckCircle2 size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryText}>Mark Job Completed</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.stepHint}>
          {isWorkStarted
            ? 'When work is complete, enter the final amount charged.'
            : 'Ask the customer for the 4-digit start OTP shown in their app.'}
        </Text>
      </View>
    );
  };

  // Completed Job Card
  const DoneJobCard = ({ job }) => (
    <View style={styles.doneCard}>
      <View style={styles.doneIcon}>
        <CircleCheckBig size={18} color={C.emerald} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.doneTitle} numberOfLines={1}>
          {job.title || `${job.category} service`}
        </Text>
        <Text style={styles.cardSub}>
          {job.customer?.name || 'Customer'} · {job.schedule?.date || 'Recent'}
        </Text>
      </View>
      <Text style={styles.doneAmount}>+₹{job.finalAmount || 250}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Assigned Jobs</Text>
            <Text style={styles.headerSub}>Manage your active and completed local work</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('in_progress')}
            activeOpacity={0.85}
            style={[styles.tabBtn, activeTab === 'in_progress' && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'in_progress' && styles.tabBtnTextActive,
              ]}
            >
              Active Jobs
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === 'in_progress' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  activeTab === 'in_progress' && styles.countBadgeTextActive,
                ]}
              >
                {inProgressJobs.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.85}
            style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'completed' && styles.tabBtnTextActive,
              ]}
            >
              Completed
            </Text>
            <View
              style={[
                styles.countBadge,
                activeTab === 'completed' && styles.countBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  activeTab === 'completed' && styles.countBadgeTextActive,
                ]}
              >
                {completedJobs.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Feed */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={C.navy} />
            <Text style={styles.loadingText}>Loading assigned jobs...</Text>
          </View>
        ) : activeTab === 'in_progress' ? (
          inProgressJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Briefcase size={26} color={C.navy} />
              </View>
              <Text style={styles.emptyTitle}>No Active Jobs</Text>
              <Text style={styles.emptySub}>
                Accepted orders will appear here. To view and bid on newly posted jobs in your area, visit the Leads tab.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('VendorDashboard')}
                activeOpacity={0.85}
                style={{
                  backgroundColor: C.navy,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginTop: 14,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                  View Available Leads in 395010
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            inProgressJobs.map((job) => <ActiveJobCard key={job._id} job={job} />)
          )
        ) : completedJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <CircleCheckBig size={26} color={C.emerald} />
            </View>
            <Text style={styles.emptyTitle}>No Completed Jobs Yet</Text>
            <Text style={styles.emptySub}>
              Finished orders and verified earnings will be listed here.
            </Text>
          </View>
        ) : (
          <View style={styles.completedListWrapper}>
            <View style={styles.completedSummaryBanner}>
              <Text style={styles.completedSummaryLabel}>Total Finished Revenue</Text>
              <Text style={styles.completedSummaryValue}>₹{completedTotal}</Text>
            </View>
            {completedJobs.map((job) => (
              <DoneJobCard key={job._id} job={job} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Start Code OTP Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedJob(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setSelectedJob(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            {otpSuccess !== '' ? (
              <View style={styles.success}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={36} color={C.emerald} />
                </View>
                <Text style={styles.successTitle}>Security Code Verified</Text>
                <Text style={styles.successSub}>{otpSuccess}</Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Enter Customer Code</Text>
                    <Text style={styles.sheetSub} numberOfLines={1}>
                      {selectedJob?.customer?.name || 'Customer'} · {selectedJob?.title || selectedJob?.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedJob(null)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={C.navy} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sheetBody}>
                  Ask the customer for the 4-digit start OTP shown in their app.
                </Text>

                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => otpInputRef.current?.focus()}
                  style={styles.otpRow}
                >
                  {Array.from({ length: START_OTP_LENGTH }).map((_, i) => {
                    const ch = otpCode[i] || '';
                    const isCurrent = i === Math.min(otpCode.length, START_OTP_LENGTH - 1);
                    return (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          ch !== '' && { backgroundColor: '#ffffff', borderColor: C.navy },
                          isCurrent && { borderColor: C.navy, borderWidth: 2 },
                          otpError !== '' && { borderColor: C.error },
                        ]}
                      >
                        <Text style={styles.otpDigit}>{ch}</Text>
                      </View>
                    );
                  })}
                  <TextInput
                    ref={otpInputRef}
                    value={otpCode}
                    onChangeText={(v) => {
                      setOtpCode(v.replace(/\D/g, '').slice(0, START_OTP_LENGTH));
                      setOtpError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={START_OTP_LENGTH}
                    autoFocus
                    caretHidden
                    style={styles.hiddenInput}
                  />
                </TouchableOpacity>

                {otpError !== '' && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  disabled={verifyingOtp}
                  activeOpacity={0.85}
                  style={[
                    styles.sheetBtn,
                    otpCode.length !== START_OTP_LENGTH && { opacity: 0.6 },
                  ]}
                >
                  {verifyingOtp ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.sheetBtnText}>Verify & Start Work</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Complete Job Modal */}
      <Modal
        visible={!!completingJob}
        animationType="slide"
        transparent
        onRequestClose={() => setCompletingJob(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setCompletingJob(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            {completeDone ? (
              <View style={styles.success}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={36} color={C.emerald} />
                </View>
                <Text style={styles.successTitle}>Job Completed Successfully</Text>
                <Text style={styles.successSub}>
                  ₹{finalAmount} has been recorded in your completed jobs.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>Mark Job Completed</Text>
                    <Text style={styles.sheetSub}>
                      {completingJob?.customer?.name || 'Customer'} · {completingJob?.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCompletingJob(null)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={C.navy} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Payment Collection Method</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {['Cash', 'Online UPI'].map((mode) => {
                    const isSelected = paymentMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setPaymentMode(mode)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isSelected ? C.navy : C.slateBorder,
                          backgroundColor: isSelected ? '#F1F5F9' : '#ffffff',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? C.navy : C.muted }}>
                          {mode === 'Cash' ? '💵 Cash' : '📱 Online UPI'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Final Charged Amount (₹)</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <TextInput
                    value={finalAmount}
                    onChangeText={setFinalAmount}
                    keyboardType="number-pad"
                    placeholder="250"
                    placeholderTextColor="#94A3B8"
                    style={styles.amountInput}
                  />
                </View>
                <Text style={styles.hint}>
                  Enter the exact amount settled with the customer for services rendered.
                </Text>

                {completeError !== '' && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{completeError}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleCompleteJob}
                  disabled={submittingComplete}
                  activeOpacity={0.85}
                  style={[styles.sheetBtn, { backgroundColor: C.navy }]}
                >
                  {submittingComplete ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.sheetBtnText}>
                      Confirm Completion {finalAmount ? `(₹${finalAmount})` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.page,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.slateBorder,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.navy,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: C.field,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: C.slateBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  tabBtnTextActive: {
    color: C.navy,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: C.navy,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
  },
  countBadgeTextActive: {
    color: '#ffffff',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },

  /* Empty state */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.slateBorder,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.slateBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  /* Active Job Card */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.slateBorder,
    padding: 16,
    marginBottom: 4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  jobIdTag: {
    fontSize: 10,
    fontWeight: '800',
    color: C.navy,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.navy,
  },
  cardSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: C.emeraldBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.emeraldText,
  },

  /* Progress */
  progress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    marginBottom: 4,
  },
  progressStep: {
    alignItems: 'center',
    width: 68,
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.navy,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: C.line,
    marginTop: 9,
    marginHorizontal: -12,
  },

  /* Customer Section & In-App Chat */
  customerCardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  customerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.navy,
  },
  secureTag: {
    fontSize: 10,
    color: C.muted,
    marginTop: 1,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.navy,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* Address Section with Open Maps */
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 10,
  },
  addressLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mapPinBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.slateBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.navy,
  },
  addressText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 16,
    marginTop: 1,
  },
  pincodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.navy,
    marginTop: 1,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.slateBorder,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  openMapsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.navy,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepHint: {
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },

  /* Completed Jobs */
  completedListWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.slateBorder,
    overflow: 'hidden',
  },
  completedSummaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: C.emeraldBg,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  completedSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.emeraldText,
  },
  completedSummaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: C.emeraldText,
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  doneIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.navy,
  },
  doneAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: C.emerald,
    marginLeft: 8,
  },

  /* Modals */
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
  },
  sheetSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 18,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 10,
  },
  otpBox: {
    width: 54,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.slateBorder,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '800',
    color: C.navy,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },
  errorBox: {
    backgroundColor: C.errorBg,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.error,
    textAlign: 'center',
  },
  sheetBtn: {
    backgroundColor: C.navy,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  sheetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  success: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
  },
  successSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.navy,
    marginBottom: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.slateBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: C.navy,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: C.navy,
    padding: 0,
  },
  hint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
  },
});