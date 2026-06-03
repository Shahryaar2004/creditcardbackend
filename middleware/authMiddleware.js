import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Decode and verify token integrity
      const decoded = jwt.verify(token, 'SUPER_SECRET_KEY_MERN_12345');
      
      // Store user identity context (ID and Role) inside request lifecycle
      req.user = decoded; 
      
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token signature validation failed.' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing.' });
  }
};