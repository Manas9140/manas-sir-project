import ServiceRequest from '../models/ServiceRequest.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

/**
 * @desc    Create a new Service Request & Broadcast to vendors in pincode via Socket.IO
 * @route   POST /api/service-requests
 * @access  Private (User)
 */
export const createServiceRequest = async (req, res) => {
  try {
    // Parse body parameters (supports both JSON and multipart form data fields)
    let { category, subCategory, title, description, images, schedule, address } = req.body;

    if (typeof schedule === 'string') {
      try { schedule = JSON.parse(schedule); } catch (e) {}
    }
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch (e) {}
    }

    if (!category || !description) {
      return res.status(400).json({ success: false, message: 'Category and description are required' });
    }

    if (!schedule || !schedule.date || !schedule.timeSlot) {
      return res.status(400).json({ success: false, message: 'Schedule date and time slot are required' });
    }

    const streetVal = address?.street || address?.houseNo || address?.formattedAddress || '';
    const cityVal = address?.city || address?.state || '';
    const pincodeVal = address?.pincode || address?.zipCode || '400001';

    if (!streetVal || !cityVal || !pincodeVal) {
      return res.status(400).json({ success: false, message: 'Address street, city, and pincode are required' });
    }

    // Process memory buffer file uploads with Cloudinary streamifier helper
    let requestImages = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadBufferToCloudinary(file.buffer, 'local_vendor/requests')
      );
      requestImages = await Promise.all(uploadPromises);
    } else if (images && Array.isArray(images)) {
      requestImages = images;
    }

    const newRequest = new ServiceRequest({
      customer: req.user._id,
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : '',
      title: title ? title.trim() : `${category.trim()} Service Request`,
      description: description.trim(),
      images: requestImages,
      schedule: {
        date: schedule.date,
        timeSlot: schedule.timeSlot,
      },
      address: {
        label: address.label || 'Home',
        street: streetVal,
        city: cityVal,
        pincode: pincodeVal,
        location: {
          type: 'Point',
          coordinates: address.location && address.location.coordinates 
            ? address.location.coordinates 
            : (req.user.location && req.user.location.coordinates ? req.user.location.coordinates : [0, 0]),
        },
      },
      status: 'pending',
    });

    await newRequest.save();

    // Populate user info for broadcasting
    const populatedRequest = await ServiceRequest.findById(newRequest._id).populate('customer', 'name phone location');

    // Broadcast WebSocket event to pincode room, city room, and global socket
    const io = req.app.get('socketio');
    if (io) {
      const roomName = `pincode_${newRequest.address.pincode}`;
      const cityClean = (newRequest.address.city || '').split(',')[0].trim();
      const cityRoom = `city_${cityClean}`;

      io.to(roomName).emit('newServiceRequest', populatedRequest);
      if (cityClean) {
        io.to(cityRoom).emit('newServiceRequest', populatedRequest);
      }
      // Also broadcast directly so any connected vendor socket can receive and filter
      io.emit('newServiceRequest', populatedRequest);
      console.log(`[Socket.IO] Broadcasted newServiceRequest ${newRequest._id} to room: ${roomName}, ${cityRoom}, and all`);
    }

    return res.status(201).json({
      success: true,
      message: 'Request created and broadcasted successfully',
      request: populatedRequest,
    });
  } catch (error) {
    console.error('Error in createServiceRequest:', error);
    return res.status(500).json({ success: false, message: 'Server error while creating service request' });
  }
};

/**
 * @desc    Get all service requests created by the authenticated user with optional status filter (?status=active vs ?status=completed)
 * @route   GET /api/service-requests/my-requests
 * @access  Private (User)
 */
export const getMyRequests = async (req, res) => {
  try {
    const { status, limit } = req.query;
    let filter = { customer: req.user._id };

    if (status === 'active') {
      filter.status = { $in: ['pending', 'accepted', 'in_progress', 'work_started'] };
    } else if (status === 'completed') {
      filter.status = { $in: ['completed', 'cancelled'] };
    } else if (status) {
      filter.status = status;
    }

    let query = ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('assignedVendor', 'name businessName ownerName phone mobileNumber rating profilePic');

    if (limit) {
      query = query.limit(Number(limit));
    }

    const requests = await query;

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error in getMyRequests:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user requests' });
  }
};

/**
 * @desc    Get single service request details by ID
 * @route   GET /api/service-requests/:id
 * @access  Private (User)
 */
export const getServiceRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('assignedVendor', 'name businessName ownerName phone mobileNumber rating profilePic');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    // Verify ownership or vendor authorization
    const customerIdStr = request.customer?._id ? request.customer._id.toString() : request.customer?.toString();
    const assignedVendorIdStr = request.assignedVendor?._id ? request.assignedVendor._id.toString() : request.assignedVendor?.toString();
    const currentUserIdStr = (req.user?._id || req.vendor?._id || '').toString();

    const isCustomer = customerIdStr && customerIdStr === currentUserIdStr;
    const isAssignedVendor = assignedVendorIdStr && assignedVendorIdStr === currentUserIdStr;
    const isVendorRole = req.user?.role === 'vendor' || !!req.vendor;

    if (!isCustomer && !isAssignedVendor && !isVendorRole) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this request' });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    console.error('Error in getServiceRequestById:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching request details' });
  }
};

/**
 * Helper to build regex for category matching across variations
 * (e.g. Electrician <-> Electrical, Appliance <-> Appliance Repair, etc.)
 */
const getCategoryRegex = (category) => {
  if (!category) return /.*/;
  const cat = category.toLowerCase().trim();
  if (cat.includes('electr')) return /electric/i;
  if (cat.includes('plumb')) return /plumb/i;
  if (cat.includes('ac ') || cat.includes('air condition')) return /ac /i;
  if (cat.includes('clean') || cat.includes('sanit')) return /(clean|sanit)/i;
  if (cat.includes('appliance') || cat.includes('refrigerat') || cat.includes('washing') || cat.includes('purifier') || cat.includes('stove')) {
    return /(appliance|refrigerat|washing|purifier|stove)/i;
  }
  if (cat.includes('carpent') || cat.includes('wood')) return /(carpent|wood)/i;
  if (cat.includes('paint')) return /paint/i;
  if (cat.includes('pest')) return /pest/i;
  return new RegExp(category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
};

/**
 * @desc    Get available service requests matching vendor's pincodes, city, and category
 * @route   GET /api/service-requests/available
 * @access  Private (Vendor)
 */
export const getAvailableRequests = async (req, res) => {
  try {
    const vendor = req.vendor; // Populated by protectVendor middleware
    const { category: reqCategory } = req.query;

    const pincodes = Array.isArray(vendor.pincodes)
      ? vendor.pincodes.map(p => String(p).trim()).filter(Boolean)
      : [];
      
    const vendorCity = (vendor.address?.city || vendor.city || '').trim();
    
    const locationConditions = [];
    if (pincodes.length > 0) {
      locationConditions.push({ 'address.pincode': { $in: pincodes } });
      const prefixes = [...new Set(pincodes.map(p => p.slice(0, 3)).filter(p => p.length === 3))];
      if (prefixes.length > 0) {
        locationConditions.push({ 'address.pincode': new RegExp(`^(${prefixes.join('|')})`) });
      }
    }
    if (vendorCity) {
      locationConditions.push({ 'address.city': new RegExp(vendorCity, 'i') });
    }

    const filter = {
      status: 'pending',
    };

    if (locationConditions.length > 0) {
      filter.$or = locationConditions;
    }

    // Handle category filtering
    const activeCategory = (reqCategory || '').trim();
    if (activeCategory && activeCategory.toLowerCase() !== 'all') {
      filter.category = getCategoryRegex(activeCategory);
    } else if (!activeCategory && vendor.category) {
      filter.category = getCategoryRegex(vendor.category);
    }
    
    // Find requests matching category and location
    let requests = await ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('customer', 'name profileImage phone');

    // Smart Fallback: If 0 requests matched vendor's strict category,
    // fetch all open pending requests in vendor's operating pincodes/city
    if (requests.length === 0 && !activeCategory && locationConditions.length > 0) {
      const areaFilter = {
        status: 'pending',
        $or: locationConditions,
      };
      requests = await ServiceRequest.find(areaFilter)
        .sort({ createdAt: -1 })
        .populate('customer', 'name profileImage phone');
    }
    
    return res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Error in getAvailableRequests:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching available requests' });
  }
};

/**
 * Helper to resolve all vendor IDs associated with this partner
 */
const getVendorIdsForPartner = async (partner) => {
  if (!partner) return [];
  const ids = [partner._id];
  const phone = partner.mobileNumber || partner.phone;
  if (phone) {
    const rawDigits = String(phone).replace(/\D/g, '');
    const local10 = rawDigits.slice(-10);
    const phoneVariants = [phone, local10, `+91${local10}`];
    const linkedVendors = await Vendor.find({ mobileNumber: { $in: phoneVariants } }, '_id');
    linkedVendors.forEach((v) => {
      if (!ids.some((id) => id.toString() === v._id.toString())) {
        ids.push(v._id);
      }
    });
  }
  return ids;
};

/**
 * @desc    Get service requests assigned to the vendor
 * @route   GET /api/service-requests/assigned
 * @access  Private (Vendor)
 */
export const getAssignedRequests = async (req, res) => {
  try {
    const vendor = req.vendor || req.user;
    if (!vendor) {
      return res.status(401).json({ success: false, message: 'Vendor not identified' });
    }

    const targetVendorIds = await getVendorIdsForPartner(vendor);

    // Filter statuses: allow query parameter or default to all assigned lifecycle statuses
    const allowedStatuses = ['accepted', 'in_progress', 'work_started', 'completed'];
    const queryStatus = req.query.status;
    const statusFilter = (queryStatus && allowedStatuses.includes(queryStatus))
      ? queryStatus
      : { $in: allowedStatuses };

    const requests = await ServiceRequest.find({
      assignedVendor: { $in: targetVendorIds },
      status: statusFilter,
    })
      .sort({ createdAt: -1 })
      .populate('customer', 'name phone location address profileImage');

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error in getAssignedRequests:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching assigned requests' });
  }
};

/**
 * @desc    Verify Doorstep 4-Digit OTP to start job
 * @route   POST /api/service-requests/:id/verify-start-otp
 * @route   PUT /api/service-requests/:id/verify-start-otp
 * @access  Private (Vendor)
 */
export const verifyStartOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const partner = req.vendor || req.user;
    const targetVendorIds = await getVendorIdsForPartner(partner);

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    // Validate vendor assignment
    if (request.assignedVendor && !targetVendorIds.some((vid) => vid.toString() === request.assignedVendor.toString())) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this service request' });
    }

    if (request.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Service job is already completed' });
    }

    const incomingOtp = String(otp || '').trim();
    const storedOtp = String(request.startOtp || '').trim();

    // Verify OTP against stored OTP (or master default if not yet initialized)
    if (!incomingOtp || (incomingOtp !== storedOtp && storedOtp !== '')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start OTP. Please verify with customer.',
      });
    }

    // Success handshake
    request.status = 'work_started';
    request.workStartedAt = new Date();
    await request.save();

    // Broadcast real-time status update to customer and socket listeners
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.to(`request_${id}`).emit('jobStatusUpdated', {
        serviceRequestId: id,
        status: 'work_started',
        workStartedAt: request.workStartedAt,
      });
      io.to(`chat_${id}`).emit('jobStatusUpdated', {
        serviceRequestId: id,
        status: 'work_started',
        workStartedAt: request.workStartedAt,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Work started.',
      status: 'work_started',
      request,
    });
  } catch (error) {
    console.error('Error in verifyStartOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying start OTP' });
  }
};

/**
 * @desc    Complete job by vendor with final amount & payment mode
 * @route   POST /api/service-requests/:id/complete
 * @route   PUT /api/service-requests/:id/complete
 * @access  Private (Vendor)
 */
export const completeServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalAmount, paymentMode = 'Cash' } = req.body;
    const partner = req.vendor || req.user;
    const targetVendorIds = await getVendorIdsForPartner(partner);

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    // Validate vendor assignment
    if (request.assignedVendor && !targetVendorIds.some((vid) => vid.toString() === request.assignedVendor.toString())) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this service request' });
    }

    // Validate current progress status
    if (request.status !== 'work_started' && request.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot complete a request that is not in progress or work started',
      });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    if (finalAmount !== undefined && finalAmount !== null && finalAmount !== '') {
      request.finalAmount = Number(finalAmount);
    }
    if (paymentMode) {
      request.paymentMode = paymentMode;
    }
    await request.save();

    // Broadcast real-time status update to customer and socket listeners
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.to(`request_${id}`).emit('jobStatusUpdated', {
        serviceRequestId: id,
        status: 'completed',
        completedAt: request.completedAt,
        finalAmount: request.finalAmount,
        paymentMode: request.paymentMode,
      });
      io.to(`chat_${id}`).emit('jobStatusUpdated', {
        serviceRequestId: id,
        status: 'completed',
        completedAt: request.completedAt,
        finalAmount: request.finalAmount,
        paymentMode: request.paymentMode,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job completed successfully',
      status: 'completed',
      request,
    });
  } catch (error) {
    console.error('Error in completeServiceRequest:', error);
    return res.status(500).json({ success: false, message: 'Server error completing service request' });
  }
};

/**
 * @desc    Get Digital Invoice for a completed Service Request
 * @route   GET /api/service-requests/:id/invoice
 * @access  Private (User or Vendor)
 */
export const getServiceRequestInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ServiceRequest.findById(id)
      .populate('customer', 'name mobileNumber phone address')
      .populate('assignedVendor', 'name businessName category mobileNumber phone rating profileImage')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is only available for completed service requests',
      });
    }

    const visitingFee = 150;
    const finalAmount = Number(request.finalAmount) || visitingFee;
    const serviceAndLabor = Math.max(0, finalAmount - visitingFee);

    const invoice = {
      invoiceNumber: `INV-${request._id.toString().slice(-6).toUpperCase()}`,
      date: request.completedAt || request.updatedAt,
      customer: {
        name: request.customer?.name || 'Customer',
        mobileNumber: request.customer?.mobileNumber || request.customer?.phone || '',
        address: [request.address?.street, request.address?.city, request.address?.pincode].filter(Boolean).join(', '),
      },
      vendor: {
        name: request.assignedVendor?.name || request.assignedVendor?.businessName || 'Service Partner',
        businessName: request.assignedVendor?.businessName || 'Verified Pro',
        category: request.category,
        mobileNumber: request.assignedVendor?.mobileNumber || request.assignedVendor?.phone || '',
      },
      serviceDetails: {
        title: request.title || `${request.category} Service`,
        category: request.category,
        workDate: request.schedule?.date || request.createdAt,
      },
      payment: {
        finalAmount,
        paymentMode: request.paymentMode || 'Cash',
        paymentStatus: 'PAID',
        breakdown: {
          visitingFee,
          serviceAndLabor,
          taxAndCharges: 0,
          total: finalAmount,
        },
      },
    };

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Error in getServiceRequestInvoice:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving invoice' });
  }
};

/**
 * @desc    Submit rating and review for a completed service request
 * @route   POST /api/service-requests/:id/review
 * @access  Private (User)
 */
export const submitServiceRequestReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment = '', reviewText = '', feedbackChips = [] } = req.body;

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
    }

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed service requests' });
    }

    // Customer ownership verification
    if (req.user?._id && request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to review this service' });
    }

    const finalComment = (comment || reviewText || '').trim();
    request.review = {
      rating: numericRating,
      comment: finalComment,
      feedbackChips: Array.isArray(feedbackChips) ? feedbackChips : [],
      createdAt: new Date(),
    };
    request.reviewSubmitted = true;
    await request.save();


    // Recalculate assigned vendor rating
    let newVendorRating = 5.0;
    if (request.assignedVendor) {
      const reviewedJobs = await ServiceRequest.find({
        assignedVendor: request.assignedVendor,
        'review.rating': { $exists: true, $ne: null },
      }).select('review.rating');

      if (reviewedJobs.length > 0) {
        const totalStars = reviewedJobs.reduce((sum, j) => sum + (Number(j.review?.rating) || 0), 0);
        newVendorRating = Number((totalStars / reviewedJobs.length).toFixed(1));
      } else {
        newVendorRating = numericRating;
      }

      await Vendor.findByIdAndUpdate(request.assignedVendor, {
        rating: newVendorRating,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      review: request.review,
      vendorRating: newVendorRating,
    });
  } catch (error) {
    console.error('Error in submitServiceRequestReview:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting review' });
  }
};

