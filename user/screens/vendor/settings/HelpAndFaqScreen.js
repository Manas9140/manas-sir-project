import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Headphones,
  Sparkles,
  DollarSign,
  KeyRound,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react-native';

const FAQ_CATEGORIES = ['All', 'Leads & Bids', 'Payouts', 'Job Execution', 'Ratings & Trust'];

const FAQS = [
  {
    id: 'faq-1',
    category: 'Leads & Bids',
    question: 'How do I receive service leads in my area?',
    answer:
      'Leads are instantly broadcasted to your app based on your registered trade category and operating pincodes. Ensure your "Accepting Jobs" toggle is ON in your profile to receive high-priority alerts.',
  },
  {
    id: 'faq-2',
    category: 'Job Execution',
    question: 'Why is the 4-Digit Start OTP required?',
    answer:
      'The 4-digit OTP is generated on the customer’s app upon your arrival. Asking the customer for this OTP before starting ensures verified presence, prevents false cancellations, and activates job insurance protection.',
  },
  {
    id: 'faq-3',
    category: 'Payouts',
    question: 'When and how are payouts credited to my account?',
    answer:
      'All completed job earnings are automatically settled directly to your registered UPI ID or bank account every evening via automated IMPS/UPI transfers (T+0 or T+1 schedule). You can track live balances in the Earnings tab.',
  },
  {
    id: 'faq-4',
    category: 'Job Execution',
    question: 'What if a customer cancels after I reach the doorstep?',
    answer:
      'If you reach the location and the customer cancels or is unavailable, you can report a "Doorstep Cancellation" in the job card. Our system verifies your GPS proximity and credits your base visiting charge.',
  },
  {
    id: 'faq-5',
    category: 'Ratings & Trust',
    question: 'How can I increase my vendor rating & receive more leads?',
    answer:
      'Top-rated partners maintain punctuality within 15 minutes of scheduled time, provide upfront transparent pricing for spare parts, and maintain professional cleanliness. 5-star ratings give you 2x lead visibility.',
  },
  {
    id: 'faq-6',
    category: 'Payouts',
    question: 'What is the platform service fee or commission?',
    answer:
      'Local Services charges a transparent partner fee of 10% to 15% strictly on successfully completed labor charges. There is zero commission on hardware/spare parts purchased for the customer.',
  },
  {
    id: 'faq-7',
    category: 'Leads & Bids',
    question: 'How do I add or modify my operating pincodes?',
    answer:
      'Go to Profile > Settings > Service Areas & Branches. You can add any 6-digit pincode or set your travel radius from 5 km to 35 km around your workshop.',
  },
  {
    id: 'faq-8',
    category: 'Job Execution',
    question: 'What if extra spare parts or materials are needed?',
    answer:
      'Always discuss material costs and show genuine vendor bills to the customer before installation. You can adjust the final bill amount on the job completion screen with customer agreement.',
  },
];

export default function HelpAndFaqScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredFaqs = useMemo(() => {
    return FAQS.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

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
            <Text className="text-base font-bold text-[#0f1729]">Help Center & FAQs</Text>
            <Text className="text-[11px] text-[#6b7280]">Answers for bidding, jobs & payouts</Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 py-3"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View className="bg-white rounded-xl border border-slate-200/70 p-2 flex-row items-center mb-3 shadow-xs">
          <Search size={16} color="#9ca3af" className="ml-1 mr-2" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search questions e.g. OTP, Payouts, Cancellation..."
            placeholderTextColor="#9ca3af"
            className="flex-1 text-xs text-[#0f1729] py-1"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X size={14} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-3"
        >
          {FAQ_CATEGORIES.map((cat) => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border mr-2 ${
                  active
                    ? 'bg-[#0f1729] border-[#0f1729]'
                    : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? 'text-white' : 'text-[#0f1729]'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQ Accordions List */}
        <View className="space-y-2 gap-2 mb-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View
                  key={faq.id}
                  className="bg-white rounded-xl border border-slate-200/70 overflow-hidden shadow-xs"
                >
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                    className="p-3.5 flex-row items-center justify-between"
                  >
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center mb-1">
                        <View className="bg-slate-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-slate-600 uppercase">
                            {faq.category}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs font-bold text-[#0f1729] leading-snug">
                        {faq.question}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={16} color="#0f1729" />
                    ) : (
                      <ChevronDown size={16} color="#6b7280" />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-[#f6f7f8]/50">
                      <Text className="text-xs text-[#6b7280] leading-relaxed">
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View className="bg-white rounded-xl border border-slate-200/70 p-6 items-center">
              <HelpCircle size={28} color="#9ca3af" />
              <Text className="text-xs font-semibold text-[#0f1729] mt-2">No matching questions</Text>
              <Text className="text-[11px] text-[#6b7280] mt-0.5 text-center">
                Try searching with different keywords or reach out to our partner support team.
              </Text>
            </View>
          )}
        </View>

        {/* Contact Support Banner Card */}
        <View className="bg-[#0f1729] p-4 rounded-xl shadow-xs">
          <View className="flex-row items-center mb-1.5">
            <Headphones size={16} color="#60A5FA" />
            <Text className="text-xs font-bold text-white ml-2">Still need help?</Text>
          </View>
          <Text className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Our partner operations specialists are available every day to assist with billing, disputes, and app queries.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerCare')}
            className="bg-white py-2.5 px-3 rounded-xl flex-row items-center justify-center active:opacity-90"
          >
            <Text className="text-xs font-bold text-[#0f1729]">Contact Partner Support</Text>
            <ArrowRight size={14} color="#0f1729" className="ml-1.5" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
