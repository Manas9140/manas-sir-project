import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
  Animated,
  Easing,
  AccessibilityInfo,
  StyleSheet,
} from 'react-native';
import {
  Home,
  Wrench,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Check,
} from 'lucide-react-native';
import { sendOtpApi, verifyOtpApi } from '../../services/api';
import { useAuth } from '../../src/context/AuthContext';

const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

const formatPhone = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

/* ---------- Design tokens ---------- */
const C = {
  indigo: '#1B2A6B', // workwear indigo – customer
  amber: '#FFB800', // tool yellow – partner
  ink: '#161A2B',
  muted: '#5B6478',
  faint: '#98A0B3',
  line: '#E3E7F0',
  field: '#F5F7FB',
  page: '#EEF1F8',
  white: '#FFFFFF',
  error: '#C8264E',
  errorBg: '#FDF0F3',
};

const THEMES = {
  customer: {
    hero: C.indigo,
    heroText: C.white,
    heroSub: 'rgba(255,255,255,0.74)',
    heroIcon: 'rgba(255,255,255,0.10)',
    accent: C.indigo,
    accentSoft: '#EAEEFB',
    cta: C.indigo,
    ctaText: C.white,
    statusBar: 'light-content',
    headline: 'Get your home fixed, today',
    sub: 'Book verified local pros for AC, plumbing, electrical work and more.',
  },
  vendor: {
    hero: C.amber,
    heroText: C.ink,
    heroSub: 'rgba(22,26,43,0.72)',
    heroIcon: 'rgba(22,26,43,0.08)',
    accent: '#B07F00',
    accentSoft: '#FFF6DC',
    cta: C.amber,
    ctaText: C.ink,
    statusBar: 'dark-content',
    headline: 'Find repair jobs near you',
    sub: 'Get live local leads, send quotes and receive UPI payouts directly.',
  },
};

export default function LoginScreen({
  navigation,
  onNavigateToSignup,
  onNavigateToVendorOnboarding,
  onLoginSuccess,
}) {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();

  const [role, setRole] = useState('customer'); // 'customer' | 'vendor'
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [testOtpBanner, setTestOtpBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [focusedOtp, setFocusedOtp] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const otpInputs = useRef([]);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;

  const t = THEMES[role];
  const isWide = width >= 768;
  const sheetWidth = isWide ? Math.min(460, width * 0.5) : width;
  const innerWidth = sheetWidth - 48;
  const topInset = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 48;

  const cleanNumericPhone = phone.replace(/\D/g, '').slice(0, 10);
  const fullOtp = otp.join('');
  const phoneValid = cleanNumericPhone.length === 10;
  const otpComplete = fullOtp.length === OTP_LENGTH;
  const otpGap = 10;
  const otpSize = Math.min(54, Math.floor((innerWidth - otpGap * (OTP_LENGTH - 1)) / OTP_LENGTH));

  /* ---------- Motion ---------- */
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => setReduceMotion(!!v));
  }, []);

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: reduceMotion ? 0 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [step, role]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /* ---------- Logic (unchanged) ---------- */
  const switchRole = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setStep('phone');
    setErrorMessage('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setTestOtpBanner('');
  };

  const handleSendOtp = async (isResend = false) => {
    setErrorMessage('');
    if (!phoneValid) {
      setErrorMessage('Enter a valid 10-digit mobile number.');
      return;
    }

    isResend ? setResending(true) : setLoading(true);
    const fullPhone = `+91${cleanNumericPhone}`;
    const res = await sendOtpApi(fullPhone, role);
    isResend ? setResending(false) : setLoading(false);

    if (res.success) {
      setOtp(Array(OTP_LENGTH).fill(''));
      setTestOtpBanner('');
      if (res.otp) {
        setTestOtpBanner(String(res.otp));
        const digits = String(res.otp).split('').slice(0, OTP_LENGTH);
        if (digits.length === OTP_LENGTH) setOtp(digits);
      }
      setSecondsLeft(RESEND_SECONDS);
      setStep('otp');
      setTimeout(() => otpInputs.current[0]?.focus(), 250);
    } else {
      setErrorMessage(res.message || 'Could not send the code. Check your internet connection and try again.');
    }
  };

  const handleOtpChange = (text, index) => {
    const clean = text.replace(/\D/g, '');
    setErrorMessage('');
    if (clean.length > 1) {
      const digits = clean.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');
      digits.forEach((d, i) => (next[i] = d));
      setOtp(next);
      otpInputs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const next = [...otp];
    next[index] = clean;
    setOtp(next);
    if (clean && index < OTP_LENGTH - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    if (!otpComplete) {
      setErrorMessage('Enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${cleanNumericPhone}`;
    const res = await verifyOtpApi(fullPhone, fullOtp, '', role);
    setLoading(false);

    if (res.success) {
      if (role === 'vendor' && (res.isNewUser || res.isNewVendor || !res.token)) {
        if (onNavigateToVendorOnboarding) {
          onNavigateToVendorOnboarding(fullPhone);
        } else {
          navigation?.navigate('VendorOnboarding', { mobileNumber: fullPhone });
        }
        return;
      }

      if (role === 'customer' && res.isNewUser && !res.user?.name) {
        if (onNavigateToSignup) {
          onNavigateToSignup({ mobileNumber: fullPhone, token: res.token, user: res.user });
        } else {
          navigation?.navigate('Signup', { mobileNumber: fullPhone, token: res.token });
        }
        return;
      }

      if (res.token && res.user) {
        await login(res.token, res.user, role);
        onLoginSuccess?.(res.user, res.token, role);
      }
    } else {
      setErrorMessage(res.message || 'That code is incorrect or has expired. Try again or resend it.');
    }
  };

  const handleGoToSignup = () => {
    const phoneParam = cleanNumericPhone ? `+91${cleanNumericPhone}` : '';
    if (role === 'customer') {
      if (onNavigateToSignup) onNavigateToSignup({ mobileNumber: phoneParam });
      else navigation?.navigate('Signup', { mobileNumber: phoneParam });
    } else {
      if (onNavigateToVendorOnboarding) onNavigateToVendorOnboarding(phoneParam);
      else navigation?.navigate('VendorOnboarding', { mobileNumber: phoneParam });
    }
  };

  /* ---------- Pieces ---------- */
  const HeroIcon = role === 'customer' ? Home : Wrench;

  const hero = (
    <View
      style={[
        styles.hero,
        { backgroundColor: t.hero, paddingTop: topInset + 20 },
        isWide && styles.heroWide,
      ]}
    >
      <View pointerEvents="none" style={styles.heroIconWrap}>
        <HeroIcon size={isWide ? 320 : 200} color={t.heroIcon} strokeWidth={1.4} />
      </View>

      <View style={styles.brandRow}>
        <View style={styles.logoRing}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="cover" />
        </View>
        <Text style={[styles.brand, { color: t.heroText }]}>LocalServices</Text>
      </View>

      <Text
        style={[styles.headline, { color: t.heroText }, isWide && styles.headlineWide]}
        accessibilityRole="header"
      >
        {t.headline}
      </Text>
      <Text style={[styles.heroSub, { color: t.heroSub }]}>{t.sub}</Text>
    </View>
  );

  const RoleTile = ({ value, Icon, title, caption }) => {
    const active = role === value;
    const th = THEMES[value];
    return (
      <TouchableOpacity
        onPress={() => switchRole(value)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        style={[
          styles.roleTile,
          {
            borderColor: active ? th.accent : C.line,
            borderWidth: active ? 2 : 1.5,
            backgroundColor: active ? th.accentSoft : C.white,
          },
        ]}
      >
        <View style={styles.roleTileHeader}>
          <View style={[styles.roleIcon, { backgroundColor: active ? th.hero : C.field }]}>
            <Icon size={18} color={active ? th.heroText : C.muted} />
          </View>
          <View
            style={[
              styles.roleCheck,
              active
                ? { backgroundColor: th.hero, borderColor: th.hero }
                : { backgroundColor: 'transparent', borderColor: C.line },
            ]}
          >
            {active && <Check size={11} color={th.heroText} strokeWidth={3} />}
          </View>
        </View>
        <Text style={[styles.roleTitle, { color: active ? C.ink : C.muted }]}>{title}</Text>
        <Text style={styles.roleCaption}>{caption}</Text>
      </TouchableOpacity>
    );
  };

  const ErrorBox = () =>
    errorMessage !== '' ? (
      <View style={styles.errorBox} accessibilityLiveRegion="polite">
        <AlertCircle size={16} color={C.error} style={{ marginRight: 8 }} />
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    ) : null;

  const PrimaryButton = ({ label, onPress, enabled }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!enabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled || loading }}
      style={[styles.cta, { backgroundColor: enabled ? t.cta : '#D5DAE5' }]}
    >
      {loading ? (
        <ActivityIndicator color={enabled ? t.ctaText : C.white} size="small" />
      ) : (
        <Text style={[styles.ctaText, { color: enabled ? t.ctaText : C.white }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const stepStyle = {
    opacity: stepAnim,
    transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  const phoneStep = (
    <Animated.View style={stepStyle}>
      <Text style={styles.sectionTitle}>Sign in or create an account</Text>

      <View style={styles.roleRow}>
        <RoleTile value="customer" Icon={Home} title="I need a service" caption="Book a pro" />
        <View style={{ width: 12 }} />
        <RoleTile value="vendor" Icon={Wrench} title="I'm a partner" caption="Get repair jobs" />
      </View>

      <Text style={styles.fieldLabel}>Mobile number</Text>
      <View
        style={[
          styles.phoneField,
          { borderColor: phoneFocused ? t.accent : C.line, backgroundColor: phoneFocused ? C.white : C.field },
        ]}
      >
        <View style={styles.prefix}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>🇮🇳</Text>
          <Text style={styles.prefixText}>+91</Text>
        </View>
        <TextInput
          value={formatPhone(cleanNumericPhone)}
          onChangeText={(v) => {
            setPhone(v.replace(/\D/g, '').slice(0, 10));
            setErrorMessage('');
          }}
          onFocus={() => setPhoneFocused(true)}
          onBlur={() => setPhoneFocused(false)}
          onSubmitEditing={() => handleSendOtp(false)}
          placeholder="98765 43210"
          placeholderTextColor={C.faint}
          keyboardType="number-pad"
          maxLength={11}
          accessibilityLabel="Mobile number"
          style={styles.phoneInput}
        />
        {phoneValid && (
          <View style={[styles.validDot, { backgroundColor: t.hero }]}>
            <Check size={12} color={t.heroText} strokeWidth={3} />
          </View>
        )}
      </View>
      <Text style={styles.helper}>We'll send a 6-digit code by SMS to verify it's you.</Text>

      <ErrorBox />

      <PrimaryButton label="Get OTP" onPress={() => handleSendOtp(false)} enabled={phoneValid} />

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>
          {role === 'customer' ? 'New to LocalServices? ' : 'New service partner? '}
        </Text>
        <TouchableOpacity onPress={handleGoToSignup} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
          <Text style={[styles.signupLink, { color: role === 'customer' ? C.indigo : C.ink }]}>
            {role === 'customer' ? 'Create an account' : 'Register your business'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const otpStep = (
    <Animated.View style={stepStyle}>
      <TouchableOpacity
        onPress={() => {
          setStep('phone');
          setErrorMessage('');
        }}
        style={styles.backBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Change mobile number"
      >
        <ArrowLeft size={18} color={C.ink} />
      </TouchableOpacity>

      <Text style={styles.sectionTitleLg}>Enter the code</Text>
      <View style={styles.sentRow}>
        <Text style={styles.sentText}>Sent to +91 {formatPhone(cleanNumericPhone)}  </Text>
        <TouchableOpacity
          onPress={() => {
            setStep('phone');
            setErrorMessage('');
          }}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Text style={[styles.editLink, { color: role === 'customer' ? C.indigo : '#8A6400' }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && testOtpBanner !== '' && (
        <View style={styles.devBanner}>
          <KeyRound size={15} color="#8A5A00" style={{ marginRight: 8 }} />
          <Text style={styles.devText}>
            Test OTP: <Text style={{ fontWeight: '800', letterSpacing: 2 }}>{testOtpBanner}</Text>
          </Text>
        </View>
      )}

      <View style={[styles.otpRow, { width: innerWidth }]}>
        {otp.map((digit, idx) => {
          const isCurrent = focusedOtp === idx;
          return (
            <TextInput
              key={idx}
              ref={(r) => (otpInputs.current[idx] = r)}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, idx)}
              onKeyPress={(e) => handleOtpKeyPress(e, idx)}
              onFocus={() => setFocusedOtp(idx)}
              onBlur={() => setFocusedOtp(-1)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete={idx === 0 ? 'sms-otp' : 'off'}
              maxLength={idx === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              accessibilityLabel={`Digit ${idx + 1} of ${OTP_LENGTH}`}
              style={[
                styles.otpBox,
                {
                  width: otpSize,
                  height: otpSize + 8,
                  borderColor: errorMessage ? C.error : isCurrent ? t.accent : digit ? C.ink : C.line,
                  borderWidth: isCurrent ? 2 : 1.5,
                  backgroundColor: digit || isCurrent ? C.white : C.field,
                },
              ]}
            />
          );
        })}
      </View>

      <ErrorBox />

      <PrimaryButton
        label={role === 'customer' ? 'Verify and continue' : 'Verify and open dashboard'}
        onPress={handleVerifyOtp}
        enabled={otpComplete}
      />

      <View style={styles.resendRow}>
        {secondsLeft > 0 ? (
          <Text style={styles.resendText}>
            Didn't get it? Resend in{' '}
            <Text style={{ fontWeight: '700', color: C.ink }}>
              0:{String(secondsLeft).padStart(2, '0')}
            </Text>
          </Text>
        ) : (
          <TouchableOpacity
            onPress={() => handleSendOtp(true)}
            disabled={resending}
            style={styles.resendBtn}
            accessibilityRole="button"
          >
            {resending ? (
              <ActivityIndicator size="small" color={C.ink} />
            ) : (
              <>
                <RefreshCw size={14} color={C.ink} style={{ marginRight: 6 }} />
                <Text style={styles.resendBtnText}>Resend code</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        isWide ? [styles.sheetWide, { width: sheetWidth }] : { minHeight: height * 0.62 },
        {
          opacity: sheetAnim,
          transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      {step === 'phone' ? phoneStep : otpStep}

      <View style={styles.footer}>
        <ShieldCheck size={14} color={C.faint} style={{ marginRight: 6 }} />
        <Text style={styles.footerText}>Your number is only used to sign you in</Text>
      </View>
    </Animated.View>
  );

  /* ---------- Layout ---------- */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isWide ? C.page : t.hero }}
    >
      <StatusBar barStyle={t.statusBar} backgroundColor={t.hero} />
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {hero}
          <ScrollView
            contentContainerStyle={styles.wideScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sheet}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          style={{ backgroundColor: C.white }}
          contentContainerStyle={{ flexGrow: 1, backgroundColor: t.hero }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {hero}
          {sheet}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* Hero */
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  heroWide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingBottom: 48,
  },
  heroIconWrap: {
    position: 'absolute',
    right: -40,
    bottom: -30,
    transform: [{ rotate: '-14deg' }],
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logo: { width: 30, height: 30, borderRadius: 8 },
  brand: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  headline: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.8,
    maxWidth: 320,
  },
  headlineWide: { fontSize: 48, lineHeight: 52, maxWidth: 460 },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: 12,
    maxWidth: 360,
  },

  /* Sheet */
  sheet: {
    flexGrow: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  sheetWide: {
    flexGrow: 0,
    marginTop: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#1B2A6B',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  wideScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  sectionTitleLg: { fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.5, marginTop: 18 },

  /* Role tiles */
  roleRow: { flexDirection: 'row', marginTop: 16 },
  roleTile: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 112,
  },
  roleTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: { fontSize: 14, fontWeight: '700' },
  roleCaption: { fontSize: 12, color: C.faint, marginTop: 2, fontWeight: '500' },
  roleCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Phone */
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 24, marginBottom: 8 },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingRight: 14,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: C.line,
    marginRight: 12,
  },
  prefixText: { fontSize: 15, fontWeight: '700', color: C.ink },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: C.ink,
    letterSpacing: 0.5,
    padding: 0,
  },
  validDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: { fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 17 },

  /* Error / dev */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.errorBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.error, lineHeight: 18 },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4D6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  devText: { fontSize: 12, color: '#7A4F00', fontWeight: '600' },

  /* CTA */
  cta: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  ctaText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  signupText: { fontSize: 14, color: C.muted },
  signupLink: { fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },

  /* OTP */
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  sentText: { fontSize: 14, color: C.muted },
  editLink: { fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    maxWidth: '100%',
  },
  otpBox: {
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    padding: 0,
  },
  resendRow: { alignItems: 'center', marginTop: 18, minHeight: 24, justifyContent: 'center' },
  resendText: { fontSize: 13, color: C.muted },
  resendBtn: { flexDirection: 'row', alignItems: 'center' },
  resendBtnText: { fontSize: 14, fontWeight: '700', color: C.ink },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: { fontSize: 12, color: C.faint },
});