import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true, unique: true },
  cardNumber: { type: String, required: true },
  vendor: { type: String, required: true },
  amount: { type: Number, required: true },
  location: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  device: { type: String, required: true },
  riskScore: { type: Number, required: true },
  status: { type: String, enum: ['Legitimate', 'Suspicious', 'Fraudulent'], required: true },
  flags: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
}, {
  // ✅ FIX 1: This automatically inserts 'createdAt' and 'updatedAt' fields into your documents.
  // This enables our 5 requests per minute rolling rate limiter to function perfectly!
  timestamps: true 
});

export default mongoose.model('Transaction', transactionSchema);