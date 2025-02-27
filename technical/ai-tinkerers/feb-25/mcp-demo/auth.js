/**
 * Authentication Module
 * This module handles user authentication and session management.
 * It is used to register, login, and manage user sessions.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './database.js';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-change-this';
const TOKEN_EXPIRY = '24h';
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {string} username - The user's desired username
 * @param {string} email - The user's email address
 * @param {string} password - The user's password (will be hashed)
 * @returns {Object} User data object and JWT token
 */
export async function registerUser(username, email, password) {
  // Validate inputs
  if (!username || !email || !password) {
    throw new Error('Missing required fields');
  }
  
  // Check if user already exists
  const existingUser = await db.users.findOne({ email });
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  // Create user in database
  const user = await db.users.insertOne({
    username,
    email,
    passwordHash,
    createdAt: new Date(),
    isActive: true
  });
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email, username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
  
  // Return user data (excluding password) and token
  return {
    user: {
      id: user.id,
      username,
      email,
      createdAt: user.createdAt
    },
    token
  };
}

/**
 * Login an existing user
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Object} User data object and JWT token
 * @throws {Error} If credentials are invalid or user doesn't exist
 */
export async function loginUser(email, password) {
  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  // Find user by email
  const user = await db.users.findOne({ email });
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account has been deactivated');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
  
  // Update last login timestamp
  await db.users.updateOne(
    { _id: user.id },
    { $set: { lastLogin: new Date() } }
  );
  
  // Return user data and token
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      lastLogin: new Date()
    },
    token
  };
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} Decoded token payload if valid
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Logout a user (for server-side session tracking)
 * @param {string} userId - The user ID to log out
 * @returns {boolean} Success indicator
 */
export async function logoutUser(userId) {
  try {
    // For JWT-based auth, server-side logout involves:
    // 1. Add token to blacklist (if implementing token revocation)
    // 2. Update user's last logout time
    
    await db.users.updateOne(
      { _id: userId },
      { $set: { lastLogout: new Date() } }
    );
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Reset a user's password
 * @param {string} email - The user's email address
 * @param {string} resetToken - The valid reset token
 * @param {string} newPassword - The new password
 * @returns {boolean} Success indicator
 */
export async function resetPassword(email, resetToken, newPassword) {
  // This would validate reset token and update the password
  // Implementation details omitted for brevity
  return true;
}

// Export the authentication functions
export default {
  registerUser,
  loginUser,
  verifyToken,
  logoutUser,
  resetPassword
}; 