import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableHighlight,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  X,
  Zap,
  Wrench,
  Snowflake,
  Hammer,
  PaintRoller,
  KeyRound,
  Refrigerator,
  WashingMachine,
  Droplet,
  Droplets,
  Flame,
  Sparkles,
  Bath,
  Bug,
  Truck,
  ShieldCheck,
  LayoutGrid,
  SearchX,
  ChevronRight,
} from 'lucide-react-native';

/* ---------- Design tokens (shared with Login / Bookings) ---------- */
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
};

/* One tint per group, so colour tells you which family a service belongs to */
const TINTS = {
  home: { fg: C.indigo, bg: C.indigoSoft },
  appliance: { fg: '#8A6400', bg: '#FFF6DC' },
  cleaning: { fg: '#0F7A6B', bg: '#E3F5F1' },
  moving: { fg: '#3C4A66', bg: '#EDF0F5' },
};

const CATEGORY_GROUPS = [
  {
    id: 'home',
    title: 'Home repair',
    short: 'Repair',
    items: [
      { id: 'c1', name: 'Electrician', desc: 'Wiring, fixtures and appliances', icon: Zap },
      { id: 'c2', name: 'Plumbing Services', desc: 'Pipes, leaks and fittings', icon: Wrench },
      { id: 'c3', name: 'AC Repair & Service', desc: 'Gas refill and deep clean', icon: Snowflake },
      { id: 'c4', name: 'Carpenter Work', desc: 'Furniture repair and assembly', icon: Hammer },
      { id: 'c5', name: 'House Painting', desc: 'Interior and exterior', icon: PaintRoller },
      { id: 'c6', name: 'Locksmith & Keys', desc: 'Door locks and key copies', icon: KeyRound },
    ],
  },
  {
    id: 'appliance',
    title: 'Appliance repair',
    short: 'Appliances',
    items: [
      { id: 'c7', name: 'Refrigerator Repair', desc: 'Cooling and motor check', icon: Refrigerator },
      { id: 'c8', name: 'Washing Machine', desc: 'Drum, motor and drain fix', icon: WashingMachine },
      { id: 'c9', name: 'RO Water Purifier', desc: 'Filter change and service', icon: Droplet },
      { id: 'c10', name: 'Gas Stove Repair', desc: 'Burner and pipeline fix', icon: Flame },
    ],
  },
  {
    id: 'cleaning',
    title: 'Cleaning and pest control',
    short: 'Cleaning',
    items: [
      { id: 'c11', name: 'Full Home Cleaning', desc: 'Deep clean, room by room', icon: Sparkles },
      { id: 'c12', name: 'Bathroom Cleaning', desc: 'Tile and stain removal', icon: Bath },
      { id: 'c13', name: 'Pest Control', desc: 'Termites and cockroaches', icon: Bug },
      { id: 'c14', name: 'Water Tank Cleaning', desc: 'Underground and overhead', icon: Droplets },
    ],
  },
  {
    id: 'moving',
    title: 'Moving and sanitization',
    short: 'Moving',
    items: [
      { id: 'c15', name: 'Packers & Movers', desc: 'Local and intercity shifting', icon: Truck },
      { id: 'c16', name: 'Home Sanitization', desc: 'Full home disinfection', icon: ShieldCheck },
    ],
  },
];

const TOTAL_SERVICES = CATEGORY_GROUPS.reduce((n, g) => n + g.items.length, 0);
const H_PADDING = 16;

/* ---------- Pieces (defined outside the screen so they don't remount) ---------- */
function ServiceRow({ item, tint, last, onPress }) {
  const Icon = item.icon;
  return (
    <TouchableHighlight
      onPress={onPress}
      underlayColor="#F1F3F8"
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.desc}`}
      accessibilityHint="Opens a new request for this service"
    >
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: tint.bg }]}>
          <Icon size={18} color={tint.fg} strokeWidth={2} />
        </View>
        <View style={[styles.rowBody, !last && styles.rowDivider]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowDesc} numberOfLines={1}>
              {item.desc}
            </Text>
          </View>
          <ChevronRight size={18} color="#C3C9D6" />
        </View>
      </View>
    </TouchableHighlight>
  );
}

function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.sectionCount}>
        {count} {count === 1 ? 'service' : 'services'}
      </Text>
    </View>
  );
}

/* ---------- Screen ---------- */
export default function CategoriesScreen({ navigation, route }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  // Opened from Home's search bar: focus the field straight away
  useEffect(() => {
    if (route?.params?.focusSearch) {
      const t = setTimeout(() => searchRef.current?.focus(), 300);
      navigation?.setParams?.({ focusSearch: undefined });
      return () => clearTimeout(t);
    }
  }, [route?.params?.focusSearch]);
  const [searchFocused, setSearchFocused] = useState(false);

  const scrollRef = useRef(null);
  const sectionY = useRef({});

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const groups = useMemo(() => {
    if (!q) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS.map((g) => {
      const groupMatch = g.title.toLowerCase().includes(q);
      return {
        ...g,
        items: groupMatch
          ? g.items
          : g.items.filter((it) => `${it.name} ${it.desc}`.toLowerCase().includes(q)),
      };
    }).filter((g) => g.items.length > 0);
  }, [q]);

  const resultCount = groups.reduce((n, g) => n + g.items.length, 0);

  const openService = (item) => navigation?.navigate('CreateRequest', { category: item.name });

  const jumpTo = (groupId) => {
    const y = sectionY.current[groupId];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.indigo} />

      {/* Header */}
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerIconWrap}>
          <LayoutGrid size={170} color="rgba(255,255,255,0.08)" strokeWidth={1.4} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          All services
        </Text>
        <Text style={styles.subtitle}>
          {searching
            ? `${resultCount} ${resultCount === 1 ? 'match' : 'matches'} for “${query.trim()}”`
            : `${TOTAL_SERVICES} services from verified local pros`}
        </Text>

        <View
          style={[
            styles.search,
            { borderColor: searchFocused ? C.amber : 'transparent' },
          ]}
        >
          <Search size={18} color={C.muted} />
          <TextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search for AC, plumber, cleaning…"
            placeholderTextColor={C.faint}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search services"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={14} color={C.white} strokeWidth={3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { maxWidth: 640 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {!searching && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={styles.chipScroll}
            >
              {CATEGORY_GROUPS.map((g) => {
                const tint = TINTS[g.id];
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => jumpTo(g.id)}
                    activeOpacity={0.8}
                    style={styles.chip}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${g.title}`}
                  >
                    <View style={[styles.chipDot, { backgroundColor: tint.fg }]} />
                    <Text style={styles.chipText}>{g.short}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {groups.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <SearchX size={26} color={C.indigo} />
              </View>
              <Text style={styles.emptyTitle}>No services match “{query.trim()}”</Text>
              <Text style={styles.emptyBody}>
                Try a simpler word like “AC”, “leak” or “cleaning”.
              </Text>
              <TouchableOpacity
                onPress={() => setQuery('')}
                activeOpacity={0.85}
                style={styles.emptyBtn}
                accessibilityRole="button"
              >
                <Text style={styles.emptyBtnText}>Show all services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((group) => {
              const tint = TINTS[group.id];
              return (
                <View
                  key={group.id}
                  style={styles.section}
                  onLayout={(e) => {
                    sectionY.current[group.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <SectionHeader title={group.title} count={group.items.length} />
                  <View style={styles.group}>
                    {group.items.map((item, i) => (
                      <ServiceRow
                        key={item.id}
                        item={item}
                        tint={tint}
                        last={i === group.items.length - 1}
                        onPress={() => openService(item)}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.indigo },

  /* Header */
  header: {
    backgroundColor: C.indigo,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
    overflow: 'hidden',
  },
  headerIconWrap: {
    position: 'absolute',
    right: -36,
    bottom: -34,
    transform: [{ rotate: '-14deg' }],
  },
  title: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: -0.8 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.74)',
    marginTop: 4,
    marginBottom: 18,
    fontWeight: '500',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: C.ink,
    padding: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: C.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 20,
    paddingBottom: 40,
    width: '100%',
    alignSelf: 'center',
  },

  /* Jump chips */
  chipScroll: { marginHorizontal: -H_PADDING, marginBottom: 8 },
  chipRow: { paddingHorizontal: H_PADDING },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    marginRight: 8,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '700', color: C.ink },

  /* Sections */
  section: { marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  sectionCount: { fontSize: 12, fontWeight: '500', color: C.faint },

  /* One white container per group, rows separated by hairlines */
  group: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    backgroundColor: C.white,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
    minHeight: 60,
  },
  // Divider starts at the text, not the icon, so the icons read as one column
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowName: { fontSize: 15, fontWeight: '600', color: C.ink },
  rowDesc: { fontSize: 12.5, color: C.muted, marginTop: 2 },

  /* Empty search */
  empty: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center', letterSpacing: -0.3 },
  emptyBody: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 280 },
  emptyBtn: {
    backgroundColor: C.indigo,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
});