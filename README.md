# CarPool Enterprise 🚗🌍

CarPool Enterprise is a modern, high-performance web platform designed to revolutionize smart commuting for workplaces. It seamlessly connects hosts offering rides with passengers looking for rides, reducing carbon footprints, saving travel costs, and promoting community building.

## ✨ Key Features

- **Smart Ride Matching**: Advanced algorithm to match passengers with available host routes.
- **Live Trip Tracking**: Real-time GPS tracking on Mappls (MapMyIndia) maps with dynamic ETAs and route simulation.
- **Integrated Wallet & Payments**: Built-in digital wallet powered by Razorpay for seamless recharges and trip payments (UPI, Cards, Netbanking).
- **In-App Messaging**: Real-time chat system with auto-generated watermarks distinguishing hosts and passengers for fluid communication.
- **Automated Trip Lifecycle**: Hands-free trip completion. When a host arrives at the destination, the trip is automatically marked as completed for all passengers.
- **Advanced Analytics**: Beautiful Chart.js-powered dashboards tracking total distance shared, money saved, and CO₂ emissions reduced.
- **Role Switching**: Users can seamlessly switch between offering rides (Host) and finding rides (Passenger) from the same account.

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 (Modern Glassmorphism Design), Vanilla JavaScript (No heavy frameworks).
- **Backend**: Node.js, Express.js
- **Database**: MongoDB & Mongoose ORM
- **Maps & Routing**: Mappls (MapMyIndia) REST and Vector SDKs
- **Payments**: Razorpay Node SDK & Checkout API
- **Real-Time Updates**: Standard Polling / Socket integration

## 🚀 Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally on port 27017.

### 1. Backend Setup

Navigate to the `server` directory and install the required dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory with your API keys (optional, default fallbacks exist):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/carpool_db
JWT_SECRET=super_secret_carpool_jwt_key
RAZORPAY_KEY_ID=rzp_test_TEtvEWceSQBzxC
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Start the backend server:
```bash
npm run dev
# OR
npm start
```
*The server will run on http://localhost:5000*

### 2. Frontend Setup

The frontend is built with pure Vanilla JavaScript and HTML. You don't need to run a heavy build step!

Simply serve the root directory using any local web server, or open `index.html` directly in your browser.

If you have VS Code, you can use the **Live Server** extension, or use a simple Node server:
```bash
npx serve .
```

## 🧪 Dummy Data & Seeding

The platform includes a robust seed script to generate 150 dummy hosts, 150 dummy passengers, and 150 active rides across two major routes (Naroda to Gandhinagar & Gandhinagar to Sardar Patel Underpass).

To seed the database:
```bash
cd server
npm run seed
```

### 🔑 Test Accounts
You can log into any of the seeded accounts to test the platform.

**Route 1 (Naroda to Gandhinagar):**
- **Host**: `hosta_1@example.com` (Password: `hostA_pass_1`)
- **Passenger**: `passa_1@example.com` (Password: `passA_pass_1`)

**Route 2 (Gandhinagar to Sardar Patel Underpass):**
- **Host**: `hostb_1@example.com` (Password: `hostB_pass_1`)
- **Passenger**: `passb_1@example.com` (Password: `passB_pass_1`)

*(Note: Accounts range from index `1` to `75` for each route).*

## 🎨 Design Philosophy
The UI is designed with a premium aesthetic, featuring sleek dark modes, vibrant tailored colors, smooth gradients, and subtle micro-animations that ensure a stunning first impression and a highly responsive user experience.

---
*Built with ❤️ for a greener, more connected tomorrow.*
