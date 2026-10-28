import express from 'express';
import {
  sendOtp,
  verifyOtp,
  onboardVendor,
  switchMode,
  updateLocation,
  updateProfileImage,
  getMe,
  getSavedAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultAddress,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../utils/cloudinaryUpload.js';

const router = express.Router();

// Public routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/vendor/onboard', onboardVendor);

// Protected routes
router.post('/switch-mode', protect, switchMode);
router.post('/location', protect, updateLocation);
router.put('/profile-image', protect, uploadMiddleware.single('avatar'), updateProfileImage);
router.get('/me', protect, getMe);

// Address Management routes
router.get('/addresses', protect, getSavedAddresses);
router.post('/addresses', protect, addSavedAddress);
router.put('/addresses/:id', protect, updateSavedAddress);
router.delete('/addresses/:id', protect, deleteSavedAddress);
router.post('/addresses/:id/default', protect, setDefaultAddress);

export default router;
