import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    profileImage: { type: String, default: '' },
    businessName: { type: String, required: true, trim: true },
    category: { type: String, required: true }, // e.g. 'Electrician', 'Plumber'
    subServices: [{ type: String }],            // e.g. ['Wiring', 'Fan Repair']
    experienceYears: { type: String, required: true }, // e.g. '3-5 Years'
    pincodes: [{ type: String, required: true }],      // e.g. ['395007', '395001']
    baseVisitingCharge: { type: Number, default: 150 },
    isOnline: { type: Boolean, default: false },
    rating: { type: Number, default: 5.0 },
    completedJobsCount: { type: Number, default: 0 },
    upiId: { type: String, default: '' },
    role: { type: String, default: 'vendor' },
    serviceRadiusKm: { type: Number, default: 10 },
    gstNumber: { type: String, default: '', trim: true },
    ownerName: { type: String, default: '', trim: true },
    alternatePhone: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true },
    registrationType: { type: String, default: 'Individual' },
    yearEstablished: { type: String, default: '' },
    customRates: {
      hourlyRate: { type: Number, default: 250 },
      emergencySurcharge: { type: Number, default: 25 },
      warrantyDays: { type: Number, default: 30 },
    },
    branchAddresses: [
      {
        id: { type: String },
        title: { type: String, default: 'Main Workshop' },
        street: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
        phone: { type: String, default: '' },
      },
    ],
    kycDocuments: {
      aadhaarNumber: { type: String, default: '' },
      aadhaarFront: { type: String, default: '' },
      aadhaarBack: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      panImage: { type: String, default: '' },
      tradeLicenseNumber: { type: String, default: '' },
      tradeLicenseImage: { type: String, default: '' },
      certificateImage: { type: String, default: '' },
      kycStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'verified' },
    },
    address: {
      street: { type: String, default: '' },
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      pincode: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
      }
    }
  },
  { timestamps: true }
);

vendorSchema.index({ category: 1, pincodes: 1, isOnline: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
