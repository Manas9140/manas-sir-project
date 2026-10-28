import Offer from '../models/Offer.js';
import ServiceRequest from '../models/ServiceRequest.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';

/**
 * @desc    Get all offers for a specific service request
 * @route   GET /api/offers/request/:requestId
 * @access  Private
 */
export const getOffersByRequestId = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Verify request exists
    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    // Check if user owns the request (optional but good practice)
    // if (request.user.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ success: false, message: 'Unauthorized' });
    // }

    const offers = await Offer.find({ serviceRequest: requestId })
      .populate('vendor', 'name businessName ownerName rating completedJobsCount profileImage mobileNumber')
      .sort({ bidAmount: 1, createdAt: -1 });

    res.status(200).json({ success: true, count: offers.length, data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

/**
 * @desc    Accept an offer for a service request
 * @route   PUT /api/offers/:offerId/accept
 * @access  Private
 */
export const acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user._id;

    // 1. Find the offer
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // 2. Find the associated service request
    const serviceRequest = await ServiceRequest.findById(offer.serviceRequest);
    if (!serviceRequest) {
      return res.status(404).json({ success: false, message: 'Service request not found' });
    }

    // 3. Ensure the requesting user owns the service request
    if (serviceRequest.customer.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to accept this offer' });
    }

    // 4. Atomic check: Ensure request is still pending
    if (serviceRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Offer already accepted for this request' });
    }

    // 5. Update the selected offer to 'accepted'
    offer.status = 'accepted';
    await offer.save();

    // 6. Bulk update all other offers for this request to 'rejected'
    await Offer.updateMany(
      { serviceRequest: serviceRequest._id, _id: { $ne: offer._id } },
      { $set: { status: 'rejected' } }
    );

    // 7. Update the service request
    serviceRequest.status = 'accepted';
    serviceRequest.assignedVendor = offer.vendor;
    serviceRequest.finalAmount = offer.bidAmount;
    await serviceRequest.save();

    // 8. Socket Notifications
    const io = req.app.get('socketio');
    if (io) {
      // Notify customer (in case they are listening on another device/screen)
      io.to(`request_${serviceRequest._id}`).emit('offerAccepted', { 
        offerId: offer._id, 
        assignedVendor: offer.vendor 
      });
      
      // Notify the winning vendor
      io.to(`vendor_${offer.vendor}`).emit('bidAccepted', { 
        requestId: serviceRequest._id, 
        offerId: offer._id 
      });
      
      // Notify all other vendors that they lost (broadcast to pincode room or specific vendor rooms)
      // They can listen to requestUpdated event
      io.to(`pincode_${serviceRequest.address.pincode}`).emit('requestUpdated', {
        requestId: serviceRequest._id,
        status: 'accepted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer accepted successfully',
      data: serviceRequest
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ success: false, message: 'Failed to accept offer' });
  }
};

/**
 * @desc    Submit a new bid for a service request
 * @route   POST /api/offers
 * @access  Private (Vendor only)
 */
export const submitOffer = async (req, res) => {
  try {
    const serviceRequestId = req.body.serviceRequest || req.body.serviceRequestId;
    const rawBid = req.body.bidAmount !== undefined ? req.body.bidAmount : req.body.price;
    const bidAmount = Number(rawBid);
    const estimatedTime = req.body.estimatedTime || req.body.estimatedArrivalTime || '';
    const message = req.body.message || '';
    const vendorId = req.vendor?._id || req.user?._id;

    if (!serviceRequestId) {
      return res.status(400).json({ success: false, message: 'Service request ID is required' });
    }

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid bid amount is required' });
    }

    if (!vendorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized vendor' });
    }

    // Ensure the service request exists and is pending
    const request = await ServiceRequest.findById(serviceRequestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid or closed service request' });
    }

    const offer = await Offer.findOneAndUpdate(
      { serviceRequest: serviceRequestId, vendor: vendorId },
      {
        bidAmount,
        estimatedTime,
        message: message.trim(),
        status: 'pending',
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('vendor', 'name businessName ownerName rating completedJobsCount mobileNumber profileImage');

    const io = req.app.get('socketio');
    if (io) {
      io.to(`request_${serviceRequestId}`).emit('newOffer', offer);
      if (request.customer) {
        io.to(`user_${request.customer}`).emit('newOffer', offer);
      }
    }

    return res.status(201).json({ success: true, message: 'Bid submitted successfully', offer });
  } catch (error) {
    console.error('Error submitting offer:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit bid' });
  }
};

/**
 * @desc    Get all bids submitted by the logged-in vendor
 * @route   GET /api/offers/my-bids
 * @access  Private (Vendor only)
 */
export const getMyBids = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || req.user?._id;
    const offers = await Offer.find({ vendor: vendorId })
      .populate('serviceRequest')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error('Error fetching vendor bids:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch your bids' });
  }
};
