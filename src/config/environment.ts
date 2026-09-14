import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/aiskincare',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'gen_z_skincare_access_secret_super_secure_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gen_z_skincare_refresh_secret_super_secure_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),

  // Groq AI Configuration
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
  GROQ_TIMEOUT_MS: parseInt(process.env.GROQ_TIMEOUT_MS || '50000', 10),
  GROQ_MAX_RETRIES: parseInt(process.env.GROQ_MAX_RETRIES || '2', 10),

  // Google Gemini AI Configuration (Legacy fallback)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  GEMINI_TIMEOUT_MS: parseInt(process.env.GEMINI_TIMEOUT_MS || '50000', 10),
  GEMINI_MAX_RETRIES: parseInt(process.env.GEMINI_MAX_RETRIES || '2', 10),

  // AI Module Rate Limiting & Optimization
  AI_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '900000', 10),
  AI_RATE_LIMIT_MAX: parseInt(process.env.AI_RATE_LIMIT_MAX || '10', 10),
  AI_ANALYSIS_VERSION: process.env.AI_ANALYSIS_VERSION || '1.0',
  AI_PROMPT_VERSION: process.env.AI_PROMPT_VERSION || '1.0',
  AI_CACHE_DUPLICATES: process.env.AI_CACHE_DUPLICATES === 'true',
};
