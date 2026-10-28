import express from 'express';
import {
  createServiceRequest,
  getMyRequests,
  getServiceRequestById,
  getAvailableRequests,
  getAssignedRequests,
  verifyStartOtp,
  completeServiceRequest,
  getServiceRequestInvoice,
  submitServiceRequestReview,
} from '../controllers/serviceRequestController.js';
import { protect, protectVendor } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../utils/cloudinaryUpload.js';

const router = express.Router();

// Customer routes
router.post('/', protect, uploadMiddleware.array('images', 5), createServiceRequest);
router.get('/my-requests', protect, getMyRequests);

// Vendor routes
router.get('/available', protectVendor, getAvailableRequests);
router.get('/assigned', protectVendor, getAssignedRequests);
router.route('/:id/verify-start-otp')
  .post(protectVendor, verifyStartOtp)
  .put(protectVendor, verifyStartOtp);
router.route('/:id/complete')
  .post(protectVendor, completeServiceRequest)
  .put(protectVendor, completeServiceRequest);

// Invoice and review routes (before /:id)
router.get('/:id/invoice', protect, getServiceRequestInvoice);
router.post('/:id/review', protect, submitServiceRequestReview);

// Dynamic parameter route must be last
router.get('/:id', protect, getServiceRequestById);

export default router;

