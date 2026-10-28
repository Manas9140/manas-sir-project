# Antigravity Agent Guidelines & Repository Architecture Reference

> This document serves as the single source of truth for all AI agents working on this project.
> Always consult this guide before proposing or making changes.

---

## 1. Project Overview & Architecture

This is a unified **On-Demand Local Home Services Platform** consisting of:
1. **Frontend App (`user/`)**: A single unified mobile application built with React Native (Expo) and NativeWind v4 (Tailwind CSS for React Native), serving both **Customers** and **Vendors (Service Partners)** through role-based navigation and seamless role switching.
2. **Backend Server (`backend/`)**: REST APIs and real-time Socket.IO server built with Node.js, Express, and MongoDB (Mongoose).

### Running Services
- **Backend API & WebSockets**: Port `5001` (`http://localhost:5001/api`, Socket.IO at `http://localhost:5001`).
- **Mobile App Bundler**: Expo Metro Bundler on port `8081`.
- **Database**: MongoDB Atlas (`service_app_db`).

---

## 2. Core Behavioral Rules for Agents

1. **Strict Language Constraint**:
   - Write **JavaScript only (`.js`)**. Strictly **NO TypeScript (`.ts` / `.tsx`)** for user screens or backend controllers.
2. **Strict Communication Channel Policy**:
   - **NO direct phone call buttons (`tel:`)** or "Call Pro / Call Customer" options once a booking is confirmed.
   - All communication between customers and vendors must occur exclusively through the in-app **Real-Time Live Chat Screen (`VendorChatScreen.js`)** to protect privacy and maintain records.
3. **Design System & Theme**:
   - **White & Navy Blue Light Theme**:
     - Background: `#f6f7f8` (`bg-[#f6f7f8]`)
     - Cards / Surfaces: Pure White `#ffffff` (`bg-white rounded-2xl border border-slate-200/70`)
     - Primary Action / Headers: Navy Blue `#0f1729` (text/bg)
     - Accents: Emerald Green `#10b981` (active/success), Amber `#f59e0b` (pending/stars), Slate `#64748b` (muted text)
4. **Efficiency & Speed**:
   - Avoid reading giant files in their entirety. Use targeted search and specific line slices.
   - Validate JavaScript syntax using `node -c <file>` after editing.
   - Verify that Metro bundler returns HTTP 200 before concluding.

---

## 3. User Roles & Authentication Flow

The application has two distinct user modes managed by `user/src/context/AuthContext.js` and `backend/controllers/authController.js`:

1. **Customer Mode (`role: 'customer'`)**:
   - Backed by `User` model in MongoDB.
   - Flow: Browses services -> Creates service request (`CreateRequestScreen.js`) -> Receives vendor bids -> Accepts bid (`RequestDetailsScreen.js`) -> Live chats with pro (`VendorChatScreen.js`) -> Shares 4-digit start OTP at arrival -> Completes service & reviews.
2. **Vendor Mode (`role: 'vendor'`)**:
   - Backed by `Vendor` model in MongoDB.
   - Flow: Views live local job leads (`VendorDashboardScreen.js`) -> Submits price quotes -> Gets notified upon customer acceptance -> Views active assigned jobs (`VendorJobsScreen.js`) -> Chats with customer & gets directions -> Enters customer's start OTP at the door (`verifyStartOtpApi`) -> Completes job with final amount (`completeServiceRequestApi`).
3. **Role Switching**:
   - Handled via `POST /api/auth/switch-mode`.
   - Allows users with registered partner profiles to toggle seamlessly between Customer and Vendor stacks without logging out.

---

## 4. Key Directory & File Map

### Backend (`backend/`)
- `server.js`: Entry point, Express app, HTTP server, and Socket.IO initialization.
- `models/`:
  - `User.js`: Customer profiles, phone, saved addresses, role.
  - `Vendor.js`: Partner business profile, category, subServices, pincodes, address, location Point, rating, online status.
  - `ServiceRequest.js`: Service requests, category, address, schedule, images, status (`pending`, `accepted`, `in_progress`, `work_started`, `completed`, `cancelled`), assignedVendor, startOtp.
  - `Offer.js`: Vendor bids on service requests (price, estimatedTime, message, status: `pending`, `accepted`, `rejected`).
  - `ChatMessage.js`: Chat messages (`serviceRequest`, `senderModel`: `'User' | 'Vendor'`, `sender`, `senderName`, `message`, `read`).
- `controllers/`:
  - `serviceRequestController.js`: Request creation, `getAvailableRequests` (leads with smart fallback), `getAssignedRequests`, `verifyStartOtp`, `completeServiceRequest`, `getServiceRequestById`.
  - `chatController.js`: `getChatHistory`, `postChatMessage`, `getUnreadCount`.
  - `vendorAuthController.js`: Vendor onboarding, `updateVendorProfile` (address, pincodes, category, rates).
  - `authController.js`: Customer auth, OTP login, `switchMode`.
  - `offerController.js`: Bidding and bid acceptance.
- `socket/`:
  - `chatSocket.js`: Real-time chat rooms (`chat_<serviceRequestId>`), `sendMessage` -> `receiveMessage`.
  - `requestSocket.js`: Geo/pincode dispatches (`pincode_<pin>`, `city_<city>`), `newServiceRequest`.
- `middleware/authMiddleware.js`: `protect` (customer/vendor) and `protectVendor` (vendor only).

### Frontend Mobile App (`user/`)
- `navigation/`:
  - `RootNavigator.js`: Conditional stack rendering based on `token` and `isVendor`.
  - `BottomTabNavigator.js`: Customer tabs (Home, Categories, Bookings/Orders, Profile).
  - `VendorBottomTabNavigator.js`: Vendor tabs:
    - **Leads Tab** (`VendorDashboardScreen.js`): Open local broadcasted jobs awaiting quotes.
    - **Jobs Tab** (`VendorJobsScreen.js`): Active (accepted/in-progress) and completed jobs.
    - **Earnings Tab** (`VendorEarningsScreen.js`): Revenue breakdown and payout history.
    - **Profile Tab** (`VendorProfileScreen.js`): Business settings, verification, operating areas.
- `screens/user/`:
  - `HomeScreen.js`: Service category cards, search, banners.
  - `CreateRequestScreen.js`: Post new service request with address, schedule, description, and images.
  - `BookingsScreen.js`: Active orders and order history tabs.
  - `RequestDetailsScreen.js`: View request status, vendor bids, accept offer, and **Live Chat with Pro**.
- `screens/vendor/`:
  - `VendorDashboardScreen.js`: Real-time leads feed with category filters (All, Electrician, Plumber, etc.), quote modal.
  - `VendorJobsScreen.js`: In-progress jobs with progress stepper, maps navigation, direct Live Chat button, and OTP start dialog.
  - `VendorChatScreen.js`: Bidirectional real-time Socket.IO chat with quick-action chips and bubble alignment.
  - `JobDetailsScreen.js`: Detailed job card with direct in-app chat and Google Maps navigation.
  - `settings/`: `ServicesManagementScreen.js` (skills & rates), `ServiceAreasScreen.js` (pincodes & radius), `BusinessDetailsScreen.js`.
- `services/api.js`: Centralized API methods (`API_BASE_URL: http://192.168.1.6:5001/api` or localhost, `SOCKET_URL`).

---

## 5. Common Pitfalls & Best Practices

1. **Vendor Validation Errors (`address.location`)**:
   - `Vendor.address.location` is a GeoJSON Point (`{ type: 'Point', coordinates: [lng, lat] }`).
   - Never set `address.location = undefined` when updating vendor profiles in `vendorAuthController.js`.
2. **Available Leads vs Assigned Jobs**:
   - Open pending requests waiting for bids belong in **`VendorDashboardScreen.js` (Leads)**.
   - Confirmed/accepted jobs belong in **`VendorJobsScreen.js` (Jobs)**.
   - When querying available jobs, `getAvailableRequests` matches the vendor's operating pincodes (`395010`, etc.) and category with smart fallback so vendors are never faced with an empty screen.
3. **Chat Alignment & Sender Model**:
   - `senderModel` is `'User'` for customers and `'Vendor'` for partners.
   - Bubbles must always align **right** in Navy Blue for the current logged-in user, and **left** in White for the other party.
4. **Socket.IO Room Subscriptions**:
   - Vendors must join rooms for all operating pincodes (`pincode_395010`, etc.) upon connection to receive real-time dispatches.
   - Chat screens must join `chat_<serviceRequestId>` and leave the room upon cleanup.
