import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react-native';
import io from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import {
  SOCKET_URL,
  getChatMessagesApi,
  sendChatMessageApi,
  markChatReadApi,
} from '../../services/api';

/* ---------- Design tokens (shared across screens) ---------- */
const C = {
  indigo: '#1B2A6B',
  indigoSoft: '#EAEEFB',
  amber: '#FFB800',
  ink: '#161A2B',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  page: '#EEF1F8',
  white: '#FFFFFF',
  error: '#C8264E',
  success: '#0F7A4A',
  read: '#7FE0B0',
};

// Written from the customer's side of the job
const QUICK_REPLIES = [
  'When will you arrive?',
  'I’m at home now',
  'Message me when you’re outside',
  'Please bring the parts you need',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- Helpers ---------- */
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'P';

const msgDate = (m) => {
  const d = new Date(m?.createdAt || m?.timestamp);
  return isNaN(d.getTime()) ? null : d;
};

// Manual formatting: toLocaleTimeString options are ignored on some Android builds
const formatTime = (d) => {
  if (!d) return '';
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};

const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayLabel = (d) => {
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
};

const textOf = (m) => m?.text || m?.message || '';

/* ---------- Screen ---------- */
export default function UserChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const {
    serviceRequestId,
    requestId,
    customerId,
    vendorId,
    vendorName,
    partnerName,
    jobTitle,
  } = route?.params || {};

  const activeServiceRequestId = serviceRequestId || requestId;
  const proName = vendorName || partnerName || 'Service partner';
  const orderLabel = activeServiceRequestId
    ? `Order #${String(activeServiceRequestId).slice(-4).toUpperCase()}`
    : '';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isMine = useCallback(
    (m) =>
      m?.senderModel === 'User' ||
      (!!user?._id && String(m?.senderId || m?.sender) === String(user._id)) ||
      (!!customerId && String(m?.senderId || m?.sender) === String(customerId)),
    [user?._id, customerId]
  );

  /* 1. History + mark read */
  const loadChatHistory = useCallback(async () => {
    if (!token || !activeServiceRequestId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getChatMessagesApi(token, activeServiceRequestId);
      if (res?.success && Array.isArray(res.messages)) {
        setMessages([...res.messages].sort((a, b) => (msgDate(a) || 0) - (msgDate(b) || 0)));
      }
      await markChatReadApi(token, activeServiceRequestId);
    } catch (err) {
      console.warn('Failed loading chat history:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeServiceRequestId]);

  /* 2. Socket */
  useEffect(() => {
    loadChatHistory();
    if (!activeServiceRequestId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('joinChatRoom', activeServiceRequestId));

    socket.on('receiveMessage', (newMsg) => {
      if (!newMsg) return;
      const msgReqId = String(newMsg.serviceRequestId || newMsg.serviceRequest || '');
      if (msgReqId && msgReqId !== String(activeServiceRequestId)) return;

      setMessages((prev) => {
        if (prev.some((m) => (m._id && m._id === newMsg._id) || (m.id && m.id === newMsg.id))) return prev;
        // Our own message echoed back: swap it in for the pending copy instead of adding a duplicate
        if (isMine(newMsg)) {
          const i = prev.findIndex((m) => m._local && m._pending && textOf(m) === textOf(newMsg));
          if (i !== -1) {
            const next = [...prev];
            next[i] = newMsg;
            return next;
          }
        }
        return [...prev, newMsg];
      });

      if (token) markChatReadApi(token, activeServiceRequestId);
    });

    socket.on('typing', (data) => {
      if (data?.senderModel === 'Vendor') {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('leaveChatRoom', activeServiceRequestId);
      socket.off('receiveMessage');
      socket.off('typing');
      socket.disconnect();
    };
  }, [activeServiceRequestId, loadChatHistory, token, isMine]);

  /* 3. Send */
  const patchMessage = (localId, patch) =>
    setMessages((prev) => prev.map((m) => (m._id === localId ? (typeof patch === 'function' ? patch(m) : { ...m, ...patch }) : m)));

  const deliver = async (localId, content) => {
    const payload = {
      serviceRequestId: activeServiceRequestId,
      senderId: user?._id || customerId,
      senderModel: 'User',
      senderName: user?.name || 'Customer',
      vendorId: vendorId || undefined,
      message: content,
      text: content,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit('sendMessage', payload, (ack) => {
        if (ack?.success && ack?.message) patchMessage(localId, () => ack.message);
        else if (ack && ack.success === false) patchMessage(localId, { _pending: false, _failed: true });
      });
      return;
    }

    // Socket down: fall back to REST
    try {
      const res = token ? await sendChatMessageApi(token, activeServiceRequestId, content) : null;
      if (res?.success && res?.message) patchMessage(localId, () => res.message);
      else patchMessage(localId, { _pending: false, _failed: true });
    } catch (err) {
      console.warn('REST chat fallback failed:', err);
      patchMessage(localId, { _pending: false, _failed: true });
    }
  };

  const handleSendMessage = (textToSend) => {
    const content = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!content || !activeServiceRequestId) return;
    if (typeof textToSend !== 'string') setInputText('');

    const localId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        _id: localId,
        _local: true,
        _pending: true,
        serviceRequestId: activeServiceRequestId,
        senderId: user?._id || customerId,
        senderModel: 'User',
        text: content,
        message: content,
        read: false,
        createdAt: now,
      },
    ]);
    deliver(localId, content);
  };

  const retry = (m) => {
    patchMessage(m._id, { _pending: true, _failed: false });
    deliver(m._id, textOf(m));
  };

  /* ---------- Render ---------- */
  const renderItem = ({ item, index }) => {
    const mine = isMine(item);
    const d = msgDate(item);
    const prev = messages[index - 1];
    const prevDate = msgDate(prev);
    const newDay = !prev || !sameDay(d, prevDate);
    const grouped = !newDay && prev && isMine(prev) === mine;

    return (
      <View>
        {newDay && !!d && (
          <View style={styles.dayWrap}>
            <Text style={styles.dayText}>{dayLabel(d)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, mine ? styles.rowRight : styles.rowLeft, { marginTop: grouped ? 2 : 10 }]}>
          <TouchableOpacity
            activeOpacity={item._failed ? 0.7 : 1}
            disabled={!item._failed}
            onPress={() => retry(item)}
            style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
              !grouped && (mine ? styles.tailMine : styles.tailTheirs),
              item._failed && styles.bubbleFailed,
            ]}
            accessibilityLabel={`${mine ? 'You' : proName}: ${textOf(item)}${item._failed ? '. Not sent, tap to retry' : ''}`}
          >
            <Text style={[styles.msgText, mine && styles.msgTextMine]}>{textOf(item)}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timeText, mine && styles.timeTextMine]}>{formatTime(d)}</Text>
              {mine &&
                (item._failed ? (
                  <AlertCircle size={12} color="#FFB3C1" style={styles.tick} />
                ) : item._pending ? (
                  <Clock size={11} color="rgba(255,255,255,0.6)" style={styles.tick} />
                ) : item.read ? (
                  <CheckCheck size={13} color={C.read} style={styles.tick} />
                ) : (
                  <Check size={13} color="rgba(255,255,255,0.65)" style={styles.tick} />
                ))}
            </View>
          </TouchableOpacity>
        </View>
        {item._failed && (
          <Text style={[styles.failedText, mine ? { textAlign: 'right' } : null]}>Not sent. Tap to retry.</Text>
        )}
      </View>
    );
  };

  const canSend = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={C.white} />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials(proName)}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {proName}
            </Text>
            <ShieldCheck size={14} color="#7FE0B0" style={{ marginLeft: 5 }} />
          </View>
          <Text style={[styles.headerSub, isTyping && styles.headerTyping]} numberOfLines={1}>
            {isTyping ? 'typing…' : jobTitle || orderLabel || 'Verified partner'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.sheet}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.indigo} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, index) => String(item._id || item.id || `msg_${index}`)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <MessageSquare size={22} color={C.indigo} />
                </View>
                <Text style={styles.emptyTitle}>Message {proName}</Text>
                <Text style={styles.emptyBody}>
                  Ask about arrival time, or share landmarks and parking notes.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Quick replies */}
      <View style={styles.quickWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_REPLIES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => handleSendMessage(t)}
              activeOpacity={0.75}
              style={styles.quickChip}
              accessibilityRole="button"
              accessibilityLabel={`Send: ${t}`}
            >
              <Text style={styles.quickText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          placeholderTextColor={C.faint}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={600}
          accessibilityLabel="Message"
        />
        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={!canSend}
          activeOpacity={0.85}
          style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Send size={17} color={C.white} style={{ marginLeft: -2 }} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.indigo },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.indigo,
    paddingHorizontal: 14,
    paddingBottom: 30, // room for the sheet overlap
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: C.white, fontSize: 14, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flexShrink: 1, color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.72)', fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  headerTyping: { color: C.amber, fontWeight: '700' },

  /* Message area */
  sheet: {
    flex: 1,
    backgroundColor: C.page,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -20,
    overflow: 'hidden',
  },
  listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, flexGrow: 1 },

  dayWrap: { alignItems: 'center', marginTop: 14, marginBottom: 2 },
  dayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.muted,
    backgroundColor: C.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  msgRow: { flexDirection: 'row' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMine: { backgroundColor: C.indigo },
  bubbleTheirs: { backgroundColor: C.white, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tailMine: { borderBottomRightRadius: 6 },
  tailTheirs: { borderBottomLeftRadius: 6 },
  bubbleFailed: { opacity: 0.75 },
  msgText: { fontSize: 15, lineHeight: 20, color: C.ink },
  msgTextMine: { color: C.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  timeText: { fontSize: 10.5, color: C.faint, fontWeight: '500' },
  timeTextMine: { color: 'rgba(255,255,255,0.65)' },
  tick: { marginLeft: 4 },
  failedText: { fontSize: 11.5, color: C.error, fontWeight: '600', marginTop: 3, marginHorizontal: 4 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center' },
  emptyBody: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4, lineHeight: 18 },

  /* Quick replies */
  quickWrap: { backgroundColor: C.page, paddingBottom: 8 },
  quickRow: { paddingHorizontal: 12 },
  quickChip: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#DCE1EC',
    marginRight: 8,
  },
  quickText: { fontSize: 13, fontWeight: '600', color: C.indigo },

  /* Composer */
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: C.white,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: C.field,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 9,
    paddingBottom: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    color: C.ink,
    marginRight: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: '#C9D0E0' },
});