import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Headphones,
  PhoneCall,
  MessageCircle,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Ticket,
  ChevronDown,
  ChevronUp,
  FileQuestion,
} from 'lucide-react-native';
import { useAuth } from '../../../src/context/AuthContext';

const SUPPORT = {
  tollFree: '18008892020',
  displayTollFree: '1800-889-2020',
  whatsapp: '919876543210',
  email: 'partners@localservices.in',
  hours: 'Mon - Sun: 8:00 AM – 10:00 PM IST',
};

const CATEGORIES = [
  'Payout & UPI Settlement Delay',
  'Customer Conflict & Doorstep Cancellation',
  '4-Digit OTP Issue on Active Job',
  'Lead Broadcast / Area Coverage Bug',
  'Document & KYC Re-Verification',
];

const INITIAL_TICKETS = [
  {
    id: 'TKT-84912',
    topic: 'Payout & UPI Settlement Delay',
    date: 'Yesterday, 4:20 PM',
    status: 'Resolved',
    details: 'Daily payout batch for Job #SR-1094 verified and transferred to primary UPI ID.',
  },
  {
    id: 'TKT-78210',
    topic: 'Lead Broadcast / Area Coverage Bug',
    date: '12 Oct, 11:30 AM',
    status: 'Closed',
    details: 'Operating pincode 395009 refreshed in local cluster gateway.',
  },
];

export default function CustomerCareScreen({ navigation }) {
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('Normal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState('');

  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const openUrl = async (url, fallback) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Notice', fallback);
      }
    } catch {
      Alert.alert('Notice', fallback);
    }
  };

  const handleCall = () => {
    openUrl(`tel:${SUPPORT.tollFree}`, 'Phone calling is not supported on this device.');
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello Partner Desk! I am partner ${user?.businessName || user?.name || ''} (Phone: ${
        user?.mobileNumber || user?.phone || ''
      }). I need assistance with: `
    );
    openUrl(`whatsapp://send?phone=${SUPPORT.whatsapp}&text=${text}`, 'WhatsApp is not installed on your phone.');
  };

  const handleEmail = () => {
    const sub = encodeURIComponent(`[Vendor Support] ${user?.businessName || user?.name || ''}`);
    const body = encodeURIComponent(
      `\n\n---\nPartner: ${user?.businessName || user?.name || ''}\nMobile: ${
        user?.mobileNumber || user?.phone || ''
      }\nCategory: ${user?.category || ''}`
    );
    openUrl(`mailto:${SUPPORT.email}?subject=${sub}&body=${body}`, 'No email application found.');
  };

  const handleSubmitTicket = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please enter a ticket subject and description of your issue.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const newId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTicketObj = {
        id: newId,
        topic: selectedCategory,
        date: 'Just now',
        status: 'Under Investigation',
        details: message.trim(),
      };

      setTickets([newTicketObj, ...tickets]);
      setGeneratedTicketId(newId);
      setSubmitting(false);
      setSuccessModal(true);

      setSubject('');
      setMessage('');
    }, 600);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className="flex-1 bg-[#f6f7f8]">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-slate-200/70 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={18} color="#0f1729" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-bold text-[#0f1729]">Customer Care & Helpdesk</Text>
            <Text className="text-[11px] text-[#6b7280]">Direct hotline, WhatsApp & tickets</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 py-3"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Contact Action Row */}
          <View className="flex-row gap-2.5 mb-3">
            {/* Toll Free */}
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 bg-white p-3 rounded-xl border border-slate-200/70 items-center shadow-xs active:opacity-90"
            >
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-1.5">
                <PhoneCall size={18} color="#2563eb" />
              </View>
              <Text className="text-xs font-bold text-[#0f1729]">Toll-Free</Text>
              <Text className="text-[10px] text-[#6b7280] mt-0.5">{SUPPORT.displayTollFree}</Text>
            </TouchableOpacity>

            {/* WhatsApp */}
            <TouchableOpacity
              onPress={handleWhatsApp}
              className="flex-1 bg-white p-3 rounded-xl border border-slate-200/70 items-center shadow-xs active:opacity-90"
            >
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-1.5">
                <MessageCircle size={18} color="#059669" />
              </View>
              <Text className="text-xs font-bold text-[#0f1729]">WhatsApp</Text>
              <Text className="text-[10px] text-emerald-700 font-medium mt-0.5">Instant Reply</Text>
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              onPress={handleEmail}
              className="flex-1 bg-white p-3 rounded-xl border border-slate-200/70 items-center shadow-xs active:opacity-90"
            >
              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-1.5">
                <Mail size={18} color="#0f1729" />
              </View>
              <Text className="text-xs font-bold text-[#0f1729]">Email Us</Text>
              <Text className="text-[10px] text-[#6b7280] mt-0.5">&lt; 4 Hours</Text>
            </TouchableOpacity>
          </View>

          {/* Operating SLA Banner */}
          <View className="bg-slate-100 border border-slate-200 p-3 rounded-xl mb-3 flex-row items-center">
            <Clock size={16} color="#0f1729" />
            <View className="ml-2 flex-1">
              <Text className="text-xs font-bold text-[#0f1729]">{SUPPORT.hours}</Text>
              <Text className="text-[10px] text-[#6b7280]">
                Average response time during working hours is less than 15 minutes.
              </Text>
            </View>
          </View>

          {/* In-App Ticket Form */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-3 shadow-xs">
            <View className="flex-row items-center mb-2.5">
              <Ticket size={15} color="#0f1729" />
              <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                Raise an In-App Support Ticket
              </Text>
            </View>

            {/* Topic Selector */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1.5">Issue Topic *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg border mr-1.5 ${
                        active
                          ? 'bg-[#0f1729] border-[#0f1729]'
                          : 'bg-[#f6f7f8] border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          active ? 'text-white' : 'text-[#0f1729]'
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Priority Selection */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1.5">Urgency Level</Text>
              <View className="flex-row gap-2">
                {['Normal', 'Urgent (Active Job)'].map((p) => {
                  const active = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg border items-center justify-center ${
                        active
                          ? p.startsWith('Urgent')
                            ? 'bg-red-500 border-red-500'
                            : 'bg-[#0f1729] border-[#0f1729]'
                          : 'bg-[#f6f7f8] border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          active ? 'text-white' : 'text-[#0f1729]'
                        }`}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Short Title */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Subject / Summary *</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Payment deducted but not credited to UPI"
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f1729]"
              />
            </View>

            {/* Detailed Description */}
            <View className="mb-3">
              <Text className="text-xs font-medium text-[#6b7280] mb-1">Detailed Explanation *</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Include Job ID, customer name, date/time, and screenshots if applicable..."
                placeholderTextColor="#9ca3af"
                className="bg-[#f6f7f8] border border-slate-200 rounded-xl p-3 text-xs text-[#0f1729] min-h-[80px]"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitTicket}
              disabled={submitting}
              className="w-full bg-[#0f1729] py-2.5 rounded-xl items-center justify-center shadow-xs active:opacity-90 flex-row"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white ml-2">Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Recent Tickets Accordion */}
          <View className="bg-white rounded-xl border border-slate-200/70 p-3.5 mb-4 shadow-xs">
            <View className="flex-row items-center mb-2.5">
              <FileQuestion size={15} color="#0f1729" />
              <Text className="text-sm font-semibold text-[#0f1729] ml-1.5">
                Recent Support Tickets ({tickets.length})
              </Text>
            </View>

            <View className="space-y-2 gap-2">
              {tickets.map((t) => {
                const isExpanded = expandedTicketId === t.id;
                const isResolved = t.status === 'Resolved' || t.status === 'Closed';
                return (
                  <View
                    key={t.id}
                    className="border border-slate-200 rounded-xl bg-[#f6f7f8] overflow-hidden"
                  >
                    <TouchableOpacity
                      onPress={() => setExpandedTicketId(isExpanded ? null : t.id)}
                      className="p-3 flex-row items-center justify-between"
                    >
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center">
                          <Text className="text-xs font-bold text-[#0f1729]">{t.id}</Text>
                          <View
                            className={`ml-2 px-1.5 py-0.5 rounded ${
                              isResolved ? 'bg-emerald-50' : 'bg-amber-50'
                            }`}
                          >
                            <Text
                              className={`text-[9px] font-bold ${
                                isResolved ? 'text-emerald-700' : 'text-amber-800'
                              }`}
                            >
                              {t.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-[11px] font-medium text-slate-700 mt-0.5" numberOfLines={1}>
                          {t.topic}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[10px] text-slate-400 mb-1">{t.date}</Text>
                        {isExpanded ? (
                          <ChevronUp size={14} color="#6b7280" />
                        ) : (
                          <ChevronDown size={14} color="#6b7280" />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="px-3 pb-3 pt-1 border-t border-slate-200 bg-white">
                        <Text className="text-[11px] text-[#6b7280] leading-relaxed">
                          {t.details}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Ticket Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-2xl w-full max-w-sm p-4 border border-slate-200 items-center">
            <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
              <CheckCircle2 size={24} color="#059669" />
            </View>
            <Text className="text-sm font-bold text-[#0f1729]">Ticket Created Successfully</Text>
            <Text className="text-xs font-extrabold text-blue-600 my-1">
              Ticket ID: {generatedTicketId}
            </Text>
            <Text className="text-xs text-[#6b7280] text-center mb-4 leading-relaxed">
              Our partner operations desk has received your request. An executive will contact you shortly.
            </Text>
            <TouchableOpacity
              onPress={() => setSuccessModal(false)}
              className="w-full bg-[#0f1729] py-2.5 rounded-xl items-center"
            >
              <Text className="text-xs font-bold text-white">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
