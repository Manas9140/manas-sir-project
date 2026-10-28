import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
  AccessibilityInfo,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import {
  ArrowLeft,
  Check,
  X,
  Plus,
  Search,
  AlertCircle,
  LocateFixed,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Wrench,
  Zap,
  Droplet,
  Droplets,
  Wind,
  WashingMachine,
  Tv,
  GlassWater,
  BatteryCharging,
  Camera,
  Laptop,
  Smartphone,
  Hammer,
  PaintRoller,
  Umbrella,
  LayoutGrid,
  Layers,
  Flame,
  DoorOpen,
  ChefHat,
  Building2,
  Sparkles,
  Bug,
  Sofa,
  Car,
  Scissors,
  Truck,
  Sprout,
  Sun,
  KeyRound,
  Shirt,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { onboardVendorApi } from '../../services/api';
import { useAuth } from '../../src/context/AuthContext';

/* ---------- Service catalogue ----------
   The original 7 names are kept unchanged so existing backend values stay valid.
   If your backend validates `category` against an enum, add the new names there too. */
const SERVICE_GROUPS = [
  {
    title: 'Repairs and installation',
    items: [
      { name: 'Electrician', icon: Zap, subs: ['Wiring', 'Switchboard', 'Ceiling Fan', 'MCB / Fuse', 'Inverter Setup', 'Light Fitting', 'Doorbell', 'Earthing'] },
      { name: 'Plumber', icon: Droplet, subs: ['Tap Leakage', 'Pipe Fitting', 'Water Heater', 'Toilet Repair', 'Drainage', 'Motor Pump', 'Wash Basin', 'Tank Fitting'] },
      { name: 'AC Repair', icon: Wind, subs: ['Gas Refill', 'Deep Cleaning', 'Installation', 'Uninstallation', 'PCB Repair', 'Cooling Fix', 'Water Leakage'] },
      { name: 'Appliance Repair', icon: WashingMachine, subs: ['Washing Machine', 'Refrigerator', 'Microwave', 'Water Purifier', 'Geyser', 'Chimney', 'Mixer Grinder'] },
      { name: 'TV Repair', icon: Tv, subs: ['LED / LCD Repair', 'Wall Mounting', 'Screen Issue', 'No Power', 'Sound Issue', 'Set-top Box'] },
      { name: 'RO Water Purifier', icon: GlassWater, subs: ['Filter Change', 'Installation', 'Service', 'Leakage Fix', 'Membrane Change'] },
      { name: 'Inverter & Battery', icon: BatteryCharging, subs: ['Installation', 'Battery Replacement', 'Repair', 'Water Top-up'] },
      { name: 'CCTV & Security', icon: Camera, subs: ['Camera Installation', 'DVR / NVR Setup', 'Video Door Phone', 'Repair', 'Smart Lock'] },
      { name: 'Computer & Laptop', icon: Laptop, subs: ['OS Install', 'Hardware Repair', 'Virus Removal', 'Data Recovery', 'Printer Setup', 'Wi-Fi Setup'] },
      { name: 'Mobile Repair', icon: Smartphone, subs: ['Screen Replacement', 'Battery Change', 'Charging Port', 'Software Issue', 'Water Damage'] },
    ],
  },
  {
    title: 'Home improvement',
    items: [
      { name: 'Carpentry', icon: Hammer, subs: ['Furniture Assembly', 'Door & Lock', 'Custom Cabinets', 'Wood Polish', 'Bed Repair', 'Window Repair'] },
      { name: 'Painting', icon: PaintRoller, subs: ['Full Home', 'Wall Touchup', 'Waterproofing', 'Texture Paint', 'Wood Painting', 'Exterior Paint'] },
      { name: 'Waterproofing', icon: Umbrella, subs: ['Terrace', 'Bathroom', 'Wall Seepage', 'Water Tank', 'Basement'] },
      { name: 'Tiles & Flooring', icon: LayoutGrid, subs: ['Tile Fitting', 'Tile Repair', 'Marble Polish', 'Grouting', 'Wooden Flooring'] },
      { name: 'False Ceiling & POP', icon: Layers, subs: ['Gypsum Ceiling', 'POP Work', 'PVC Panels', 'Repair'] },
      { name: 'Welding & Fabrication', icon: Flame, subs: ['Grill & Gate', 'Railing', 'Shed Work', 'Repair Welding'] },
      { name: 'Glass & Aluminium', icon: DoorOpen, subs: ['Sliding Windows', 'Glass Partition', 'Mosquito Net', 'Shower Enclosure'] },
      { name: 'Modular Kitchen', icon: ChefHat, subs: ['New Kitchen', 'Cabinet Repair', 'Hinges & Channels', 'Countertop'] },
      { name: 'Masonry & Civil', icon: Building2, subs: ['Brick Work', 'Plastering', 'Renovation', 'Demolition'] },
    ],
  },
  {
    title: 'Cleaning and care',
    items: [
      { name: 'Home Cleaning', icon: Sparkles, subs: ['Deep Cleaning', 'Bathroom Cleaning', 'Sofa Shampoo', 'Kitchen Cleaning', 'Move-in Cleaning', 'Window Cleaning'] },
      { name: 'Pest Control', icon: Bug, subs: ['Cockroach', 'Termite', 'Bed Bugs', 'Mosquito', 'Rodent', 'General Pest'] },
      { name: 'Sofa & Carpet Cleaning', icon: Sofa, subs: ['Sofa Shampoo', 'Carpet Cleaning', 'Mattress Cleaning', 'Curtain Cleaning'] },
      { name: 'Water Tank Cleaning', icon: Droplets, subs: ['Overhead Tank', 'Underground Sump', 'Disinfection'] },
      { name: 'Car Wash & Detailing', icon: Car, subs: ['Exterior Wash', 'Interior Cleaning', 'Polishing', 'Ceramic Coating'] },
      { name: 'Laundry & Ironing', icon: Shirt, subs: ['Wash & Fold', 'Ironing', 'Dry Cleaning', 'Shoe Cleaning'] },
    ],
  },
  {
    title: 'Personal and other services',
    items: [
      { name: 'Salon for Women', icon: Scissors, subs: ['Haircut', 'Facial', 'Waxing', 'Manicure & Pedicure', 'Bridal Makeup', 'Threading'] },
      { name: 'Salon for Men', icon: Scissors, subs: ['Haircut', 'Beard Grooming', 'Facial', 'Hair Colour', 'Massage'] },
      { name: 'Packers & Movers', icon: Truck, subs: ['Home Shifting', 'Office Shifting', 'Vehicle Transport', 'Packing Only'] },
      { name: 'Gardening', icon: Sprout, subs: ['Lawn Mowing', 'Plant Care', 'Garden Setup', 'Pruning'] },
      { name: 'Solar Installation', icon: Sun, subs: ['Rooftop Solar', 'Solar Water Heater', 'Panel Cleaning', 'Repair'] },
      { name: 'Locksmith', icon: KeyRound, subs: ['Lock Opening', 'Lock Change', 'Key Duplicate', 'Digital Lock'] },
    ],
  },
];

const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) => g.items);
const findService = (name) => ALL_SERVICES.find((s) => s.name === name);

const EXPERIENCE_LEVELS = ['1-2 Years', '3-5 Years', '5-10 Years', '10+ Years'];
const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

const STEPS = [
  { title: 'About you', sub: 'Your name and how customers can reach you.' },
  { title: 'Your services', sub: 'Pick what you do so we send you the right jobs.' },
  { title: 'Where you work', sub: 'Set your base on the map. Nearby jobs reach you first.' },
];
const CTA_LABELS = ['Continue', 'Continue', 'Activate my account'];

/* ---------- Tokens ---------- */
const C = {
  amber: '#FFB800',
  amberSoft: '#FFF6DC',
  amberDeep: '#8A6400',
  ink: '#161A2B',
  inkSub: 'rgba(22,26,43,0.72)',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  white: '#FFFFFF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/* ---------- Field (module-level so inputs keep focus while typing) ---------- */
function Field({ label, optional, hint, prefix, style, inputStyle, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 18 }, style]}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}>  Optional</Text> : null}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { borderColor: focused ? C.ink : C.line, backgroundColor: focused ? C.white : C.field },
        ]}
      >
        {prefix}
        <TextInput
          placeholderTextColor={C.faint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={[styles.input, inputStyle]}
          {...inputProps}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function SectionLabel({ children, right }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.label}>{children}</Text>
      {right}
    </View>
  );
}

export default function VendorOnboardingScreen({ route, navigation }) {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const initialDigits = String(route?.params?.mobileNumber || '').replace(/\D/g, '').slice(-10);

  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState('');
  const [mobileDigits, setMobileDigits] = useState(initialDigits);
  const [email, setEmail] = useState('');

  // Step 2
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Electrician');
  const [subServices, setSubServices] = useState(['Wiring', 'Ceiling Fan']);
  const [customServices, setCustomServices] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [experienceYears, setExperienceYears] = useState('3-5 Years');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Step 3
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Surat');
  const [pincode, setPincode] = useState('395007');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(10);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [coords, setCoords] = useState([72.8311, 21.1702]); // [lng, lat]
  const [scrollLocked, setScrollLocked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  const scrollRef = useRef(null);
  const mapRef = useRef(null);
  const stepAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const contentMax = 560;
  const contentW = Math.min(width - 40, contentMax);
  const cols = contentW > 480 ? 4 : 3;
  const tileGap = 10;
  const tileW = Math.floor((contentW - tileGap * (cols - 1)) / cols);

  const selectedService = findService(category) || ALL_SERVICES[0];
  const SelectedIcon = selectedService.icon || Wrench;
  const serviceOptions = [...selectedService.subs, ...customServices];

  const region = {
    latitude: coords[1],
    longitude: coords[0],
    latitudeDelta: (serviceRadiusKm * 2.6) / 111,
    longitudeDelta: (serviceRadiusKm * 2.6) / 111,
  };

  /* ---------- Motion ---------- */
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduceMotion(!!v));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (reduceMotion) {
      progressAnim.setValue(step);
      return;
    }
    stepAnim.setValue(0);
    Animated.parallel([
      Animated.timing(stepAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(progressAnim, { toValue: step, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [step]);

  // Keep the map framed around the pin and the radius circle
  useEffect(() => {
    if (step === 3) mapRef.current?.animateToRegion(region, reduceMotion ? 0 : 400);
  }, [coords[0], coords[1], serviceRadiusKm, step]);

  /* ---------- Services ---------- */
  const toggleSubService = (sub) => {
    if (subServices.includes(sub)) setSubServices(subServices.filter((s) => s !== sub));
    else setSubServices([...subServices, sub]);
  };

  const toggleAll = () => {
    if (serviceOptions.every((s) => subServices.includes(s))) setSubServices([]);
    else setSubServices([...serviceOptions]);
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    const svc = findService(cat);
    setSubServices(svc ? svc.subs.slice(0, 2) : []);
    setCustomServices([]);
    setPickerOpen(false);
    setQuery('');
    setErrorMessage('');
  };

  const addCustomService = () => {
    const v = customInput.trim();
    if (!v) return;
    if (!serviceOptions.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setCustomServices([...customServices, v]);
    }
    if (!subServices.includes(v)) setSubServices([...subServices, v]);
    setCustomInput('');
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICE_GROUPS;
    return SERVICE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (s) => s.name.toLowerCase().includes(q) || s.subs.some((x) => x.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  /* ---------- Location ---------- */
  const fillAddressFrom = async (lat, lng) => {
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo) {
        const line = [geo.name, geo.street, geo.district].filter(Boolean);
        if (line.length) setStreet([...new Set(line)].join(', '));
        if (geo.city || geo.subregion) setCity(geo.city || geo.subregion);
        if (geo.postalCode) setPincode(geo.postalCode);
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    setErrorMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location access was denied. Drag the pin or enter your address instead.');
        return;
      }
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMessage('Turn on location (GPS) on your phone, then try again.');
        return;
      }

      let loc;
      try {
        loc = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          12000
        );
      } catch {
        loc = await Location.getLastKnownPositionAsync();
      }
      if (!loc) {
        setErrorMessage('Could not find your location. Drag the pin to your shop instead.');
        return;
      }

      const { latitude, longitude } = loc.coords;
      setCoords([longitude, latitude]);
      setLocated(true);
      await fillAddressFrom(latitude, longitude);
    } catch (err) {
      console.warn('Location error:', err);
      setErrorMessage('Could not find your location. Drag the pin to your shop instead.');
    } finally {
      setLocating(false);
    }
  };

  const movePin = ({ latitude, longitude }) => {
    setCoords([longitude, latitude]);
    setLocated(true);
    setErrorMessage('');
    fillAddressFrom(latitude, longitude);
  };

  /* ---------- Navigation ---------- */
  const handleNext = () => {
    setErrorMessage('');
    if (step === 1) {
      if (!name.trim()) return setErrorMessage('Enter your full name.');
      if (mobileDigits.length !== 10) return setErrorMessage('Enter a valid 10-digit mobile number.');
      setStep(2);
    } else if (step === 2) {
      if (!businessName.trim()) return setErrorMessage('Enter your business or shop name.');
      if (!category) return setErrorMessage('Choose your main service.');
      if (subServices.length === 0) return setErrorMessage('Pick at least one service you handle.');
      setStep(3);
    } else if (step === 3) {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleCompleteOnboarding = async () => {
    setErrorMessage('');
    if (!street.trim()) return setErrorMessage('Enter your shop or base address.');
    if (pincode.length !== 6) return setErrorMessage('Enter a valid 6-digit pincode.');
    setLoading(true);

    const vendorPayload = {
      name: name.trim(),
      mobileNumber: `+91${mobileDigits}`,
      email: email.trim(),
      businessName: businessName.trim(),
      category: category.trim(),
      subServices,
      experienceYears,
      pincodes: [pincode.trim()],
      serviceRadiusKm,
      baseVisitingCharge: 150,
      upiId: '',
      address: {
        street: street.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        location: { type: 'Point', coordinates: coords },
      },
    };

    try {
      const res = await onboardVendorApi(vendorPayload);
      if (res.success && res.token && res.user) {
        await login(res.token, res.user, 'vendor');
        try {
          navigation?.reset({
            index: 0,
            routes: [{ name: 'VendorTabs' }],
          });
        } catch {
          navigation?.navigate('VendorTabs');
        }
      } else {
        setErrorMessage(res.message || 'Registration failed. Check your details and try again.');
      }
    } catch (err) {
      setErrorMessage('No internet connection. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onPrimary = step === 3 ? handleCompleteOnboarding : handleNext;

  /* ---------- Small pieces ---------- */
  const Choice = ({ selected, onPress, label }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.choice,
        selected ? { backgroundColor: C.ink, borderColor: C.ink } : { backgroundColor: C.white, borderColor: C.line },
      ]}
    >
      <Text style={[styles.choiceText, { color: selected ? C.white : C.ink }]}>{label}</Text>
    </TouchableOpacity>
  );

  const ServiceTile = ({ item }) => {
    const Icon = item.icon || Wrench;
    const active = category === item.name;
    return (
      <TouchableOpacity
        onPress={() => selectCategory(item.name)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        style={[
          styles.tile,
          { width: tileW },
          active
            ? { borderColor: C.ink, backgroundColor: C.amberSoft, borderWidth: 2 }
            : { borderColor: C.line, backgroundColor: C.white, borderWidth: 1.5 },
        ]}
      >
        <View style={[styles.tileIcon, { backgroundColor: active ? C.amber : C.field }]}>
          <Icon size={20} color={C.ink} />
        </View>
        <Text style={styles.tileText} numberOfLines={2}>
          {item.name}
        </Text>
        {active && (
          <View style={styles.tileCheck}>
            <Check size={11} color={C.white} strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const stepStyle = {
    opacity: stepAnim,
    transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  /* ---------- Step 1 ---------- */
  const stepOne = (
    <>
      <Field
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Ramesh Kumar"
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
      />
      <Field
        label="Mobile number"
        value={mobileDigits}
        onChangeText={(v) => setMobileDigits(v.replace(/\D/g, '').slice(0, 10))}
        placeholder="98765 43210"
        keyboardType="number-pad"
        maxLength={10}
        textContentType="telephoneNumber"
        inputStyle={{ letterSpacing: 0.5 }}
        prefix={
          <View style={styles.countryCode} accessibilityLabel="Country code India plus 91">
            <Text style={{ fontSize: 16, marginRight: 6 }}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
        }
        hint={initialDigits ? 'Verified with OTP when you signed in.' : 'Indian numbers only for now.'}
      />
      <Field
        label="Email"
        optional
        value={email}
        onChangeText={setEmail}
        placeholder="ramesh@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        hint="We'll send booking summaries and invoices here."
        style={{ marginBottom: 0 }}
      />
    </>
  );

  /* ---------- Step 2 ---------- */
  const allSelected = serviceOptions.length > 0 && serviceOptions.every((s) => subServices.includes(s));

  const stepTwo = (
    <>
      <Field
        label="Business or shop name"
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="e.g. Ramesh Electricals"
        autoCapitalize="words"
        hint="Customers see this name on your quotes."
      />

      <SectionLabel>Main service</SectionLabel>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.85}
        style={styles.selectedService}
        accessibilityRole="button"
        accessibilityLabel={`Main service: ${category}. Tap to change.`}
      >
        <View style={styles.selectedIcon}>
          <SelectedIcon size={22} color={C.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedName}>{category}</Text>
          <Text style={styles.selectedSub}>{ALL_SERVICES.length} services available</Text>
        </View>
        <View style={styles.changePill}>
          <Text style={styles.changeText}>Change</Text>
          <ChevronRight size={14} color={C.ink} />
        </View>
      </TouchableOpacity>

      <View style={{ height: 22 }} />
      <SectionLabel
        right={
          <TouchableOpacity onPress={toggleAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.linkSmall}>{allSelected ? 'Clear all' : 'Select all'}</Text>
          </TouchableOpacity>
        }
      >
        Services you handle · {subServices.length}
      </SectionLabel>

      <View style={styles.chipWrap}>
        {serviceOptions.map((sub) => {
          const selected = subServices.includes(sub);
          return (
            <TouchableOpacity
              key={sub}
              onPress={() => toggleSubService(sub)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: C.amberSoft, borderColor: C.amberDeep }
                  : { backgroundColor: C.white, borderColor: C.line },
              ]}
            >
              {selected ? (
                <Check size={14} color={C.amberDeep} strokeWidth={3} style={{ marginRight: 6 }} />
              ) : (
                <Plus size={14} color={C.faint} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.chipText, { color: selected ? C.ink : C.muted }]}>{sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <TextInput
          value={customInput}
          onChangeText={setCustomInput}
          onSubmitEditing={addCustomService}
          placeholder="Add another service you offer"
          placeholderTextColor={C.faint}
          returnKeyType="done"
          style={styles.customInput}
        />
        <TouchableOpacity
          onPress={addCustomService}
          disabled={!customInput.trim()}
          style={[styles.customAdd, { opacity: customInput.trim() ? 1 : 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel="Add service"
        >
          <Plus size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      <View style={{ height: 22 }} />
      <SectionLabel>Years of experience</SectionLabel>
      <View style={styles.segment}>
        {EXPERIENCE_LEVELS.map((lvl) => (
          <Choice
            key={lvl}
            selected={experienceYears === lvl}
            onPress={() => setExperienceYears(lvl)}
            label={lvl.replace(' Years', ' yrs')}
          />
        ))}
      </View>
    </>
  );

  /* ---------- Step 3 ---------- */
  const stepThree = (
    <>
      <View
        style={styles.mapCard}
        onTouchStart={() => setScrollLocked(true)}
        onTouchEnd={() => setScrollLocked(false)}
        onTouchCancel={() => setScrollLocked(false)}
      >
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onPress={(e) => movePin(e.nativeEvent.coordinate)}
          showsUserLocation={located}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          <Circle
            center={{ latitude: coords[1], longitude: coords[0] }}
            radius={serviceRadiusKm * 1000}
            strokeColor="rgba(138,100,0,0.8)"
            strokeWidth={2}
            fillColor="rgba(255,184,0,0.18)"
          />
          <Marker
            coordinate={{ latitude: coords[1], longitude: coords[0] }}
            draggable
            onDragEnd={(e) => movePin(e.nativeEvent.coordinate)}
            title="Your base"
            description="Drag to move"
          >
            <View style={styles.pin}>
              <Wrench size={16} color={C.ink} />
            </View>
          </Marker>
        </MapView>

        <View style={styles.mapRadiusBadge} pointerEvents="none">
          <Text style={styles.mapRadiusText}>{serviceRadiusKm} km area</Text>
        </View>

        <TouchableOpacity
          onPress={handleDetectLocation}
          disabled={locating}
          activeOpacity={0.85}
          style={styles.locateBtn}
          accessibilityRole="button"
          accessibilityLabel="Use my current location"
        >
          {locating ? (
            <ActivityIndicator size="small" color={C.ink} />
          ) : (
            <LocateFixed size={18} color={C.ink} />
          )}
          <Text style={styles.locateBtnText}>{locating ? 'Locating…' : 'Use my location'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.hint, { marginBottom: 20 }]}>
        {located
          ? 'Pin set. Drag it or tap the map if your shop is somewhere else.'
          : 'Tap the map or drag the pin to your shop, or use your current location.'}
      </Text>

      <SectionLabel right={<Text style={styles.counter}>{serviceRadiusKm} km</Text>}>
        How far will you travel?
      </SectionLabel>
      <View style={styles.segment}>
        {RADIUS_OPTIONS.map((rad) => (
          <Choice
            key={rad}
            selected={serviceRadiusKm === rad}
            onPress={() => setServiceRadiusKm(rad)}
            label={`${rad} km`}
          />
        ))}
      </View>
      <Text style={[styles.hint, { marginBottom: 22 }]}>
        You'll get job alerts from customers inside the yellow circle.
      </Text>

      <Field
        label="Shop or base address"
        value={street}
        onChangeText={setStreet}
        placeholder="e.g. Shop 4, Ring Road, Majura Gate"
        prefix={<MapPin size={16} color={C.faint} style={{ marginLeft: 14 }} />}
        inputStyle={{ paddingLeft: 10 }}
      />
      <View style={{ flexDirection: 'row' }}>
        <Field label="City" value={city} onChangeText={setCity} placeholder="Surat" style={{ flex: 1, marginRight: 12, marginBottom: 0 }} />
        <Field
          label="Pincode"
          value={pincode}
          onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="395007"
          style={{ flex: 1, marginBottom: 0 }}
          inputStyle={{ fontWeight: '700', letterSpacing: 1 }}
        />
      </View>
    </>
  );

  const currentStep = Math.min(step, STEPS.length);
  const body = [stepOne, stepTwo, stepThree][currentStep - 1];
  const progressWidth = progressAnim.interpolate({ inputRange: [1, 3], outputRange: ['33.3%', '100%'] });

  /* ---------- Layout ---------- */
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.amber }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.amber} />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerInner, { maxWidth: contentMax }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={step > 1 ? 'Previous step' : 'Go back'}
            >
              <ArrowLeft size={18} color={C.ink} />
            </TouchableOpacity>
            <Text style={styles.headerMeta}>Partner registration</Text>
            <Text style={styles.headerStep}>
              {currentStep}/{STEPS.length}
            </Text>
          </View>
          <Text style={styles.stepTitle} accessibilityRole="header">
            {STEPS[currentStep - 1].title}
          </Text>
          <Text style={styles.stepSub}>{STEPS[currentStep - 1].sub}</Text>
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: currentStep }}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.white }}>
        <ScrollView
          ref={scrollRef}
          style={styles.sheet}
          scrollEnabled={!scrollLocked}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32, alignItems: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[{ width: '100%', maxWidth: contentMax }, stepStyle]}>{body}</Animated.View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={{ width: '100%', maxWidth: contentMax }}>
            {errorMessage !== '' && (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <AlertCircle size={16} color={C.error} style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={onPrimary}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.cta, loading && { opacity: 0.8 }]}
            >
              {loading ? (
                <ActivityIndicator color={C.ink} size="small" />
              ) : (
                <>
                  {currentStep === 3 && <ShieldCheck size={18} color={C.ink} style={{ marginRight: 8 }} />}
                  <Text style={styles.ctaText}>{CTA_LABELS[currentStep - 1]}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Service picker */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.white }}>
          <View style={styles.pickerHeader}>
            <View style={{ width: '100%', maxWidth: contentMax }}>
              <View style={styles.pickerTop}>
                <Text style={styles.pickerTitle}>Choose your main service</Text>
                <TouchableOpacity
                  onPress={() => setPickerOpen(false)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={18} color={C.ink} />
                </TouchableOpacity>
              </View>
              <View style={styles.searchBox}>
                <Search size={17} color={C.faint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search e.g. geyser, pest, salon"
                  placeholderTextColor={C.faint}
                  autoCorrect={false}
                  style={styles.searchInput}
                />
                {query !== '' && (
                  <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={C.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: '100%', maxWidth: contentMax }}>
              {filteredGroups.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No match for "{query}"</Text>
                  <Text style={styles.emptySub}>
                    Pick the closest service, then add your exact work under "Add another service".
                  </Text>
                </View>
              ) : (
                filteredGroups.map((g) => (
                  <View key={g.title} style={{ marginTop: 22 }}>
                    <Text style={styles.groupTitle}>{g.title}</Text>
                    <View style={[styles.tileGrid, { gap: tileGap }]}>
                      {g.items.map((item) => (
                        <ServiceTile key={item.name} item={item} />
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* Header */
  header: { backgroundColor: C.amber, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 34, alignItems: 'center' },
  headerInner: { width: '100%' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: { fontSize: 14, fontWeight: '700', color: C.inkSub },
  headerStep: { fontSize: 14, fontWeight: '800', color: C.ink, minWidth: 40, textAlign: 'right' },
  stepTitle: { fontSize: 30, lineHeight: 35, fontWeight: '800', color: C.ink, letterSpacing: -0.7, marginTop: 20 },
  stepSub: { fontSize: 15, lineHeight: 21, color: C.inkSub, fontWeight: '500', marginTop: 6, maxWidth: 380 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(22,26,43,0.14)', marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.ink },

  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },

  /* Fields */
  label: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  optional: { fontSize: 12, fontWeight: '500', color: C.faint },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, minHeight: 52 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink, paddingHorizontal: 14, paddingVertical: 14 },
  hint: { fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 17 },
  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  counter: { fontSize: 12, fontWeight: '700', color: C.amberDeep },
  linkSmall: { fontSize: 13, fontWeight: '800', color: C.amberDeep },

  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  countryCodeText: { fontSize: 15, fontWeight: '700', color: C.ink },

  /* Selected service card */
  selectedService: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.amberSoft,
    borderRadius: 16,
    padding: 14,
  },
  selectedIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: C.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedName: { fontSize: 16, fontWeight: '800', color: C.ink },
  selectedSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
  changeText: { fontSize: 13, fontWeight: '800', color: C.ink, marginRight: 2 },

  /* Chips */
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  customRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  customInput: {
    flex: 1,
    height: 46,
    borderWidth: 1.5,
    borderColor: C.line,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.white,
  },
  customAdd: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  /* Segments */
  segment: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, borderWidth: 1.5, borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 14, fontWeight: '700' },

  /* Tiles (picker) */
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: 16, padding: 12, minHeight: 104 },
  tileIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileText: { fontSize: 13, fontWeight: '700', lineHeight: 17, color: C.ink },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Picker modal */
  pickerHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    alignItems: 'center',
  },
  pickerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    backgroundColor: C.field,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, marginLeft: 10, padding: 0 },
  groupTitle: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 12 },
  emptyBox: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 300 },

  /* Map */
  mapCard: {
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.field,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.amber,
    borderWidth: 3,
    borderColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRadiusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: C.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapRadiusText: { fontSize: 12, fontWeight: '800', color: C.ink },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.amber,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  locateBtnText: { fontSize: 13, fontWeight: '800', color: C.ink },


  /* Footer */
  footer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.errorBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.error, lineHeight: 18 },
  cta: { flexDirection: 'row', height: 56, borderRadius: 14, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: 0.2 },
});