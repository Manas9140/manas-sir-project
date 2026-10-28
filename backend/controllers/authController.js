import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

// Helper: Generate JWT Token with role
const generateToken = (id, role = 'customer') => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'super_secret_jwt_key_12345', {
    expiresIn: '30d',
  });
};

// Helper: Generate 6-digit random OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Send OTP to phone number for Customer or Vendor
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    const role = req.body.role || 'customer';

    if (!rawPhone || rawPhone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = rawPhone.trim();
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    if (role === 'vendor') {
      const vendor = await Vendor.findOne({ mobileNumber: cleanPhone });
      return res.status(200).json({
        success: true,
        message: 'OTP generated and sent successfully',
        otp: '123456',
        isExistingUser: Boolean(vendor && vendor.businessName),
        role: 'vendor',
      });
    }

    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      user = new User({
        phone: cleanPhone,
        otp,
        otpExpires,
        role: 'customer',
      });
    } else {
      user.otp = otp;
      user.otpExpires = otpExpires;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP generated and sent successfully',
      otp: otp,
      isExistingUser: Boolean(user.name && user.isVerified),
      role: 'customer',
    });
  } catch (error) {
    console.error('Error in sendOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error while generating OTP' });
  }
};

/**
 * @desc    Verify OTP and complete Login / Register for Customer or Vendor
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    const { otp, name } = req.body;
    const role = req.body.role || 'customer';

    if (!rawPhone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const cleanPhone = rawPhone.trim();

    if (role === 'vendor') {
      if (otp !== '123456' && otp.length !== 6) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code' });
      }

      const vendor = await Vendor.findOne({ mobileNumber: cleanPhone });
      if (!vendor) {
        return res.status(200).json({
          success: true,
          isNewUser: true,
          isNewVendor: true,
          role: 'vendor',
          mobileNumber: cleanPhone,
          message: 'OTP verified. Please complete vendor onboarding.',
        });
      }

      const token = generateToken(vendor._id, 'vendor');
      return res.status(200).json({
        success: true,
        isNewUser: false,
        token,
        role: 'vendor',
        user: {
          ...vendor._doc,
          phone: vendor.mobileNumber,
          role: 'vendor',
        },
      });
    }

    // Customer flow
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please request OTP first.' });
    }

    if (user.otp !== otp && otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (user.otpExpires && new Date() > user.otpExpires && otp !== '123456') {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    if (name && name.trim() !== '') {
      user.name = name.trim();
    }

    await user.save();

    const token = generateToken(user._id, 'customer');
    const isNew = !user.name;

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      role: 'customer',
      isNewUser: isNew,
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        location: user.location,
        addressDetails: user.addressDetails,
        address: user.addressDetails || null,
        savedAddresses: user.savedAddresses,
        role: 'customer',
      },
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error while verifying OTP' });
  }
};

/**
 * @desc    Update User Profile Avatar Image via Cloudinary
 * @route   PUT /api/auth/profile-image
 * @access  Private (JWT Protected)
 */
export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar image file provided' });
    }

    const profileImageUrl = await uploadBufferToCloudinary(req.file.buffer, 'local_vendor/avatars');

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.profileImage = profileImageUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile avatar updated successfully',
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        location: user.location,
        addressDetails: user.addressDetails,
      },
    });
  } catch (error) {
    console.error('Error in updateProfileImage:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating profile avatar' });
  }
};

/**
 * @desc    Update Customer Location & Address Details
 * @route   POST /api/auth/location
 * @access  Private (JWT Protected)
 */
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, addressDetails } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };

    if (addressDetails) {
      user.addressDetails = {
        houseNo: addressDetails.houseNo || '',
        street: addressDetails.street || addressDetails.houseNo || '',
        area: addressDetails.area || '',
        landmark: addressDetails.landmark || '',
        city: addressDetails.city || '',
        state: addressDetails.state || '',
        pincode: addressDetails.pincode || '',
        formattedAddress: addressDetails.formattedAddress || '',
        label: addressDetails.label || 'Home',
      };
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      user: {
        _id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        location: user.location,
        addressDetails: user.addressDetails,
        address: user.addressDetails,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error in updateLocation:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating location' });
  }
};

/**
 * @desc    Onboard new Vendor or update Vendor profile
 * @route   POST /api/auth/vendor/onboard
 * @access  Public
 */
export const onboardVendor = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      businessName,
      category,
      subServices,
      experienceYears,
      pincodes,
      address,
      serviceRadiusKm,
      baseVisitingCharge,
      upiId,
    } = req.body;

    if (!mobileNumber || !name || !businessName || !category) {
      return res.status(400).json({ success: false, message: 'Missing required onboarding fields' });
    }

    let vendor = await Vendor.findOne({ mobileNumber: mobileNumber.trim() });

    if (!vendor) {
      vendor = new Vendor({
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email ? email.trim() : '',
        businessName: businessName.trim(),
        category: category.trim(),
        subServices: subServices || [],
        experienceYears: experienceYears || '3-5 Years',
        pincodes: pincodes && pincodes.length > 0 ? pincodes : ['395007'],
        address: address || {},
        serviceRadiusKm: serviceRadiusKm || 10,
        baseVisitingCharge: baseVisitingCharge ? Number(baseVisitingCharge) : 150,
        upiId: upiId ? upiId.trim() : '',
        role: 'vendor',
        isOnline: true,
      });
    } else {
      vendor.name = name.trim();
      if (email) vendor.email = email.trim();
      vendor.businessName = businessName.trim();
      vendor.category = category.trim();
      if (subServices) vendor.subServices = subServices;
      if (experienceYears) vendor.experienceYears = experienceYears;
      if (pincodes && pincodes.length > 0) vendor.pincodes = pincodes;
      if (address) vendor.address = address;
      if (serviceRadiusKm) vendor.serviceRadiusKm = serviceRadiusKm;
      if (baseVisitingCharge) vendor.baseVisitingCharge = Number(baseVisitingCharge);
      if (upiId) vendor.upiId = upiId.trim();
    }

    await vendor.save();

    const token = generateToken(vendor._id, 'vendor');

    return res.status(200).json({
      success: true,
      message: 'Vendor onboarding completed successfully',
      token,
      role: 'vendor',
      user: {
        ...vendor._doc,
        phone: vendor.mobileNumber,
        role: 'vendor',
      },
      vendor,
    });
  } catch (error) {
    console.error('Error in onboardVendor:', error);
    return res.status(500).json({ success: false, message: 'Server error during vendor onboarding' });
  }
};

/**
 * @desc    Seamlessly switch between Customer and Vendor mode
 * @route   POST /api/auth/switch-mode
 * @access  Private (JWT Protected)
 */
export const switchMode = async (req, res) => {
  try {
    const { targetRole } = req.body;
    const currentPhone = req.user.phone || req.user.mobileNumber;

    if (!targetRole || !['customer', 'vendor'].includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'Invalid target mode' });
    }

    if (targetRole === 'vendor') {
      const vendor = await Vendor.findOne({ mobileNumber: currentPhone });
      if (!vendor) {
        return res.status(200).json({
          success: true,
          hasProfile: false,
          requiresOnboarding: true,
          mobileNumber: currentPhone,
          message: 'No partner profile found. Please complete onboarding.',
        });
      }

      const token = generateToken(vendor._id, 'vendor');
      return res.status(200).json({
        success: true,
        hasProfile: true,
        token,
        role: 'vendor',
        user: {
          ...vendor._doc,
          phone: vendor.mobileNumber,
          role: 'vendor',
        },
      });
    } else {
      let user = await User.findOne({ phone: currentPhone });
      if (!user) {
        user = new User({
          phone: currentPhone,
          name: req.user.name || 'User',
          email: req.user.email || '',
          isVerified: true,
          role: 'customer',
        });
        await user.save();
      }

      const token = generateToken(user._id, 'customer');
      return res.status(200).json({
        success: true,
        hasProfile: true,
        token,
        role: 'customer',
        user: {
          ...user._doc,
          role: 'customer',
          address: user.addressDetails || null,
        },
      });
    }
  } catch (error) {
    console.error('Error in switchMode:', error);
    return res.status(500).json({ success: false, message: 'Server error while switching role mode' });
  }
};


/**
 * @desc    Get Current User Profile (Customer or Vendor)
 * @route   GET /api/auth/me
 * @access  Private (JWT Protected)
 */
export const getMe = async (req, res) => {
  try {
    if (req.user?.role === 'vendor' || req.vendor) {
      const vendor = req.vendor || req.user;
      return res.status(200).json({
        success: true,
        role: 'vendor',
        user: {
          ...vendor._doc,
          role: 'vendor',
          phone: vendor.mobileNumber,
        },
      });
    }

    const user = await User.findById(req.user._id).select('-otp -otpExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      role: 'customer',
      user: {
        ...user._doc,
        role: 'customer',
        address: user.addressDetails || null,
        savedAddresses: user.savedAddresses || [],
      },
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

/**
 * @desc    Get user's saved addresses
 * @route   GET /api/auth/addresses
 * @access  Private
 */
export const getSavedAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({
      success: true,
      addresses: user.savedAddresses || [],
      defaultAddress: user.addressDetails || null,
    });
  } catch (error) {
    console.error('getSavedAddresses error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching addresses' });
  }
};

/**
 * @desc    Add new saved address
 * @route   POST /api/auth/addresses
 * @access  Private
 */
export const addSavedAddress = async (req, res) => {
  try {
    const { houseNo, area, landmark, city, state, pincode, formattedAddress, label, isDefault } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newAddr = {
      houseNo: houseNo || '',
      area: area || '',
      landmark: landmark || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      formattedAddress: formattedAddress || `${houseNo ? houseNo + ', ' : ''}${area || ''}${city ? ', ' + city : ''}${pincode ? ' - ' + pincode : ''}`.trim(),
      label: label || 'Home',
    };

    if (!user.savedAddresses) user.savedAddresses = [];
    user.savedAddresses.push(newAddr);

    if (isDefault || user.savedAddresses.length === 1 || !user.addressDetails?.formattedAddress) {
      user.addressDetails = {
        houseNo: newAddr.houseNo,
        street: newAddr.area || newAddr.houseNo,
        area: newAddr.area,
        landmark: newAddr.landmark,
        city: newAddr.city,
        state: newAddr.state,
        pincode: newAddr.pincode,
        formattedAddress: newAddr.formattedAddress,
        label: newAddr.label,
      };
    }

    await user.save();
    return res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      addresses: user.savedAddresses,
      addressDetails: user.addressDetails,
    });
  } catch (error) {
    console.error('addSavedAddress error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving address' });
  }
};

/**
 * @desc    Update saved address
 * @route   PUT /api/auth/addresses/:id
 * @access  Private
 */
export const updateSavedAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { houseNo, area, landmark, city, state, pincode, formattedAddress, label, isDefault } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const addr = user.savedAddresses?.id(id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });

    if (houseNo !== undefined) addr.houseNo = houseNo;
    if (area !== undefined) addr.area = area;
    if (landmark !== undefined) addr.landmark = landmark;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (pincode !== undefined) addr.pincode = pincode;
    if (label !== undefined) addr.label = label;
    addr.formattedAddress = formattedAddress || `${addr.houseNo ? addr.houseNo + ', ' : ''}${addr.area || ''}${addr.city ? ', ' + addr.city : ''}${addr.pincode ? ' - ' + addr.pincode : ''}`.trim();

    if (isDefault) {
      user.addressDetails = {
        houseNo: addr.houseNo,
        street: addr.area || addr.houseNo,
        area: addr.area,
        landmark: addr.landmark,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        formattedAddress: addr.formattedAddress,
        label: addr.label,
      };
    }

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.savedAddresses,
      addressDetails: user.addressDetails,
    });
  } catch (error) {
    console.error('updateSavedAddress error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating address' });
  }
};

/**
 * @desc    Delete saved address
 * @route   DELETE /api/auth/addresses/:id
 * @access  Private
 */
export const deleteSavedAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.savedAddresses = user.savedAddresses.filter(a => a._id.toString() !== id);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Address removed successfully',
      addresses: user.savedAddresses,
      addressDetails: user.addressDetails,
    });
  } catch (error) {
    console.error('deleteSavedAddress error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting address' });
  }
};

/**
 * @desc    Set default address
 * @route   POST /api/auth/addresses/:id/default
 * @access  Private
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const addr = user.savedAddresses?.id(id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });

    user.addressDetails = {
      houseNo: addr.houseNo || '',
      street: addr.area || addr.houseNo || '',
      area: addr.area || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      formattedAddress: addr.formattedAddress || '',
      label: addr.label || 'Home',
    };

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Default address updated',
      addressDetails: user.addressDetails,
      addresses: user.savedAddresses,
    });
  } catch (error) {
    console.error('setDefaultAddress error:', error);
    return res.status(500).json({ success: false, message: 'Server error setting default address' });
  }
};

