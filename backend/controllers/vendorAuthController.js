import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Send OTP to Vendor for Login/Signup
 * @route   POST /api/vendor/auth/send-otp
 * @access  Public
 */
export const sendVendorOtp = async (req, res) => {
  try {
    const { mobileNumber, type } = req.body;

    if (!mobileNumber || mobileNumber.length < 10) {
      return res.status(400).json({ success: false, message: 'Valid mobile number is required' });
    }

    const vendor = await Vendor.findOne({ mobileNumber });

    if (type === 'login' && !vendor) {
      return res.status(404).json({ success: false, message: 'No vendor account found with this number. Please sign up.' });
    }

    if (type === 'signup' && vendor) {
      return res.status(400).json({ success: false, message: 'Account already exists. Please log in.' });
    }

    // In a real app, integrate SMS provider (Twilio, MSG91, AWS SNS) here
    // Using a static/test OTP for development
    const otp = '123456'; 

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      otp, // Test environment only - normally we do not return OTP in response
    });
  } catch (error) {
    console.error('Send Vendor OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

/**
 * @desc    Verify OTP for Vendor Login/Signup
 * @route   POST /api/vendor/auth/verify-otp
 * @access  Public
 */
export const verifyVendorOtp = async (req, res) => {
  try {
    const { mobileNumber, otp, name, email, businessName, category, subServices, experienceYears, pincodes, address, serviceRadiusKm } = req.body;

    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    let vendor = await Vendor.findOne({ mobileNumber });

    if (!vendor) {
      // Must be a signup flow
      vendor = await Vendor.create({
        mobileNumber,
        name: name || 'Vendor Partner',
        email: email || '',
        role: 'vendor',
        businessName: businessName || '',
        category: category || '',
        subServices: subServices || [],
        experienceYears: experienceYears || '',
        pincodes: pincodes || ['395007'], 
        address: address || {},
        serviceRadiusKm: serviceRadiusKm || 10,
      });
    }

    const token = generateToken(vendor._id);

    res.status(200).json({
      success: true,
      token,
      vendor: {
        _id: vendor._id,
        name: vendor.name,
        mobileNumber: vendor.mobileNumber,
        businessName: vendor.businessName,
        category: vendor.category,
        pincodes: vendor.pincodes,
      },
    });
  } catch (error) {
    console.error('Verify Vendor OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
};

/**
 * @desc    Get Current Logged in Vendor Profile
 * @route   GET /api/vendor/auth/me
 * @access  Private (Vendor)
 */
export const getVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error('Get Vendor Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update Vendor Profile Details
 * @route   PUT /api/vendor/auth/profile
 * @access  Private (Vendor)
 */
export const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const {
      name,
      businessName,
      email,
      category,
      subServices,
      experienceYears,
      pincodes,
      baseVisitingCharge,
      upiId,
      serviceRadiusKm,
      gstNumber,
      ownerName,
      alternatePhone,
      bio,
      registrationType,
      yearEstablished,
      customRates,
      branchAddresses,
      kycDocuments,
      address,
      isOnline,
    } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (name !== undefined) vendor.name = name.trim();
    if (businessName !== undefined) vendor.businessName = businessName.trim();
    if (email !== undefined) vendor.email = email.trim();
    if (category !== undefined) vendor.category = category.trim();
    if (subServices !== undefined && Array.isArray(subServices)) vendor.subServices = subServices;
    if (experienceYears !== undefined) vendor.experienceYears = experienceYears;
    if (isOnline !== undefined) vendor.isOnline = Boolean(isOnline);

    if (pincodes !== undefined) {
      if (!Array.isArray(pincodes) || pincodes.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one pincode is required' });
      }
      vendor.pincodes = pincodes;
    }

    if (baseVisitingCharge !== undefined) {
      vendor.baseVisitingCharge = Number(baseVisitingCharge);
    }

    if (upiId !== undefined) {
      vendor.upiId = upiId.trim();
    }

    if (serviceRadiusKm !== undefined) {
      vendor.serviceRadiusKm = Number(serviceRadiusKm);
    }

    if (gstNumber !== undefined) vendor.gstNumber = gstNumber.trim();
    if (ownerName !== undefined) vendor.ownerName = ownerName.trim();
    if (alternatePhone !== undefined) vendor.alternatePhone = alternatePhone.trim();
    if (bio !== undefined) vendor.bio = bio.trim();
    if (registrationType !== undefined) vendor.registrationType = registrationType;
    if (yearEstablished !== undefined) vendor.yearEstablished = yearEstablished;

    if (customRates !== undefined && typeof customRates === 'object') {
      vendor.customRates = {
        ...vendor.customRates,
        ...customRates,
      };
    }

    if (branchAddresses !== undefined && Array.isArray(branchAddresses)) {
      vendor.branchAddresses = branchAddresses;
    }

    if (kycDocuments !== undefined && typeof kycDocuments === 'object') {
      vendor.kycDocuments = {
        ...vendor.kycDocuments,
        ...kycDocuments,
      };
    }

    if (category !== undefined && typeof category === 'string' && category.trim()) {
      vendor.category = category.trim();
    }

    if (address !== undefined && typeof address === 'object') {
      const existingLoc = vendor.address?.location?.coordinates
        ? { type: 'Point', coordinates: vendor.address.location.coordinates }
        : { type: 'Point', coordinates: [0, 0] };

      const safeLocation = (address.location && Array.isArray(address.location.coordinates))
        ? { type: 'Point', coordinates: address.location.coordinates }
        : existingLoc;

      vendor.address = {
        street: address.street !== undefined ? address.street : (vendor.address?.street || ''),
        area: address.area !== undefined ? address.area : (vendor.address?.area || ''),
        city: address.city !== undefined ? address.city : (vendor.address?.city || ''),
        pincode: address.pincode !== undefined ? address.pincode : (vendor.address?.pincode || ''),
        location: safeLocation,
      };
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      vendor,
    });

  } catch (error) {
    console.error('Error in updateVendorProfile:', error);
    return res.status(500).json({ success: false, message: 'Server error updating vendor profile' });
  }
};
