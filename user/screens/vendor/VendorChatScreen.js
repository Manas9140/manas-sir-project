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
import { ArrowLeft, Send, MessageSquare, CheckCheck } from 'lucide-react-native';
import io from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import { SOCKET_URL, getChatMessagesApi, sendChatMessageApi } from '../../services/api';

const VENDOR_TEMPLATES = [
  'I am on my way 🛵',
  'Reached your location 📍',
  'Please share landmark 🏢',
  'Need 10 more mins ⏱️',
];

const CUSTOMER_TEMPLATES = [
  'What is your ETA? ⏱️',
  'I am at the location 📍',
  'Gate code / Landmark shared 🏢',
  'Please let me know once reached 🚪',
];

export default function VendorChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const isVendorUser = user?.role === 'vendor' || !!user?.businessName;

  const {
    serviceRequestId,
    customerId,
    customerName,
    vendorName,
    partnerName,
    jobTitle = 'Service Job',
  } = route?.params || {};

  const chatPartnerName = isVendorUser
    ? (customerName || partnerName || 'Customer')
    : (vendorName || partnerName || customerName || 'Service Partner');

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  const quickTemplates = isVendorUser ? VENDOR_TEMPLATES : CUSTOMER_TEMPLATES;

  // Short ID display
  const shortJobId = serviceRequestId
    ? `#SR-${String(serviceRequestId).slice(-4).toUpperCase()}`
    : '#SR-JOB';

  // 1. Fetch historical transcript
  const loadChatHistory = useCallback(async () => {
    if (!token || !serviceRequestId) return;
    try {
      const res = await getChatMessagesApi(token, serviceRequestId);
      if (res.success && Array.isArray(res.messages)) {
        // Sort ascending by time
        const sorted = [...res.messages].sort(
          (a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp)
        );
        setMessages(sorted);
      }
    } catch (err) {
      console.warn('Failed loading chat transcript:', err);
    } finally {
      setLoading(false);
    }
  }, [token, serviceRequestId]);

  // 2. Setup Socket.IO connection & listeners
  useEffect(() => {
    loadChatHistory();

    if (!serviceRequestId) return;

    // Connect socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[VendorChat] Connected to socket ${socket.id}, joining room chat_${serviceRequestId}`);
      socket.emit('joinChatRoom', serviceRequestId);
    });

    socket.on('receiveMessage', (newMsg) => {
      if (!newMsg) return;
      // Filter for this room
      const msgReqId = String(newMsg.serviceRequestId || newMsg.serviceRequest || '');
      if (msgReqId && msgReqId !== String(serviceRequestId)) return;

      setMessages((prev) => {
        // Avoid duplicate messages
        const exists = prev.some(
          (m) =>
            (m._id && m._id === newMsg._id) ||
            (m.id && m.id === newMsg.id) ||
            (m.text === newMsg.text && Math.abs(new Date(m.createdAt) - new Date(newMsg.createdAt)) < 1500)
        );
        if (exists) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      if (socket) {
        socket.emit('leaveChatRoom', serviceRequestId);
        socket.off('receiveMessage');
        socket.disconnect();
      }
    };
  }, [serviceRequestId, loadChatHistory]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  // 3. Send message handler
  const handleSendMessage = async (textToSend) => {
    const trimmed = (textToSend || inputText).trim();
    if (!trimmed || sending) return;

    setInputText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const myId = user?._id || user?.id;
    const senderModel = isVendorUser ? 'Vendor' : 'User';
    const myName = user?.name || user?.businessName || (isVendorUser ? 'Service Partner' : 'Customer');

    const optimisticMsg = {
      _id: tempId,
      id: tempId,
      serviceRequestId,
      senderId: myId,
      senderModel,
      senderName: myName,
      text: trimmed,
      message: trimmed,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically show message
    setMessages((prev) => [...prev, optimisticMsg]);

    // Send via Socket.IO
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        'sendMessage',
        {
          serviceRequestId,
          senderId: myId,
          senderModel,
          senderName: myName,
          text: trimmed,
          timestamp: new Date().toISOString(),
        },
        (response) => {
          setSending(false);
          if (response?.success && response.message) {
            setMessages((prev) =>
              prev.map((m) => (m._id === tempId ? { ...response.message, _id: response.message._id } : m))
            );
          }
        }
      );
    } else {
      // Fallback via HTTP REST API
      try {
        const res = await sendChatMessageApi(token, serviceRequestId, trimmed);
        if (res.success && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? { ...res.message, _id: res.message._id } : m))
          );
        }
      } catch (err) {
        console.warn('Fallback HTTP send error:', err);
      } finally {
        setSending(false);
      }
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Render message bubble
  const renderItem = ({ item }) => {
    const currentUserId = String(user?._id || user?.id || '');
    const msgSenderId = String(item.senderId || item.sender || '');
    const isMine =
      (msgSenderId && msgSenderId === currentUserId) ||
      (!msgSenderId && (isVendorUser ? item.senderModel === 'Vendor' : item.senderModel === 'User'));

    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        <View
          style={[
            styles.bubbleContainer,
            isMine ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text style={[styles.bubbleText, isMine ? styles.myText : styles.otherText]}>
            {item.text || item.message}
          </Text>
        </View>

        <View style={[styles.timeRow, isMine ? styles.timeRowRight : styles.timeRowLeft]}>
          <Text style={styles.timeText}>{formatTime(item.createdAt || item.timestamp)}</Text>
          {isMine && <CheckCheck size={12} color="#94A3B8" style={{ marginLeft: 3 }} />}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Chat Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color="#0f1729" />
        </TouchableOpacity>

        {/* Partner Avatar & Name */}
        <View style={styles.customerInfoBox}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {String(chatPartnerName || (isVendorUser ? 'C' : 'P'))[0].toUpperCase()}
            </Text>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.customerName} numberOfLines={1}>
              {chatPartnerName}
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {isVendorUser ? 'Customer • Verified Booking' : 'Verified Partner • In-App Chat'}
              </Text>
            </View>
          </View>
        </View>

        {/* Job Badge */}
        <View style={styles.jobBadge}>
          <Text style={styles.jobBadgeText}>{shortJobId}</Text>
        </View>
      </View>

      {/* Messages Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0f1729" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <MessageSquare size={26} color="#0f1729" />
              </View>
              <Text style={styles.emptyTitle}>In-App Coordination Chat</Text>
              <Text style={styles.emptySub}>
                Coordinate arrival, job details, or inquiries with {chatPartnerName} directly inside the app.
              </Text>
            </View>
          }
        />
      )}

      {/* Quick Template Chips */}
      <View style={styles.templatesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templatesScroll}
        >
          {quickTemplates.map((tmpl, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSendMessage(tmpl)}
              activeOpacity={0.7}
              style={styles.templateChip}
            >
              <Text style={styles.templateChipText}>{tmpl}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Message Input Bar */}
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 12 },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder={isVendorUser ? 'Type message to customer...' : 'Type message to service partner...'}
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || sending}
          style={[
            styles.sendBtn,
            (!inputText.trim() || sending) && styles.sendBtnDisabled,
          ]}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Send size={16} color="#ffffff" style={{ marginLeft: 1 }} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  customerInfoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0f1729',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  avatarInitial: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nameBlock: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1729',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  statusText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  jobBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  jobBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f1729',
  },

  /* Feed */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f1729',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Bubbles */
  bubbleRow: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubbleContainer: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 3,
  },
  myBubble: {
    backgroundColor: '#0f1729',
    borderTopRightRadius: 3,
  },
  customerBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 3,
  },
  vendorBubble: {
    backgroundColor: '#0f1729',
    borderTopRightRadius: 3,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  otherText: {
    color: '#0f1729',
    fontWeight: '500',
  },
  myText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  customerText: {
    color: '#0f1729',
    fontWeight: '500',
  },
  vendorText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  timeRowRight: {
    justifyContent: 'flex-end',
  },
  timeRowLeft: {
    justifyContent: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Quick Templates */
  templatesWrapper: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
  },
  templatesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  templateChip: {
    backgroundColor: '#f6f7f8',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f1729',
  },

  /* Input Bar */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f6f7f8',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    color: '#0f1729',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f1729',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
