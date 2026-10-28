import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Printer, Check, AlertCircle, RefreshCw, ReceiptText } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../src/context/AuthContext';
import { getServiceRequestInvoiceApi } from '../../services/api';

// Shown on the invoice and PDF. Match your app name (the login screen says "LocalServices").
const BRAND = 'LocalServices';

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
  success: '#0F7A4A',
  successBg: '#E7F6EE',
};

/* ---------- Helpers ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Manual formatting: toLocale* options are ignored on some Android builds
const formatDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// 125000 -> "1,25,000" (Indian grouping); keeps paise when present
const inr = (v) => {
  const n = num(v);
  if (n === null) return '—';
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `${neg ? '−' : ''}₹${grouped}${dec !== '00' ? `.${dec}` : ''}`;
};

const formatPhone = (raw) => {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  const local = d.length > 10 ? d.slice(-10) : d;
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : String(raw);
};

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* Build one normalised model so the screen and the PDF always show the same numbers.
   Only real values from the API are used; nothing is invented. */
const buildModel = (invoice) => {
  const b = invoice?.payment?.breakdown || {};
  const lines = [
    num(b.visitingFee) ? { label: 'Visit and inspection', amount: num(b.visitingFee) } : null,
    num(b.serviceAndLabor) ? { label: 'Service and labour', amount: num(b.serviceAndLabor) } : null,
    num(b.taxAndCharges) ? { label: 'Taxes and charges', amount: num(b.taxAndCharges) } : null,
  ].filter(Boolean);

  const lineSum = lines.reduce((s, l) => s + l.amount, 0);
  const total = num(invoice?.payment?.finalAmount) ?? num(b.total) ?? (lines.length ? lineSum : null);

  // Keep the invoice arithmetic honest if the breakdown doesn't add up to the amount paid
  if (lines.length && total !== null && Math.abs(total - lineSum) >= 0.01) {
    lines.push({ label: total > lineSum ? 'Other charges' : 'Discount', amount: total - lineSum });
  }

  const status = invoice?.payment?.status;
  const paid = status ? /paid|complete|success/i.test(status) : true;
  const mode = invoice?.payment?.paymentMode;

  return {
    number: invoice?.invoiceNumber || '',
    date: formatDate(invoice?.date),
    service: invoice?.serviceDetails?.title || invoice?.vendor?.category || 'Home service',
    customer: {
      name: invoice?.customer?.name || '',
      phone: formatPhone(invoice?.customer?.mobileNumber),
      address: invoice?.customer?.address || '',
    },
    pro: {
      name: invoice?.vendor?.businessName || invoice?.vendor?.name || '',
      person: invoice?.vendor?.businessName && invoice?.vendor?.name ? invoice.vendor.name : '',
      category: invoice?.vendor?.category || '',
    },
    lines,
    total,
    paid,
    paidWith: mode ? `Paid by ${String(mode).toLowerCase()}` : paid ? 'Paid' : 'Payment pending',
  };
};

const invoiceHtml = (m) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${esc(m.number)}</title>
<style>
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;padding:36px;color:#161A2B;font-size:13px;line-height:1.5}
  .top{width:100%;border-bottom:3px solid #1B2A6B;padding-bottom:14px;margin-bottom:22px}
  .brand{font-size:22px;font-weight:800;color:#1B2A6B;margin:0}
  .muted{color:#5B6478}.small{font-size:11.5px}
  .right{text-align:right}
  .pill{display:inline-block;padding:3px 10px;border-radius:999px;font-weight:700;font-size:11px;background:${m.paid ? '#E7F6EE' : '#FDF0F3'};color:${m.paid ? '#0F7A4A' : '#C8264E'}}
  .parties{width:100%;margin-bottom:22px}.parties td{vertical-align:top;width:50%}
  .label{font-size:11px;font-weight:700;color:#5B6478;margin-bottom:3px}
  .name{font-size:14px;font-weight:700}
  .items{width:100%;border-collapse:collapse}
  .items th{text-align:left;font-size:11px;font-weight:700;color:#5B6478;border-bottom:1px solid #E3E7F0;padding:8px 0}
  .items td{padding:10px 0;border-bottom:1px solid #EEF1F6}
  .total td{border-top:2px solid #161A2B;border-bottom:none;padding-top:12px;font-size:16px;font-weight:800}
  .foot{margin-top:28px;padding-top:12px;border-top:1px dashed #C3C9D6;font-size:11px;color:#98A0B3;text-align:center}
</style></head><body>
  <table class="top"><tr>
    <td><h1 class="brand">${esc(BRAND)}</h1><div class="muted small">Home service invoice</div></td>
    <td class="right"><div class="pill">${m.paid ? 'Paid' : 'Payment pending'}</div>
      ${m.number ? `<div style="font-weight:800;margin-top:6px">${esc(m.number)}</div>` : ''}
      ${m.date ? `<div class="muted small">${esc(m.date)}</div>` : ''}</td>
  </tr></table>
  <table class="parties"><tr>
    <td><div class="label">Billed to</div>
      ${m.customer.name ? `<div class="name">${esc(m.customer.name)}</div>` : ''}
      ${m.customer.phone ? `<div class="muted small">${esc(m.customer.phone)}</div>` : ''}
      ${m.customer.address ? `<div class="muted small">${esc(m.customer.address)}</div>` : ''}</td>
    <td style="padding-left:20px"><div class="label">Service by</div>
      ${m.pro.name ? `<div class="name">${esc(m.pro.name)}</div>` : ''}
      ${m.pro.person ? `<div class="muted small">${esc(m.pro.person)}</div>` : ''}
      ${m.pro.category ? `<div class="muted small">${esc(m.pro.category)}</div>` : ''}</td>
  </tr></table>
  <table class="items">
    <tr><th>${esc(m.service)}</th><th class="right">Amount</th></tr>
    ${m.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="right">${esc(inr(l.amount))}</td></tr>`).join('')}
    <tr class="total"><td>Total</td><td class="right">${esc(inr(m.total))}</td></tr>
  </table>
  <div class="muted small" style="margin-top:10px">${esc(m.paidWith)}</div>
  <div class="foot">Thank you for booking with ${esc(BRAND)}.</div>
</body></html>`;

/* ---------- Pieces ---------- */
function Party({ label, title, lines, style }) {
  return (
    <View style={[styles.party, style]}>
      <Text style={styles.partyLabel}>{label}</Text>
      {!!title && (
        <Text style={styles.partyTitle} numberOfLines={1}>
          {title}
        </Text>
      )}
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} style={styles.partySub} numberOfLines={2}>
          {l}
        </Text>
      ))}
    </View>
  );
}

/* ---------- Screen ---------- */
export default function InvoiceScreen({ route, navigation }) {
  const { token } = useAuth();
  const { serviceRequestId, requestId } = route.params || {};
  const activeRequestId = serviceRequestId || requestId;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [failure, setFailure] = useState(null); // 'network' | 'not_ready' | null
  const [busy, setBusy] = useState(''); // 'share' | 'print' | ''

  useEffect(() => {
    fetchInvoiceData();
  }, [activeRequestId]);

  const fetchInvoiceData = async () => {
    if (!token || !activeRequestId) {
      setFailure('not_ready');
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailure(null);
    try {
      const res = await getServiceRequestInvoiceApi(token, activeRequestId);
      if (res?.success && res.invoice) setInvoice(res.invoice);
      else setFailure('not_ready');
    } catch (err) {
      console.warn('Error loading invoice:', err);
      setFailure('network');
    } finally {
      setLoading(false);
    }
  };

  const model = invoice ? buildModel(invoice) : null;

  const handleShare = async () => {
    if (!model || busy) return;
    setBusy('share');
    try {
      let sharedFile = false;

      if (Platform.OS !== 'web') {
        try {
          const { uri } = await Print.printToFileAsync({ html: invoiceHtml(model) });
          let shareUri = uri;

          // On Android, copy to FileSystem.cacheDirectory so FileProvider has valid read permission
          if (FileSystem && FileSystem.cacheDirectory) {
            const safeName = (model.number || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
            const targetUri = `${FileSystem.cacheDirectory}Invoice_${safeName}.pdf`;
            await FileSystem.copyAsync({ from: uri, to: targetUri });
            shareUri = targetUri;
          }

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(shareUri, {
              mimeType: 'application/pdf',
              dialogTitle: `Invoice ${model.number}`,
              UTI: 'com.adobe.pdf',
            });
            sharedFile = true;
          }
        } catch (fileErr) {
          console.warn('PDF file share error, falling back to message share:', fileErr);
        }
      }

      if (!sharedFile) {
        await Share.share({
          title: `Invoice ${model.number}`,
          message: [
            `${BRAND} invoice ${model.number}`,
            model.service,
            `Total: ${inr(model.total)}`,
            model.paidWith,
            model.date ? `Date: ${model.date}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        });
      }
    } catch (err) {
      console.warn('Share error:', err);
      Alert.alert('Couldn’t share invoice', 'You can also tap Print to save it directly as PDF.');
    } finally {
      setBusy('');
    }
  };


  const handlePrint = async () => {
    if (!model || busy) return;
    setBusy('print');
    try {
      await Print.printAsync({ html: invoiceHtml(model) });
    } catch (err) {
      // Closing the print dialog also lands here on some devices; only log it
      console.warn('Print error:', err);
    } finally {
      setBusy('');
    }
  };

  /* ---------- Header (shared by all states) ---------- */
  const header = (
    <View style={styles.header}>
      <View pointerEvents="none" style={styles.headerIconWrap}>
        <ReceiptText size={150} color="rgba(255,255,255,0.07)" strokeWidth={1.4} />
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
        Invoice
      </Text>
      <Text style={styles.subtitle}>
        {model ? [model.number, model.date].filter(Boolean).join(', ') || model.service : 'Your receipt for this job'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />
      {header}

      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.indigo} />
          </View>
        ) : !model ? (
          <View style={styles.center}>
            <View style={[styles.stateIcon, failure === 'network' && { backgroundColor: C.errorBg }]}>
              {failure === 'network' ? (
                <AlertCircle size={24} color={C.error} />
              ) : (
                <ReceiptText size={24} color={C.indigo} />
              )}
            </View>
            <Text style={styles.stateTitle}>
              {failure === 'network' ? 'Couldn’t load the invoice' : 'Invoice not ready yet'}
            </Text>
            <Text style={styles.stateBody}>
              {failure === 'network'
                ? 'Check your internet connection and try again.'
                : 'Your invoice appears here once the pro marks the job as completed.'}
            </Text>
            <TouchableOpacity
              onPress={failure === 'network' ? fetchInvoiceData : () => navigation.goBack()}
              style={styles.stateBtn}
              accessibilityRole="button"
            >
              {failure === 'network' && <RefreshCw size={14} color={C.ink} style={{ marginRight: 6 }} />}
              <Text style={styles.stateBtnText}>{failure === 'network' ? 'Try again' : 'Go back'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              {/* Amount */}
              <View style={styles.amountBlock}>
                <View style={[styles.pill, !model.paid && { backgroundColor: C.errorBg }]}>
                  {model.paid ? (
                    <Check size={12} color={C.success} strokeWidth={3} />
                  ) : (
                    <AlertCircle size={12} color={C.error} />
                  )}
                  <Text style={[styles.pillText, !model.paid && { color: C.error }]}>
                    {model.paid ? 'Paid' : 'Payment pending'}
                  </Text>
                </View>
                <Text style={styles.amount} accessibilityLabel={`Total ${inr(model.total)}`}>
                  {inr(model.total)}
                </Text>
                <Text style={styles.amountSub}>{[model.paidWith, model.date].filter(Boolean).join(' on ')}</Text>
              </View>

              {/* Parties */}
              <View style={styles.parties}>
                <Party
                  label="Billed to"
                  title={model.customer.name}
                  lines={[model.customer.phone, model.customer.address]}
                  style={{ paddingRight: 10 }}
                />
                <Party
                  label="Service by"
                  title={model.pro.name}
                  lines={[model.pro.person, model.pro.category]}
                  style={styles.partyRight}
                />
              </View>

              {/* Breakdown */}
              <View style={styles.breakdown}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {model.service}
                </Text>
                {model.lines.map((l, i) => (
                  <View key={i} style={styles.line}>
                    <Text style={styles.lineLabel}>{l.label}</Text>
                    <Text style={[styles.lineAmount, l.amount < 0 && { color: C.success }]}>{inr(l.amount)}</Text>
                  </View>
                ))}
                <View style={styles.totalLine}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{inr(model.total)}</Text>
                </View>
              </View>

              <Text style={styles.footNote}>
                {BRAND} invoice{model.number ? ` ${model.number}` : ''}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleShare}
                disabled={!!busy}
                activeOpacity={0.88}
                style={[styles.btn, styles.btnSolid, busy && busy !== 'share' && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Share or save the invoice as PDF"
              >
                {busy === 'share' ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Share2 size={15} color={C.white} style={{ marginRight: 7 }} />
                    <Text style={styles.btnSolidText}>Share PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                onPress={handlePrint}
                disabled={!!busy}
                activeOpacity={0.85}
                style={[styles.btn, styles.btnOutline, busy && busy !== 'print' && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Print the invoice"
              >
                {busy === 'print' ? (
                  <ActivityIndicator size="small" color={C.ink} />
                ) : (
                  <>
                    <Printer size={15} color={C.ink} style={{ marginRight: 7 }} />
                    <Text style={styles.btnOutlineText}>Print</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Share PDF also lets you save it to Files or Google Drive.</Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

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

  /* Invoice card */
  card: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },

  amountBlock: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.successBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { fontSize: 12, fontWeight: '800', color: C.success, marginLeft: 4 },
  amount: { fontSize: 34, fontWeight: '800', color: C.ink, letterSpacing: -1, marginTop: 8 },
  amountSub: { fontSize: 13, color: C.muted, marginTop: 2, fontWeight: '500' },

  parties: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: C.hair },
  party: { flex: 1 },
  partyRight: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: C.hair },
  partyLabel: { fontSize: 12, fontWeight: '700', color: C.faint, marginBottom: 3 },
  partyTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  partySub: { fontSize: 12.5, color: C.muted, marginTop: 1, lineHeight: 17 },

  breakdown: { padding: 14 },
  serviceTitle: { fontSize: 14.5, fontWeight: '800', color: C.ink, marginBottom: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineLabel: { flex: 1, fontSize: 13.5, color: C.muted, marginRight: 10 },
  lineAmount: { fontSize: 13.5, fontWeight: '700', color: C.ink },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: C.ink,
  },
  totalLabel: { fontSize: 15, fontWeight: '800', color: C.ink },
  totalAmount: { fontSize: 18, fontWeight: '800', color: C.ink },

  footNote: {
    fontSize: 11.5,
    color: C.faint,
    textAlign: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.hair,
    borderStyle: 'dashed',
    backgroundColor: C.field,
  },

  /* Actions */
  actions: { flexDirection: 'row', marginTop: 12 },
  btn: { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSolid: { backgroundColor: C.indigo },
  btnSolidText: { color: C.white, fontSize: 14.5, fontWeight: '800' },
  btnOutline: { backgroundColor: C.white, borderWidth: 1, borderColor: '#DCE1EC' },
  btnOutlineText: { color: C.ink, fontSize: 14.5, fontWeight: '700' },
  hint: { fontSize: 12, color: C.faint, textAlign: 'center', marginTop: 8 },

  /* States */
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: { fontSize: 17, fontWeight: '800', color: C.ink, textAlign: 'center' },
  stateBody: { fontSize: 13.5, color: C.muted, textAlign: 'center', marginTop: 4, lineHeight: 19, maxWidth: 280 },
  stateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE1EC',
    backgroundColor: C.white,
    marginTop: 16,
  },
  stateBtnText: { fontSize: 14, fontWeight: '700', color: C.ink },
});