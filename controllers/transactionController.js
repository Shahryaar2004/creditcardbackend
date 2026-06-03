// import Transaction from '../models/transactionModel.js';
// import User from '../models/userModel.js';
// import { runFraudAnalysis } from './fraudEngine.js';

// export const checkTransaction = async (req, res) => {
//   try {
//     const { id, cardNumber, vendor, amount, location, device, timestamp } = req.body;
    
//     // Find the last transaction for this card to check travel velocity anomalies
//     const lastTxn = await Transaction.findOne({ cardNumber }).sort({ timestamp: -1 });
    
//     // Check if user account vector has an active administrative block
//     const associatedUser = await User.findOne({ _id: req.user.id });
    
//     let analysis = runFraudAnalysis({ amount, location, timestamp }, lastTxn);
    
//     if (associatedUser?.isBlocked) {
//       analysis.status = "Fraudulent";
//       analysis.riskScore = 100;
//       analysis.flags.push("Explicit Administrative Card Freeze Override");
//     }

//     const savedTxn = await Transaction.create({
//       userId: req.user.id,
//       id: id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
//       cardNumber,
//       vendor,
//       amount,
//       location,
//       device,
//       riskScore: analysis.riskScore,
//       status: analysis.status,
//       flags: analysis.flags,
//       timestamp: timestamp || new Date()
//     });

//     res.status(201).json(savedTxn);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const getHistory = async (req, res) => {
//   try {
//     const records = await Transaction.find({ userId: req.user.id }).sort({ timestamp: -1 });
//     res.json(records);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// export const updateStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const updated = await Transaction.findOneAndUpdate({ id: req.params.id }, { status }, { new: true });
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';
import { runFraudAnalysis } from './fraudEngine.js';
import axios from 'axios';

export const checkTransaction = async (req, res) => {
  try {
    const { id, cardNumber, cardName, vendor, amount, location, device, timestamp } = req.body;
    
    // Find the last transaction for this card to check travel velocity anomalies
    const lastTxn = await Transaction.findOne({ cardNumber }).sort({ timestamp: -1 });
    const associatedUser = await User.findOne({ _id: req.user.id });
    
    // STEP 1: Run your custom mathematical spatial/velocity engine first
    let algorithmicAnalysis = runFraudAnalysis({ amount, location, timestamp, cardNumber }, lastTxn);
    
    if (associatedUser?.isBlocked) {
      algorithmicAnalysis.status = "Fraudulent";
      algorithmicAnalysis.riskScore = 100;
      algorithmicAnalysis.flags.push("Explicit Administrative Card Freeze Override");
    }

    // STEP 2: Mask sensitive data before sending to Google's AI
    const safeCard = `****-****-****-${cardNumber.slice(-4)}`;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "AI Gateway Configuration Missing" });
    }

    // STEP 3: The Gemini AI Prompt
    // We feed Gemini the raw transaction PLUS your engine's math results
    const promptText = `
      You are a Senior Fraud Analyst AI for an enterprise payment gateway.
      Evaluate this transaction telemetry. We have already run a spatial math pre-check.
      
      Transaction Context:
      - Amount: $${amount}
      - Vendor: ${vendor}
      - Device: ${device}
      - Location: ${location?.name || "Unknown"}
      - Pre-Check System Flags: ${JSON.stringify(algorithmicAnalysis.flags)}
      - Pre-Check System Score: ${algorithmicAnalysis.riskScore}/100

      Consider the vendor type matching the device, the amount, and the system flags. 
      Output a final verdict as a raw JSON string matching this exact structure:
      {"status": "Legitimate" | "Suspicious" | "Fraudulent", "riskScore": number (0 to 100), "flags": ["3 to 4 clear, professional strings explaining the exact security reasons for this score"]}
      
      Do NOT wrap in markdown or backticks. Return raw JSON only.
    `;

    // Call Google Gemini 2.5 Flash
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: promptText }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Safely parse the AI output
    const rawContent = geminiResponse.data.candidates[0].content.parts[0].text.trim();
    const cleanJsonString = rawContent.replace(/```json|```/g, "").trim();
    const aiResult = JSON.parse(cleanJsonString);

    // STEP 4: Save the AI's intelligent decision to your MongoDB database
    const savedTxn = await Transaction.create({
      userId: req.user.id,
      id: id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      cardNumber: safeCard, // Save the masked card to DB for security
      vendor,
      amount,
      location,
      device,
      riskScore: aiResult.riskScore,
      status: aiResult.status,
      flags: aiResult.flags,
      timestamp: timestamp || new Date()
    });

    // Send the AI result back to your React frontend
    res.status(201).json(savedTxn);

  } catch (err) {
    console.error("Transaction Pipeline Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const records = await Transaction.find({ userId: req.user.id }).sort({ timestamp: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Transaction.findOneAndUpdate({ id: req.params.id }, { status }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};