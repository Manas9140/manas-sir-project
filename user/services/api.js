import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Production Render Backend URL for Client APK
export const SERVER_HOST = 'https://manas-sir-project.onrender.com';
export const API_BASE_URL = `${SERVER_HOST}/api`;
export const SOCKET_URL = SERVER_HOST;

console.log('[API] Connected Base URL:', API_BASE_URL);
console.log('[API] Connected Socket URL:', SOCKET_URL);

/**
 * Get Current Profile (Customer or Vendor)
 */
export const getMeApi = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    console.error('getMeApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Send OTP (handles both customer and vendor)
 */
export const sendOtpApi = async (phone, role = 'customer') => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, mobileNumber: phone, role }),
    });
    return await res.json();
  } catch (error) {
    console.error('sendOtpApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Verify OTP (handles both customer and vendor)
 */
export const verifyOtpApi = async (phone, otp, name = '', role = 'customer') => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, mobileNumber: phone, otp, name, role }),
    });
    return await res.json();
  } catch (error) {
    console.error('verifyOtpApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Complete Vendor Onboarding Registration
 */
export const onboardVendorApi = async (vendorData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/vendor/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vendorData),
    });
    return await res.json();
  } catch (error) {
    console.error('onboardVendorApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Seamlessly Switch Mode between Customer and Partner
 */
export const switchModeApi = async (token, targetRole) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/switch-mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ targetRole }),
    });
    return await res.json();
  } catch (error) {
    console.error('switchModeApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Update Location & Address Details
 */
export const updateLocationApi = async (token, latitude, longitude, addressDetails) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude, addressDetails }),
    });
    return await res.json();
  } catch (error) {
    console.error('updateLocationApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Upload Service Request (Customer)
 */
export const createServiceRequestApi = async (token, requestData) => {
  try {
    const isFormData = requestData && (requestData instanceof FormData || typeof requestData.append === 'function' || Boolean(requestData._parts));
    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE_URL}/service-requests`, {
      method: 'POST',
      headers,
      body: isFormData ? requestData : JSON.stringify(requestData),
    });
    return await res.json();
  } catch (error) {
    console.error('createServiceRequestApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Upload User Avatar image via PUT /api/auth/profile-image
 */
export const updateProfileImageApi = async (token, imageUri) => {
  try {
    const formData = new FormData();
    const uriStr = typeof imageUri === 'string' ? imageUri : imageUri?.uri || '';
    if (!uriStr) {
      throw new Error('Invalid image URI');
    }

    const fileUri = Platform.OS === 'android'
      ? (uriStr.startsWith('file://') || uriStr.startsWith('content://') ? uriStr : `file://${uriStr}`)
      : (uriStr.startsWith('file://') ? uriStr : `file://${uriStr}`);

    const filename = uriStr.split('/').pop() || `avatar_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: fileUri,
      name: String(filename),
      type: String(type),
    });

    const res = await fetch(`${API_BASE_URL}/auth/profile-image`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return await res.json();
  } catch (error) {
    console.error('updateProfileImageApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

/**
 * Get My Requests (Customer)
 */
export const getMyRequestsApi = async (token, statusFilter = '', limit = null) => {
  try {
    const params = [];
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (limit) params.push(`limit=${encodeURIComponent(limit)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    const url = `${API_BASE_URL}/service-requests/my-requests${qs}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    console.error('getMyRequestsApi error:', error);
    return { success: false, message: error.message || 'Network connection error' };
  }
};

export const getServiceRequestByIdApi = async (requestId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('@user_jwt_token');
    const res = await fetch(`${API_BASE_URL}/service-requests/${requestId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('getServiceRequestByIdApi error:', error);
    return { success: false, message: error.message };
  }
};

export const getOffersByRequestIdApi = async (requestId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('@user_jwt_token');
    const res = await fetch(`${API_BASE_URL}/offers/request/${requestId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('getOffersByRequestIdApi error:', error);
    return { success: false, message: error.message };
  }
};

export const acceptOfferApi = async (offerId) => {
  try {
    const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('@user_jwt_token');
    const res = await fetch(`${API_BASE_URL}/offers/${offerId}/accept`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('acceptOfferApi error:', error);
    return { success: false, message: error.message };
  }
};

// -------------------------------------------------------------
// VENDOR API METHODS
// -------------------------------------------------------------

/**
 * Available Live Leads in Vendor's Category and Pincodes
 */
export const getAvailableRequestsApi = async (token, category) => {
  try {
    const url = category
      ? `${API_BASE_URL}/service-requests/available?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/service-requests/available`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('getAvailableRequestsApi error:', error);
    return { success: false, message: error.message || 'Network error fetching available leads' };
  }
};

/**
 * Assigned Jobs to Vendor
 */
export const getAssignedRequestsApi = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/service-requests/assigned`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('getAssignedRequestsApi error:', error);
    return { success: false, message: error.message || 'Network error fetching assigned jobs' };
  }
};

/**
 * Submit Bid / Quote on Service Request
 */
export const submitOfferApi = async (token, offerData) => {
  try {
    const payload = {
      serviceRequest: offerData.serviceRequest || offerData.serviceRequestId,
      serviceRequestId: offerData.serviceRequestId || offerData.serviceRequest,
      bidAmount: offerData.bidAmount !== undefined ? offerData.bidAmount : offerData.price,
      price: offerData.price !== undefined ? offerData.price : offerData.bidAmount,
      estimatedTime: offerData.estimatedTime || offerData.estimatedArrivalTime,
      estimatedArrivalTime: offerData.estimatedArrivalTime || offerData.estimatedTime,
      message: offerData.message || '',
    };
    const res = await fetch(`${API_BASE_URL}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error('submitOfferApi error:', error);
    return { success: false, message: error.message || 'Network error submitting offer' };
  }
};

/**
 * Get Vendor's Submitted Bids
 */
export const getMyBidsApi = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/offers/my-bids`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
  } catch (error) {
    console.error('getMyBidsApi error:', error);
    return { success: false, message: error.message || 'Network error fetching bids' };
  }
};

/**
 * Verify Doorstep 4-digit OTP to start service job
 */
export const verifyStartOtpApi = async (token, requestId, otp) => {
  try {
    const res = await fetch(`${API_BASE_URL}/service-requests/${requestId}/verify-start-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ otp }),
    });
    return await res.json();
  } catch (error) {
    console.error('verifyStartOtpApi error:', error);
    return { success: false, message: error.message || 'Network error verifying start OTP' };
  }
};

/**
 * Complete Service Job
 */
export const completeServiceRequestApi = async (token, requestId, finalAmount, paymentMode = 'Cash') => {
  try {
    const res = await fetch(`${API_BASE_URL}/service-requests/${requestId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ finalAmount, paymentMode }),
    });
    return await res.json();
  } catch (error) {
    console.error('completeServiceRequestApi error:', error);
    return { success: false, message: error.message || 'Network error completing job' };
  }
};

/**
 * Update Vendor Profile (Pincodes, visiting charge, UPI, online status)
 */
export const updateVendorProfileApi = async (token, data) => {
  try {
    const res = await fetch(`${API_BASE_URL}/vendor/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error('updateVendorProfileApi error:', error);
    return { success: false, message: error.message || 'Network error updating vendor profile' };
  }
};

/**
 * Address Management APIs
 */
export const getSavedAddressesApi = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/addresses`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return await res.json();
  } catch (error) {
    console.error('getSavedAddressesApi error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
};

export const addSavedAddressApi = async (token, addressData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    });
    return await res.json();
  } catch (error) {
    console.error('addSavedAddressApi error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
};

export const updateSavedAddressApi = async (token, id, addressData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/addresses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(addressData),
    });
    return await res.json();
  } catch (error) {
    console.error('updateSavedAddressApi error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
};

export const deleteSavedAddressApi = async (token, id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return await res.json();
  } catch (error) {
    console.error('deleteSavedAddressApi error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
};

export const setDefaultAddressApi = async (token, id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/addresses/${id}/default`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return await res.json();
  } catch (error) {
    console.error('setDefaultAddressApi error:', error);
    return { success: false, message: error.message || 'Network error' };
  }
};

/**
 * Chat APIs
 */
export const getChatMessagesApi = async (token, serviceRequestId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/${serviceRequestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    console.error('getChatMessagesApi error:', error);
    return { success: false, message: error.message || 'Network error fetching chat' };
  }
};

export const sendChatMessageApi = async (token, serviceRequestId, text) => {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/${serviceRequestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    return await res.json();
  } catch (error) {
    console.error('sendChatMessageApi error:', error);
    return { success: false, message: error.message || 'Network error sending message' };
  }
};

export const getUnreadChatCountApi = async (token, serviceRequestId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/${serviceRequestId}/unread`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, unreadCount: 0 };
  }
};

export const markChatReadApi = async (token, serviceRequestId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/${serviceRequestId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    console.error('markChatReadApi error:', error);
    return { success: false };
  }
};

/**
 * Invoice & Review APIs
 */
export const getServiceRequestInvoiceApi = async (token, requestId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/service-requests/${requestId}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    console.error('getServiceRequestInvoiceApi error:', error);
    return { success: false, message: error.message || 'Error fetching invoice' };
  }
};

export const submitServiceRequestReviewApi = async (token, requestId, { rating, comment }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/service-requests/${requestId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment }),
    });
    return await res.json();
  } catch (error) {
    console.error('submitServiceRequestReviewApi error:', error);
    return { success: false, message: error.message || 'Error submitting review' };
  }
};




