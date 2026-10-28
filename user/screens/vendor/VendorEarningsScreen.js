import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, HelpCircle, IndianRupee, Landmark, CreditCard } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';

/* ---------- Sample data: replace with your earnings API ---------- */
const BALANCE = 4250;
const TODAY = { jobs: 2, earned: 900, fee: 0 };
const PERIODS = {
  week: {
    label: 'This week',
    bars: [
      { key: 'Mon', amount: 850 },
      { key: 'Tue', amount: 1200 },
      { key: 'Wed', amount: 450 },
      { key: 'Thu', amount: 1600 },
      { key: 'Fri', amount: 950 },
      { key: 'Sat', amount: 1400 },
      { key: 'Sun', amount: 600 },
    ],
    jobs: 17,
  },
  month: {
    label: 'This month',
    bars: [
      { key: 'Week 1', amount: 5200 },
      { key: 'Week 2', amount: 6800 },
      { key: 'Week 3', amount: 4900 },
      { key: 'Week 4', amount: 7100 },
    ],
    jobs: 61,
  },
};
const TRANSACTIONS = [
  { id: 'tx_1', title: 'AC Gas Refill & Service', customer: 'Priya Sharma', date: 'Today, 3:45 PM', amount: 650, type: 'credit', status: 'Completed' },
  { id: 'tx_2', title: 'Ceiling Fan Wiring & Repair', customer: 'Rahul Mehta', date: 'Today, 11:20 AM', amount: 250, type: 'credit', status: 'Completed' },
  { id: 'tx_3', title: 'Weekly payout to UPI', customer: 'Bank transfer', date: 'Yesterday, 7:00 PM', amount: 3400, type: 'payout', status: 'Transferred' },
  { id: 'tx_4', title: 'Switchboard Replacement', customer: 'Amit Patel', date: '12 Oct, 2:15 PM', amount: 300, type: 'credit', status: 'Completed' },
];

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
  white: '#FFFFFF',
  green: '#16A34A',
  greenSoft: '#E9F8EF',
};

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const CHART_H = 150;

export default function VendorEarningsScreen() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedBar, setSelectedBar] = useState(null);

  const period = PERIODS[selectedPeriod];
  const total = period.bars.reduce((s, b) => s + b.amount, 0);
  const max = Math.max(...period.bars.map((b) => b.amount), 1);
  const best = period.bars.reduce((a, b) => (b.amount > a.amount ? b : a), period.bars[0]);
  const shown = selectedBar != null ? period.bars[selectedBar] : null;

  const handleWithdraw = () => {
    if (!user?.upiId) {
      Alert.alert('Add a UPI ID first', 'Go to Profile, then Payouts and UPI, to add where you want to receive money.');
      return;
    }
    Alert.alert(
      'Withdraw to UPI',
      `${rupees(BALANCE)} will be sent to ${user.upiId} within 24 hours.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Withdraw' }]
    );
  };

  const switchPeriod = (p) => {
    setSelectedPeriod(p);
    setSelectedBar(null);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.amber }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.amber} />
      <ScrollView style={{ backgroundColor: C.field }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header with balance */}
        <View style={styles.header}>
          <View style={styles.inner}>
            <View style={styles.headTop}>
              <Text style={styles.title}>Earnings</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('How payouts work', 'You keep 100% of what you charge. Platform fee is ₹0 during the launch offer. Balance is sent to your UPI ID every week, or anytime you withdraw.')}
                style={styles.helpBtn}
                accessibilityRole="button"
                accessibilityLabel="How payouts work"
              >
                <HelpCircle size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <Text style={styles.balanceLabel}>Available to withdraw</Text>
            <Text style={styles.balance}>{rupees(BALANCE)}</Text>

            <View style={styles.upiRow}>
              <CreditCard size={15} color={C.inkSub} />
              <Text style={styles.upiText} numberOfLines={1}>
                {user?.upiId ? `Pays out to ${user.upiId}` : 'No UPI ID added yet'}
              </Text>
            </View>

            <TouchableOpacity onPress={handleWithdraw} activeOpacity={0.85} style={styles.withdrawBtn} accessibilityRole="button">
              <ArrowUpRight size={18} color={C.amber} />
              <Text style={styles.withdrawText}>Withdraw to UPI</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.inner, { paddingHorizontal: 16 }]}>
          {/* Today */}
          <Text style={styles.section}>Today</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayItem}>
              <Text style={styles.todayValue}>{TODAY.jobs}</Text>
              <Text style={styles.todayLabel}>Jobs done</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={[styles.todayValue, { color: C.green }]}>{rupees(TODAY.earned)}</Text>
              <Text style={styles.todayLabel}>Earned</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={styles.todayValue}>{rupees(TODAY.fee)}</Text>
              <Text style={styles.todayLabel}>Platform fee</Text>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.chartLabel}>{shown ? shown.key : period.label}</Text>
                <Text style={styles.chartTotal}>{rupees(shown ? shown.amount : total)}</Text>
                <Text style={styles.chartSub}>
                  {shown ? 'Tap the bar again to see the total' : `${period.jobs} jobs  ·  Best: ${best.key}, ${rupees(best.amount)}`}
                </Text>
              </View>
              <View style={styles.periodToggle}>
                {['week', 'month'].map((p) => {
                  const on = selectedPeriod === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => switchPeriod(p)}
                      style={[styles.periodBtn, on && styles.periodBtnOn]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.periodText, on && { color: C.white }]}>{p === 'week' ? 'Week' : 'Month'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.chart, { height: CHART_H + 24 }]}>
              {period.bars.map((b, i) => {
                const h = Math.max(6, Math.round((b.amount / max) * CHART_H));
                const isSel = selectedBar === i;
                const isBest = b.key === best.key;
                return (
                  <TouchableOpacity
                    key={b.key}
                    onPress={() => setSelectedBar(isSel ? null : i)}
                    activeOpacity={0.8}
                    style={styles.barCol}
                    accessibilityLabel={`${b.key}, ${rupees(b.amount)}`}
                  >
                    <View
                      style={[
                        styles.bar,
                        { height: h },
                        { backgroundColor: isSel || (selectedBar == null && isBest) ? C.amber : C.ink },
                        selectedBar != null && !isSel && { opacity: 0.35 },
                      ]}
                    />
                    <Text style={[styles.barLabel, isSel && { color: C.ink }]} numberOfLines={1}>
                      {selectedPeriod === 'month' ? b.key.replace('Week ', 'W') : b.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Transactions */}
          <Text style={styles.section}>Recent activity</Text>
          <View style={styles.list}>
            {TRANSACTIONS.map((t, i) => {
              const credit = t.type === 'credit';
              return (
                <View key={t.id} style={[styles.txRow, i < TRANSACTIONS.length - 1 && styles.txDivider]}>
                  <View style={[styles.txIcon, { backgroundColor: credit ? C.greenSoft : C.amberSoft }]}>
                    {credit ? <IndianRupee size={17} color={C.green} /> : <Landmark size={17} color={C.amberDeep} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.txSub} numberOfLines={1}>{t.customer}  ·  {t.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <Text style={[styles.txAmount, { color: credit ? C.green : C.ink }]}>
                      {credit ? '+' : '−'}{rupees(t.amount)}
                    </Text>
                    <Text style={styles.txStatus}>{t.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },

  header: { backgroundColor: C.amber, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  helpBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 14, fontWeight: '700', color: C.inkSub, marginTop: 18 },
  balance: { fontSize: 46, fontWeight: '800', color: C.ink, letterSpacing: -1.5, marginTop: 2 },
  upiRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  upiText: { fontSize: 13, color: C.inkSub, fontWeight: '600', flex: 1 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: C.ink, marginTop: 16 },
  withdrawText: { fontSize: 15, fontWeight: '800', color: C.white },

  section: { fontSize: 15, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 10, marginLeft: 2 },
  todayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingVertical: 16 },
  todayItem: { flex: 1, alignItems: 'center' },
  todayValue: { fontSize: 20, fontWeight: '800', color: C.ink },
  todayLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  todayDivider: { width: 1, height: 30, backgroundColor: C.line },

  chartCard: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, marginTop: 12 },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start' },
  chartLabel: { fontSize: 13, fontWeight: '700', color: C.muted },
  chartTotal: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.6, marginTop: 2 },
  chartSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  periodToggle: { flexDirection: 'row', backgroundColor: C.field, borderRadius: 12, padding: 3 },
  periodBtn: { paddingHorizontal: 12, height: 32, borderRadius: 9, justifyContent: 'center' },
  periodBtnOn: { backgroundColor: C.ink },
  periodText: { fontSize: 13, fontWeight: '800', color: C.muted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 20, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', maxWidth: 36, borderRadius: 8 },
  barLabel: { fontSize: 11, fontWeight: '700', color: C.faint, marginTop: 8 },

  list: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  txSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  txStatus: { fontSize: 11, color: C.faint, marginTop: 2, fontWeight: '600' },
});