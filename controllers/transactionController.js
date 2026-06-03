
// import Transaction from '../models/transactionModel.js';
// import User from '../models/userModel.js';
// import { runFraudAnalysis } from './fraudEngine.js';
// import axios from 'axios';

// export const checkTransaction = async (req, res) => {
//   try {
//     const { id, cardNumber, cardName, vendor, amount, location, device, timestamp } = req.body;
    
//     // Find the last transaction for this card to check travel velocity anomalies
//     const lastTxn = await Transaction.findOne({ cardNumber }).sort({ timestamp: -1 });
//     const associatedUser = await User.findOne({ _id: req.user.id });
    
//     // STEP 1: Run your custom mathematical spatial/velocity engine first
//     let algorithmicAnalysis = runFraudAnalysis({ amount, location, timestamp, cardNumber }, lastTxn);
    
//     if (associatedUser?.isBlocked) {
//       algorithmicAnalysis.status = "Fraudulent";
//       algorithmicAnalysis.riskScore = 100;
//       algorithmicAnalysis.flags.push("Explicit Administrative Card Freeze Override");
//     }

//     // STEP 2: Mask sensitive data before sending to Google's AI
//     const safeCard = `****-****-****-${cardNumber.slice(-4)}`;
//     const apiKey = process.env.OPENAI_API_KEY;

//     if (!apiKey) {
//       return res.status(500).json({ error: "AI Gateway Configuration Missing" });
//     }

//     // STEP 3: The Gemini AI Prompt
//     // We feed Gemini the raw transaction PLUS your engine's math results
//     const promptText = `
//       You are a Senior Fraud Analyst AI for an enterprise payment gateway.
//       Evaluate this transaction telemetry. We have already run a spatial math pre-check.
      
//       Transaction Context:
//       - Amount: $${amount}
//       - Vendor: ${vendor}
//       - Device: ${device}
//       - Location: ${location?.name || "Unknown"}
//       - Pre-Check System Flags: ${JSON.stringify(algorithmicAnalysis.flags)}
//       - Pre-Check System Score: ${algorithmicAnalysis.riskScore}/100

//       Consider the vendor type matching the device, the amount, and the system flags. 
//       Output a final verdict as a raw JSON string matching this exact structure:
//       {"status": "Legitimate" | "Suspicious" | "Fraudulent", "riskScore": number (0 to 100), "flags": ["3 to 4 clear, professional strings explaining the exact security reasons for this score"]}
      
//       Do NOT wrap in markdown or backticks. Return raw JSON only.
//     `;

//     // Call Google Gemini 2.5 Flash
//    const geminiResponse = await axios.post(
//   `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
//   { contents: [{ parts: [{ text: promptText }] }] },
//   { headers: { 'Content-Type': 'application/json' } }
// );
//     // Safely parse the AI output
//     const rawContent = geminiResponse.data.candidates[0].content.parts[0].text.trim();
//     const cleanJsonString = rawContent.replace(/```json|```/g, "").trim();
//     const aiResult = JSON.parse(cleanJsonString);

//     // STEP 4: Save the AI's intelligent decision to your MongoDB database
//     const savedTxn = await Transaction.create({
//       userId: req.user.id,
//       id: id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
//       cardNumber: safeCard, // Save the masked card to DB for security
//       vendor,
//       amount,
//       location,
//       device,
//       riskScore: aiResult.riskScore,
//       status: aiResult.status,
//       flags: aiResult.flags,
//       timestamp: timestamp || new Date()
//     });

//     // Send the AI result back to your React frontend
//     res.status(201).json(savedTxn);

//   } catch (err) {
//     console.error("Transaction Pipeline Error:", err.message);
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
  // Define variables outside the block so they are accessible inside the catch handler fallbacks
  let id, cardNumber, cardName, vendor, amount, location, device, timestamp;

  try {
    ({ id, cardNumber, cardName, vendor, amount, location, device, timestamp } = req.body);
    
    // =========================================================================
    // 🛑 STEP 0: NATIVE MONGODB RATE LIMITER (MAX 5 REQUESTS PER MINUTE)
    // =========================================================================
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    // Count how many transaction records this specific user has generated in the last 60 seconds
    const recentRequestCount = await Transaction.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: oneMinuteAgo } // Assumes your schema utilizes timestamps: true
    });

    if (recentRequestCount >= 5) {
      console.warn(`Rate Limit Triggered for User: ${req.user.id} (${recentRequestCount + 1}/5 requests)`);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Cryptographic throughput restricted. Transaction velocity maximum exceeded (Max 5 requests per minute)."
      });
    }
    // =========================================================================

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

    // Call Google Gemini 1.5 Flash
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      cardNumber: safeCard, 
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
    return res.status(201).json(savedTxn);

  } catch (err) {
    console.error("Transaction Pipeline Error:", err.message);
    
    // Presentation safety fallback loop if Gemini returns an explicit 429 rate error
    if (err.message?.includes('429') || err.response?.status === 429) {
      const lastTxnFallback = await Transaction.findOne({ cardNumber }).sort({ timestamp: -1 }).catch(() => null);
      const runFraudAnalysisSafe = typeof runFraudAnalysis === 'function' ? runFraudAnalysis : () => ({ riskScore: 50, status: "Suspicious", flags: ["Local processing fallback"] });
      let algorithmicAnalysis = runFraudAnalysisSafe({ amount, location, timestamp, cardNumber }, lastTxnFallback);

      const savedFallbackTxn = await Transaction.create({
        userId: req.user?.id || null,
        id: id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        cardNumber: cardNumber ? `****-****-****-${cardNumber.slice(-4)}` : "****-****-****-0000",
        vendor: vendor || "Unknown Merchant",
        amount: amount || 0,
        location: location || { name: "Unknown Location" },
        device: device || "Unknown Terminal",
        riskScore: algorithmicAnalysis.riskScore, 
        status: algorithmicAnalysis.status,       
        flags: [...(algorithmicAnalysis.flags || []), "API Rate-Limit: Local Rules Fallback Active"],
        timestamp: new Date()
      }).catch(() => null);

      if (savedFallbackTxn) {
        return res.status(201).json(savedFallbackTxn);
      }
    }

    return res.status(500).json({ error: err.message });
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