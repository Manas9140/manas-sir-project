import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  houseNo: { type: String, default: '' },
  area: { type: String, default: '' },
  landmark: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  formattedAddress: { type: String, default: '' },
  label: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' }
}, { _id: true });

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // GeoJSON Point location for spatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    addressDetails: {
      houseNo: { type: String, default: '' },
      street: { type: String, default: '' },
      area: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
      formattedAddress: { type: String, default: '' },
      label: { type: String, default: 'Home' }
    },
    savedAddresses: [addressSchema],
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);

export default User;
