import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    bidAmount: {
      type: Number,
      required: true,
    },
    estimatedTime: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// A vendor can only submit one offer per request
offerSchema.index({ serviceRequest: 1, vendor: 1 }, { unique: true });

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
