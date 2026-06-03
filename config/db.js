import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    // ✅ FIXED: Changed 'Process' to lowercase 'process'
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB atlas connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Error: ${error.message}`);
    process.exit(1);
  }
};