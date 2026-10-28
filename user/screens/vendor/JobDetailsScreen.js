import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageSquare,
  MapPin,
  Navigation,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';

export default function JobDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { job } = route?.params || {};

  if (!job) {
    return (
      <View style={styles.errorScreen}>
        <AlertCircle size={40} color="#0f1729" />
        <Text style={styles.errorTitle}>Job Not Found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backHomeBtn}>
          <Text style={styles.backHomeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerName = job.customer?.name || 'Customer';
  const customerId = job.customer?._id || job.customer?.id;
  const address = [job.address?.street, job.address?.city].filter(Boolean).join(', ');

  const openMaps = () => {
    const coords = job.address?.location?.coordinates;
    const street = [job.address?.street, job.address?.city].filter(Boolean).join(', ');
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

  const handleOpenChat = () => {
    navigation.navigate('VendorChat', {
      serviceRequestId: job._id,
      customerId,
      customerName,
      jobTitle: job.title || `${job.category} service`,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <ArrowLeft size={20} color="#0f1729" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerRightBadge}>
          <Text style={styles.headerBadgeText}>
            #{String(job._id || '').slice(-4).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Service & Price Banner */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobCategory}>{job.category || 'General Service'}</Text>
              <Text style={styles.jobTitle}>{job.title || `${job.category} service`}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>₹{job.finalAmount || 250}</Text>
            </View>
          </View>

          {!!job.description && (
            <Text style={styles.jobDescription}>{job.description}</Text>
          )}

          <View style={styles.scheduleRow}>
            <View style={styles.scheduleItem}>
              <Calendar size={14} color="#6b7280" />
              <Text style={styles.scheduleText}>{job.schedule?.date || 'Today'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Clock size={14} color="#6b7280" />
              <Text style={styles.scheduleText}>{job.schedule?.timeSlot || 'Scheduled'}</Text>
            </View>
          </View>
        </View>

        {/* Customer Identity & Chat Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Customer Details</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {String(customerName)[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              <Text style={styles.customerPrivacyNote}>
                Communication strictly via in-app secure chat
              </Text>
            </View>
          </View>

          {/* Dedicated Chat Action Button */}
          <TouchableOpacity
            onPress={handleOpenChat}
            activeOpacity={0.85}
            style={styles.chatActionBtn}
          >
            <MessageSquare size={16} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.chatActionBtnText}>Chat with Customer</Text>
          </TouchableOpacity>
        </View>

        {/* Service Location Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Service Location</Text>
          <View style={styles.locationRow}>
            <View style={styles.locationIconBox}>
              <MapPin size={18} color="#0f1729" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>{job.address?.label || 'Doorstep Address'}</Text>
              <Text style={styles.addressText}>{address || 'Address provided upon confirmation'}</Text>
              {!!job.address?.pincode && (
                <Text style={styles.pincodeText}>Pincode: {job.address.pincode}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={openMaps}
            activeOpacity={0.85}
            style={styles.mapsBtn}
          >
            <Navigation size={15} color="#0f1729" style={{ marginRight: 6 }} />
            <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f1729',
  },
  headerRightBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f1729',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f1729',
  },
  priceBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  jobDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f1729',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f1729',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 17,
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f1729',
  },
  customerPrivacyNote: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1729',
    borderRadius: 12,
    paddingVertical: 12,
  },
  chatActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f6f7f8',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1729',
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    marginTop: 2,
  },
  pincodeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f1729',
    marginTop: 2,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f7f8',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 10,
  },
  mapsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f1729',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: '#f6f7f8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f1729',
  },
  backHomeBtn: {
    backgroundColor: '#0f1729',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backHomeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
