import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import ServiceRequest from '../models/ServiceRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}/api`;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';

const runTest = async () => {
  console.log('========================================================');
  console.log('🚀 Starting Automated Test: 4-Digit OTP & Stepper Flow');
  console.log('========================================================');

  try {
    // 1. Connect to MongoDB
    console.log('[1/6] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    // 2. Setup Test Customer & Vendor
    console.log('[2/6] Setting up test Customer & Vendor...');
    let customer = await User.findOne({ phone: '9999900001' });
    if (!customer) {
      customer = await User.create({
        name: 'Test Customer',
        phone: '9999900001',
        role: 'customer',
      });
    }

    let vendor = await Vendor.findOne({ mobileNumber: '9999900002' });
    if (!vendor) {
      vendor = await Vendor.create({
        name: 'Test Pro Partner',
        businessName: 'Apex Electrical Services',
        ownerName: 'Apex Pro',
        mobileNumber: '9999900002',
        category: 'Electrician',
        experienceYears: '3-5 Years',
        pincodes: ['395010', '400001'],
        address: {
          street: '101 Service Lane',
          city: 'Surat',
          pincode: '395010',
          location: { type: 'Point', coordinates: [72.83, 21.17] },
        },
      });
    }

    const customerToken = jwt.sign({ id: customer._id, role: 'customer' }, JWT_SECRET, { expiresIn: '1d' });
    const vendorToken = jwt.sign({ id: vendor._id, role: 'vendor' }, JWT_SECRET, { expiresIn: '1d' });

    console.log(`Customer ID: ${customer._id}`);
    console.log(`Vendor ID: ${vendor._id}`);

    // 3. Create Service Request in 'accepted' state with a 4-digit startOtp
    console.log('[3/6] Creating service request with assigned vendor...');
    const testOtp = '4821';
    const serviceReq = await ServiceRequest.create({
      customer: customer._id,
      category: 'Electrician',
      title: 'AC Switch Repair',
      description: 'Need electrical repair at doorstep',
      schedule: {
        date: 'Today',
        timeSlot: 'Morning (9 AM - 12 PM)',
      },
      address: {
        street: 'Flat 402, Green Heights',
        city: 'Surat',
        pincode: '395010',
        location: { type: 'Point', coordinates: [72.83, 21.17] },
      },
      status: 'accepted',
      assignedVendor: vendor._id,
      startOtp: testOtp,
      finalAmount: 300,
    });

    console.log(`Service Request Created: ${serviceReq._id}`);
    console.log(`Initial Status: ${serviceReq.status}`);
    console.log(`Customer Start OTP: ${serviceReq.startOtp}`);

    // Verify customer can read OTP via GET /api/service-requests/:id
    const getRes = await fetch(`${BASE_URL}/service-requests/${serviceReq._id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const getData = await getRes.json();
    if (!getData.success || getData.request.startOtp !== testOtp) {
      throw new Error(`Failed to verify customer OTP retrieval: ${JSON.stringify(getData)}`);
    }
    console.log('Customer successfully sees active startOtp: ' + getData.request.startOtp);

    // 4. Test Invalid OTP Handshake (must return HTTP 400)
    console.log('[4/6] Testing verify-start-otp with INVALID OTP (0000)...');
    const wrongOtpRes = await fetch(`${BASE_URL}/service-requests/${serviceReq._id}/verify-start-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ otp: '0000' }),
    });

    const wrongOtpData = await wrongOtpRes.json();
    console.log(`Response HTTP Status: ${wrongOtpRes.status}`);
    console.log('Response Body:', wrongOtpData);

    if (wrongOtpRes.status !== 400 || wrongOtpData.success !== false) {
      throw new Error(`Expected HTTP 400 with success: false on wrong OTP, received ${wrongOtpRes.status}`);
    }
    console.log('PASS: Correctly rejected invalid OTP with message: ' + wrongOtpData.message);

    // 5. Test Valid OTP Handshake (must return HTTP 200 and status: work_started)
    console.log(`[5/6] Testing verify-start-otp with CORRECT OTP (${testOtp})...`);
    const correctOtpRes = await fetch(`${BASE_URL}/service-requests/${serviceReq._id}/verify-start-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ otp: testOtp }),
    });

    const correctOtpData = await correctOtpRes.json();
    console.log(`Response HTTP Status: ${correctOtpRes.status}`);
    console.log('Response Body:', correctOtpData);

    if (correctOtpRes.status !== 200 || correctOtpData.status !== 'work_started' || !correctOtpData.success) {
      throw new Error(`Expected HTTP 200 and status: work_started, received: ${JSON.stringify(correctOtpData)}`);
    }
    console.log('PASS: Doorstep OTP handshake succeeded. Status changed to work_started.');

    // 6. Test Job Completion (must return HTTP 200 and status: completed)
    console.log('[6/6] Testing job completion with finalAmount and paymentMode...');
    const completeRes = await fetch(`${BASE_URL}/service-requests/${serviceReq._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({ finalAmount: 350, paymentMode: 'Online UPI' }),
    });

    const completeData = await completeRes.json();
    console.log(`Response HTTP Status: ${completeRes.status}`);
    console.log('Response Body:', completeData);

    if (completeRes.status !== 200 || completeData.status !== 'completed' || !completeData.success) {
      throw new Error(`Expected HTTP 200 and status: completed, received: ${JSON.stringify(completeData)}`);
    }
    console.log('PASS: Job completed successfully. Final amount: ' + completeData.request.finalAmount + ', Mode: ' + completeData.request.paymentMode);

    // Clean up test request
    await ServiceRequest.findByIdAndDelete(serviceReq._id);
    console.log('Cleaned up test service request.');

    console.log('========================================================');
    console.log('🎉 ALL TESTS PASSED: Doorstep OTP Handshake & Stepper Verified!');
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('Test Failed with Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runTest();
