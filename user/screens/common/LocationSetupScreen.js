import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  MapPin,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Home,
  Briefcase,
  Building,
  X,
  Crosshair,
  AlertCircle,
  LocateFixed,
} from 'lucide-react-native';
import { updateLocationApi } from '../../services/api';
import { useAuth } from '../../src/context/AuthContext';

const POPULAR_CITIES = [
  { id: '1', name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { id: '2', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { id: '3', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { id: '4', name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { id: '5', name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { id: '6', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { id: '7', name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { id: '8', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
];

export default function LocationSetupScreen({ navigation, route, userToken: propToken, onCompleteSetup }) {
  const { user, token: authToken, updateUser } = useAuth();
  const token = propToken || authToken;

  const initAddr = route?.params?.currentAddress || user?.addressDetails || user?.address;

  let initialLat = 21.1702;
  let initialLng = 72.8311;

  if (initAddr?.coordinate?.latitude && initAddr?.coordinate?.longitude) {
    initialLat = initAddr.coordinate.latitude;
    initialLng = initAddr.coordinate.longitude;
  } else if (initAddr?.location?.coordinates && initAddr.location.coordinates.length === 2) {
    initialLng = initAddr.location.coordinates[0];
    initialLat = initAddr.location.coordinates[1];
  } else if (user?.location?.coordinates && user.location.coordinates.length === 2 && (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0)) {
    initialLng = user.location.coordinates[0];
    initialLat = user.location.coordinates[1];
  }

  const [coords, setCoords] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });

  const mapRef = useRef(null);
  const [streetAddress, setStreetAddress] = useState(initAddr?.street || initAddr?.streetAddress || initAddr?.houseNo || '');
  const [aptSuite, setAptSuite] = useState(initAddr?.houseNo || initAddr?.aptSuite || '');
  const [neighborhood, setNeighborhood] = useState(initAddr?.area || initAddr?.neighborhood || '');
  const [landmark, setLandmark] = useState(initAddr?.landmark || '');
  const [cityState, setCityState] = useState(initAddr?.city || initAddr?.cityState || 'Surat');
  const [zipCode, setZipCode] = useState(initAddr?.pincode || initAddr?.zipCode || '');
  const [country, setCountry] = useState(initAddr?.state || 'Gujarat');
  const [addressTag, setAddressTag] = useState(initAddr?.label || initAddr?.addressTag || 'Home');

  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // If user has no pre-existing street address, request current GPS
    if (!initAddr?.street && !initAddr?.houseNo) {
      requestLiveLocation();
    }
  }, []);

  const parseGeocodeResult = (place) => {
    if (!place) return;
    const houseNo = place.streetNumber || place.name || '';
    const streetName = place.street || place.district || '';
    const fullStreet = `${houseNo} ${streetName}`.trim() || place.name || '';
    const subArea = place.district || place.subregion || place.neighborhood || '';
    const city = place.city || place.subregion || place.district || '';
    const state = place.region || '';
    const fullCityState = `${city}${city && state ? ', ' : ''}${state}`.trim();

    if (fullStreet && !streetAddress) setStreetAddress(fullStreet);
    if (subArea && !neighborhood) setNeighborhood(subArea);
    if (fullCityState) setCityState(fullCityState);
    if (place.postalCode && !zipCode) setZipCode(place.postalCode);
    if (place.region) setCountry(place.region);
  };

  const requestLiveLocation = async () => {
    try {
      setLoadingLocation(true);
      setErrorMessage('');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMessage('Location permission denied. You can select your address manually.');
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const newCoords = { latitude, longitude };
      setCoords(newCoords);

      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );

      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode && reverseGeocode.length > 0) {
        parseGeocodeResult(reverseGeocode[0]);
      }
    } catch (error) {
      console.warn('Error fetching live location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const onMapPress = async (newCoordinate) => {
    setCoords(newCoordinate);
    setErrorMessage('');
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync(newCoordinate);
      if (reverseGeocode && reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const houseNo = place.streetNumber || place.name || '';
        const streetName = place.street || place.district || '';
        const fullStreet = `${houseNo} ${streetName}`.trim() || place.name || '';
        const subArea = place.district || place.subregion || place.neighborhood || '';
        const city = place.city || place.subregion || place.district || '';
        const state = place.region || '';
        const fullCityState = `${city}${city && state ? ', ' : ''}${state}`.trim();

        if (fullStreet) setStreetAddress(fullStreet);
        if (subArea) setNeighborhood(subArea);
        if (fullCityState) setCityState(fullCityState);
        if (place.postalCode) setZipCode(place.postalCode);
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
  };

  const filteredCities = POPULAR_CITIES.filter((city) =>
    `${city.name} ${city.state}`.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleSaveLocation = async () => {
    setErrorMessage('');

    if (!streetAddress.trim()) {
      setErrorMessage('Please enter your house / street address.');
      return;
    }

    if (!cityState.trim()) {
      setErrorMessage('Please enter your city and state.');
      return;
    }

    const cleanZip = zipCode.trim();
    if (!cleanZip || cleanZip.length !== 6 || !/^\d{6}$/.test(cleanZip)) {
      setErrorMessage('Please enter a valid 6-digit pincode.');
      return;
    }

    setSavingLocation(true);

    const formatted = `${streetAddress}${aptSuite && aptSuite !== streetAddress ? ', ' + aptSuite : ''}${neighborhood ? ', ' + neighborhood : ''}${cityState ? ', ' + cityState : ''} - ${cleanZip}`;

    const addressDetails = {
      houseNo: aptSuite || streetAddress,
      street: streetAddress,
      area: neighborhood,
      landmark,
      city: cityState,
      state: country || 'Gujarat',
      pincode: cleanZip,
      formattedAddress: formatted,
      label: addressTag,
      coordinate: coords,
      location: {
        type: 'Point',
        coordinates: [coords.longitude, coords.latitude],
      },
    };

    try {
      if (token) {
        const res = await updateLocationApi(token, coords.latitude, coords.longitude, addressDetails);
        if (res.success && res.user) {
          await updateUser(res.user);
        } else {
          await updateUser({
            addressDetails,
            address: addressDetails,
            location: addressDetails.location,
          });
        }
      } else {
        await updateUser({
          addressDetails,
          address: addressDetails,
          location: addressDetails.location,
        });
      }
    } catch (err) {
      console.warn('Failed saving location to server:', err);
    } finally {
      setSavingLocation(false);
    }

    // Call callbacks
    if (onCompleteSetup) {
      onCompleteSetup({
        ...addressDetails,
        streetAddress,
        aptSuite,
        cityState,
        zipCode: cleanZip,
        addressTag,
        coordinate: coords,
      });
    }

    if (route?.params?.onSelectAddress) {
      route.params.onSelectAddress(addressDetails);
    }

    // Navigate back to the previous screen (CreateRequestScreen, HomeScreen, etc.)
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate('MainTabs');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        {navigation?.canGoBack() ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color="#0f1729" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>Delivery Location</Text>
        <TouchableOpacity
          onPress={requestLiveLocation}
          disabled={loadingLocation}
          style={styles.gpsButtonTop}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#0f1729" />
          ) : (
            <LocateFixed size={18} color="#0f1729" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#f6f7f8' }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map View Container */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              onPress={(e) => onMapPress(e.nativeEvent.coordinate)}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
            >
              <Marker
                coordinate={coords}
                draggable
                onDragEnd={(e) => onMapPress(e.nativeEvent.coordinate)}
                title="Service Location"
                description="Drag pin to fine-tune"
              >
                <View style={styles.pinWrapper}>
                  <View style={styles.pinBubble}>
                    <MapPin size={18} color="#ffffff" />
                  </View>
                  <View style={styles.pinArrow} />
                </View>
              </Marker>
            </MapView>

            {/* Floating Live GPS Recenter Button */}
            <TouchableOpacity
              onPress={requestLiveLocation}
              disabled={loadingLocation}
              style={styles.floatingGpsBtn}
              activeOpacity={0.85}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#0f1729" />
              ) : (
                <>
                  <Crosshair size={18} color="#0f1729" style={{ marginRight: 6 }} />
                  <Text style={styles.floatingGpsText}>Locate Me</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.mapHintBadge} pointerEvents="none">
              <Text style={styles.mapHintText}>Tap or drag pin to your building</Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Error Message Box */}
            {errorMessage !== '' && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#dc2626" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Address Input Form */}
            <View style={{ marginBottom: 20 }}>
              {/* Street Address */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>
                  House / Street Address <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <View style={styles.inputWrap}>
                  <MapPin size={18} color="#6b7280" style={{ marginRight: 10 }} />
                  <TextInput
                    value={streetAddress}
                    onChangeText={(t) => {
                      setStreetAddress(t);
                      setErrorMessage('');
                    }}
                    placeholder="e.g. 104, Royal Palace, Ring Road"
                    placeholderTextColor="#9ca3af"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Apartment / Suite */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>Flat / Floor / Tower (Optional)</Text>
                <View style={styles.inputWrap}>
                  <Building size={18} color="#6b7280" style={{ marginRight: 10 }} />
                  <TextInput
                    value={aptSuite}
                    onChangeText={setAptSuite}
                    placeholder="e.g. Flat 402, Block B"
                    placeholderTextColor="#9ca3af"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Area / Neighborhood & Landmark */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Area / Sector</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={neighborhood}
                      onChangeText={setNeighborhood}
                      placeholder="e.g. Majura Gate"
                      placeholderTextColor="#9ca3af"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Landmark</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={landmark}
                      onChangeText={setLandmark}
                      placeholder="e.g. Near Metro"
                      placeholderTextColor="#9ca3af"
                      style={styles.textInput}
                    />
                  </View>
                </View>
              </View>

              {/* City and Pincode */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.fieldLabel}>
                    City & State <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCityModal(true)}
                    style={[styles.inputWrap, { justifyContent: 'space-between' }]}
                  >
                    <Text numberOfLines={1} style={[styles.textInput, { color: cityState ? '#0f1729' : '#9ca3af' }]}>
                      {cityState || 'Select City'}
                    </Text>
                    <Search size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 0.8 }}>
                  <Text style={styles.fieldLabel}>
                    Pincode <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      value={zipCode}
                      onChangeText={(t) => {
                        setZipCode(t.replace(/\D/g, '').slice(0, 6));
                        setErrorMessage('');
                      }}
                      placeholder="395007"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.textInput, { fontWeight: '700', letterSpacing: 1 }]}
                    />
                  </View>
                </View>
              </View>

              {/* Tag Selector */}
              <View style={{ marginTop: 4 }}>
                <Text style={styles.fieldLabel}>Save address as</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { label: 'Home', icon: Home },
                    { label: 'Work', icon: Briefcase },
                    { label: 'Other', icon: Building },
                  ].map((item) => {
                    const isSelected = addressTag === item.label;
                    const IconComp = item.icon;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        onPress={() => setAddressTag(item.label)}
                        style={[
                          styles.tagBtn,
                          isSelected && styles.tagBtnSelected,
                        ]}
                      >
                        <IconComp size={16} color={isSelected ? '#ffffff' : '#6b7280'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tagText, isSelected && { color: '#ffffff' }]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Save Action Button */}
            <TouchableOpacity
              onPress={handleSaveLocation}
              disabled={savingLocation}
              activeOpacity={0.85}
              style={styles.saveCtaBtn}
            >
              {savingLocation ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.saveCtaText}>Save Address & Continue</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* City Selection Modal */}
        <Modal visible={showCityModal} animationType="slide" transparent={true}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your City</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)} style={styles.modalCloseBtn}>
                  <X size={18} color="#0f1729" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSearchBox}>
                <Search size={16} color="#6b7280" style={{ marginRight: 8 }} />
                <TextInput
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder="Search city e.g. Surat, Mumbai..."
                  placeholderTextColor="#9ca3af"
                  style={{ flex: 1, fontSize: 14, color: '#0f1729', padding: 0 }}
                />
              </View>

              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = cityState.toLowerCase().includes(item.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setCityState(`${item.name}, ${item.state}`);
                        setCountry(item.state);
                        setCoords({ latitude: item.lat, longitude: item.lng });
                        mapRef.current?.animateToRegion({
                          latitude: item.lat,
                          longitude: item.lng,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }, 500);
                        setShowCityModal(false);
                      }}
                      style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                    >
                      <MapPin size={18} color={isSelected ? '#0f1729' : '#6b7280'} style={{ marginRight: 12 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cityName, isSelected && { fontWeight: '800' }]}>{item.name}</Text>
                        <Text style={styles.cityState}>{item.state}</Text>
                      </View>
                      {isSelected && <Check size={18} color="#0f1729" />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f1729',
  },
  gpsButtonTop: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: 260,
    backgroundColor: '#cbd5e1',
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1729',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0f1729',
    marginTop: -1,
  },
  floatingGpsBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  floatingGpsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1729',
  },
  mapHintBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 41, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  mapHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  formContainer: {
    padding: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f1729',
    padding: 0,
  },
  tagBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tagBtnSelected: {
    backgroundColor: '#0f1729',
    borderColor: '#0f1729',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1729',
    height: 54,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#0f1729',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginRight: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f1729',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 10,
  },
  cityRowSelected: {
    backgroundColor: '#f1f5f9',
  },
  cityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1729',
  },
  cityState: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
});
