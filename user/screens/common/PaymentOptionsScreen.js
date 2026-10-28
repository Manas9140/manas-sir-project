import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft, CreditCard, Banknote, SmartphoneNfc, Plus, CheckCircle2 } from 'lucide-react-native';

export default function PaymentOptionsScreen({ navigation }) {
  const [preferredMethod, setPreferredMethod] = useState('cod');

  const paymentMethods = [
    { id: 'upi1', type: 'upi', title: 'Google Pay', subtitle: 'user@okicici', icon: SmartphoneNfc },
    { id: 'card1', type: 'card', title: 'HDFC Bank Credit Card', subtitle: '**** **** **** 4589', icon: CreditCard },
  ];

  return (
    <View className="flex-1 bg-[#f6f7f8]">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={24} color="#0f1729" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#0f1729]">Payment Options</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-4 ml-1">Saved Methods</Text>
        
        {paymentMethods.map((method) => (
          <TouchableOpacity 
            key={method.id} 
            onPress={() => setPreferredMethod(method.id)}
            className={`bg-white rounded-2xl border p-4 mb-4 flex-row items-center ${preferredMethod === method.id ? 'border-[#0f1729]' : 'border-gray-200'}`}
          >
            <View className="w-12 h-12 rounded-full bg-[#f6f7f8] items-center justify-center mr-4">
              <method.icon size={24} color="#0f1729" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#0f1729]">{method.title}</Text>
              <Text className="text-sm text-[#6b7280] mt-0.5">{method.subtitle}</Text>
            </View>
            {preferredMethod === method.id && (
              <CheckCircle2 size={24} color="#0f1729" />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity className="bg-white border border-dashed border-[#0f1729] rounded-2xl p-4 mb-8 flex-row items-center justify-center">
          <Plus size={20} color="#0f1729" className="mr-2" />
          <Text className="text-base font-bold text-[#0f1729]">Add New Payment Method</Text>
        </TouchableOpacity>

        <Text className="text-sm font-bold text-[#6b7280] uppercase tracking-wider mb-4 ml-1">Other Methods</Text>
        
        <TouchableOpacity 
          onPress={() => setPreferredMethod('cod')}
          className={`bg-white rounded-2xl border p-4 mb-6 flex-row items-center ${preferredMethod === 'cod' ? 'border-[#0f1729]' : 'border-gray-200'}`}
        >
          <View className="w-12 h-12 rounded-full bg-[#f6f7f8] items-center justify-center mr-4">
            <Banknote size={24} color="#0f1729" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#0f1729]">Cash on Delivery (COD)</Text>
            <Text className="text-sm text-[#6b7280] mt-0.5">Pay at your doorstep</Text>
          </View>
          {preferredMethod === 'cod' && (
            <CheckCircle2 size={24} color="#0f1729" />
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
