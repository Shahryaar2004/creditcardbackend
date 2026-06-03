import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 1. REGISTER PIPELINE: Provisions roles ('user', 'analyst', 'admin') directly to MongoDB
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Check if user already exists in local Compass database
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Identity profile already exists in records.' });
    }

    // Cryptographic Passphrase Hashing via bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save user with the explicit role requested from frontend dropdown
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword, 
      role: role || 'user' // Defaults to standard user if unspecified
    });

    res.status(201).json({ 
      message: 'Cryptographic profile provisioned successfully', 
      userId: user._id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. LOGIN PIPELINE: Verifies credentials and packages user role inside the signed JWT Token
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Fetch user from MongoDB
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid identity records match' });

    // Compare raw input password against secure bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid identity records match' });

    // Inject user ID and user ROLE securely inside the signed JWT token payload
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      'SUPER_SECRET_KEY_MERN_12345', 
      { expiresIn: '1d' }
    );

    // Return token and safe user details back to React client
    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};