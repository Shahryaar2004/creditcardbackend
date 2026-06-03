import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';

export const getStats = async (req, res) => {
  try {
    const totalProcessed = await Transaction.countDocuments();
    const totalBlocked = await Transaction.countDocuments({ status: 'Fraudulent' });
    const allTxns = await Transaction.find().sort({ timestamp: -1 }).limit(50);
    
    // Aggregate data into a summary object for our UI charts
    const chartData = [
      { name: 'Legitimate', value: await Transaction.countDocuments({ status: 'Legitimate' }) },
      { name: 'Suspicious', value: await Transaction.countDocuments({ status: 'Suspicious' }) },
      { name: 'Fraudulent', value: totalBlocked }
    ];

    res.json({ totalProcessed, totalBlocked, allTxns, chartData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const manageUserBlock = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const targetUser = await User.findOneAndUpdate({ email: req.params.email }, { isBlocked }, { new: true });
    res.json({ message: `Account block status configured: ${targetUser?.isBlocked}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};