import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { ArrowLeft, MessageCircle, PhoneCall, Mail, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function CustomerSupportScreen({ navigation }) {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    { id: '1', question: 'How do I cancel a booking?', answer: 'You can cancel a booking from the "My Bookings" section up to 2 hours before the scheduled time.' },
    { id: '2', question: 'What are the payment methods?', answer: 'We accept UPI, Credit/Debit cards, Net Banking, and Cash on Delivery for select services.' },
    { id: '3', question: 'How can I change my address?', answer: 'Go to Profile > Manage Addresses to add, edit, or delete your saved delivery addresses.' },
    { id: '4', question: 'Is my data secure?', answer: 'Yes, we use industry-standard encryption to protect your personal and payment information.' },
  ];

  const handleWhatsApp = () => {
    Linking.openURL('whatsapp://send?text=Hello Support&phone=+919876543210').catch(() => {
      console.log('WhatsApp not installed');
    });
  };

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@example.com');
  };

  return (
    <View className="flex-1 bg-[#f6f7f8]">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={24} color="#0f1729" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#0f1729]">Customer Support</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        
        <View className="mb-8 flex-row justify-between">
          <TouchableOpacity onPress={handleWhatsApp} className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 items-center mr-2">
            <View className="w-12 h-12 bg-green-50 rounded-full items-center justify-center mb-3">
              <MessageCircle size={24} color="#16a34a" />
            </View>
            <Text className="text-sm font-bold text-[#0f1729]">WhatsApp</Text>
            <Text className="text-xs text-[#6b7280] mt-1 text-center">24/7 Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCall} className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 items-center mx-1">
            <View className="w-12 h-12 bg-blue-50 rounded-full items-center justify-center mb-3">
              <PhoneCall size={24} color="#2563eb" />
            </View>
            <Text className="text-sm font-bold text-[#0f1729]">Call Us</Text>
            <Text className="text-xs text-[#6b7280] mt-1 text-center">9 AM - 6 PM</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleEmail} className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 items-center ml-2">
            <View className="w-12 h-12 bg-purple-50 rounded-full items-center justify-center mb-3">
              <Mail size={24} color="#9333ea" />
            </View>
            <Text className="text-sm font-bold text-[#0f1729]">Email</Text>
            <Text className="text-xs text-[#6b7280] mt-1 text-center">Response in 24h</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-bold text-[#0f1729] mb-4">Frequently Asked Questions</Text>
        
        <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <TouchableOpacity 
                key={faq.id} 
                onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                className={`p-4 ${index !== faqs.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-base font-bold text-[#0f1729] flex-1 pr-4">{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={20} color="#6b7280" />
                  ) : (
                    <ChevronDown size={20} color="#6b7280" />
                  )}
                </View>
                {isExpanded && (
                  <Text className="text-sm text-[#6b7280] mt-3 leading-5">{faq.answer}</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

      </ScrollView>
    </View>
  );
}
