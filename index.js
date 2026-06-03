import 'dotenv/config'; // Must be first to load state vectors
import dns from 'dns';    // Native Node.js network routing module

// ✅ CUSTOM FORCED PUBLIC DNS NETWORKING: Overrides local ISP DNS constraints
// This forces Node to use Google (8.8.8.8) and Cloudflare (1.1.1.1) to resolve external API gateways instantly.
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { protect } from './middleware/authMiddleware.js';
import { login, register } from './controllers/authController.js';
import { checkTransaction, getHistory, updateStatus } from './controllers/transactionController.js';
import { getStats, manageUserBlock } from './controllers/dashboardController.js';

const app = express();

// Middleware Integration & Security Channels
// ✅ WIDE OPEN CORS CHANNEL: Allows any origin (including Vercel, localhost, or mobile) to communicate with your API
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Establish Database connection pipeline
connectDB();

// Route Architecture Mapping Specifications [Section 8.3 / Section 10]
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Protected Operations Channels
app.post('/api/transaction/check', protect, checkTransaction);
app.get('/api/transaction/history', protect, getHistory);
app.put('/api/transaction/status/:id', protect, updateStatus);
app.get('/api/dashboard/metrics', protect, getStats);
app.put('/api/admin/user-block/:email', protect, manageUserBlock);

// Server Init Listen Hook
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`MERN Security Processing Core Running on Localhost:${PORT}`);
  console.log(`Custom DNS Policy Active: Routed via Google [8.8.8.8] & Cloudflare [1.1.1.1]`);
});