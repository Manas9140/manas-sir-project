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

const API_BASE = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/service_app_db';

async function testInvoiceAndReview() {
  console.log('========================================================');
  console.log('🚀 Starting Automated Test: Invoice & Review Flow');
  console.log('========================================================');

  // 1. Connect Database
  console.log('\n[1/6] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  let testRequest = null;

  try {
    // 2. Fetch or Create Test Customer and Vendor
    console.log('\n[2/6] Preparing Test Customer and Vendor...');
    let customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      customer = await User.create({
        name: 'Vishesh (Test Customer)',
        phone: '9876543210',
        role: 'customer',
      });
    }

    let vendor = await Vendor.findOne();
    if (!vendor) {
      vendor = await Vendor.create({
        name: 'Demo Electrical Services',
        businessName: 'Vectova Pro Partner',
        mobileNumber: '9123456780',
        category: 'Electrician',
        experienceYears: '3-5 Years',
        pincodes: ['395007'],
        rating: 4.8,
        completedJobsCount: 12,
        address: {
          street: 'Ring Road, Surat',
          city: 'Surat',
          pincode: '395007',
          location: { type: 'Point', coordinates: [72.8311, 21.1702] },
        },
      });
    }

    const customerToken = jwt.sign({ id: customer._id, role: 'customer' }, JWT_SECRET);
    const vendorToken = jwt.sign({ id: vendor._id, role: 'vendor' }, JWT_SECRET);

    console.log(`Customer: ${customer.name} (${customer._id})`);
    console.log(`Vendor: ${vendor.businessName || vendor.name} (${vendor._id})`);

    // 3. Create Completed Service Request with Final Amount
    console.log('\n[3/6] Creating a completed service request for invoice generation...');
    testRequest = await ServiceRequest.create({
      customer: customer._id,
      assignedVendor: vendor._id,
      title: 'Ceiling Fan Repair & Rewiring',
      category: 'Electrician',
      description: 'Fan is making clicking noise and speed regulator is faulty.',
      address: {
        street: 'Flat 402, Adajan Heights',
        city: 'Surat',
        pincode: '395007',
      },
      schedule: {
        date: 'Today',
        timeSlot: '10:00 AM - 12:00 PM',
      },
      status: 'completed',
      startOtp: '4821',
      finalAmount: 450,
      paymentMode: 'Online UPI',
      workStartedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(),
      reviewSubmitted: false,
    });
    console.log(`Created Completed Request ID: ${testRequest._id}`);

    // 4. Test Invoice Retrieval Endpoint (Customer access)
    console.log('\n[4/6] Testing GET /api/service-requests/:id/invoice...');
    const invoiceRes = await fetch(`${API_BASE}/service-requests/${testRequest._id}/invoice`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
    });

    const invoiceData = await invoiceRes.json();
    console.log(`Response HTTP Status: ${invoiceRes.status}`);

    if (invoiceRes.status !== 200 || !invoiceData.success) {
      throw new Error(`Invoice endpoint failed: ${JSON.stringify(invoiceData)}`);
    }

    const inv = invoiceData.invoice;
    console.log('✅ Invoice fetched successfully:');
    console.log(`   - Invoice Number: ${inv.invoiceNumber}`);
    console.log(`   - Customer: ${inv.customer?.name}`);
    console.log(`   - Vendor: ${inv.vendor?.businessName || inv.vendor?.name}`);
    console.log(`   - Total Amount: ₹${inv.payment?.finalAmount}`);
    console.log(`   - Payment Mode: ${inv.payment?.paymentMode}`);
    console.log(`   - Visiting Fee: ₹${inv.payment?.breakdown?.visitingFee}`);
    console.log(`   - Labor/Service: ₹${inv.payment?.breakdown?.serviceAndLabor}`);

    if (Number(inv.payment?.finalAmount) !== 450) {
      throw new Error(`Invoice total amount mismatch: expected 450, got ${inv.payment?.finalAmount}`);
    }

    // 5. Test Customer Review Submission
    console.log('\n[5/6] Testing POST /api/service-requests/:id/review...');

    const reviewPayload = {
      rating: 5,
      feedbackChips: ['Punctual ⏱️', 'Clean Work 🧹', 'Fair Pricing 💰'],
      reviewText: 'Arrived right on time and fixed the capacitor quickly. Highly recommended!',
    };

    const reviewRes = await fetch(`${API_BASE}/service-requests/${testRequest._id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(reviewPayload),
    });

    const reviewData = await reviewRes.json();
    console.log(`Response HTTP Status: ${reviewRes.status}`);
    console.log('Review Response:', reviewData);

    if (reviewRes.status !== 200 || !reviewData.success) {
      throw new Error(`Review submission failed: ${JSON.stringify(reviewData)}`);
    }

    // 6. Verify Database State Updates
    console.log('\n[6/6] Verifying Database Persistence...');
    const updatedRequest = await ServiceRequest.findById(testRequest._id);
    console.log(`   - Request reviewSubmitted flag: ${updatedRequest.reviewSubmitted}`);
    console.log(`   - Saved Rating: ${updatedRequest.review?.rating} Stars`);
    console.log(`   - Saved Comment: "${updatedRequest.review?.comment}"`);
    console.log(`   - Selected Chips: ${updatedRequest.review?.feedbackChips?.join(', ')}`);

    const updatedVendor = await Vendor.findById(vendor._id);
    console.log(`   - Updated Vendor Rating: ${updatedVendor.rating} Stars`);
    console.log(`   - Completed Jobs Count: ${updatedVendor.completedJobsCount}`);

    console.log('\n========================================================');
    console.log('🎉 Automated Test Completed Successfully: All Checks Passed!');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ Test Failed with Error:', err);
    process.exit(1);
  } finally {
    if (testRequest?._id) {
      await ServiceRequest.findByIdAndDelete(testRequest._id);
      console.log(`\n🧹 Cleaned up test request (${testRequest._id})`);
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

testInvoiceAndReview();
