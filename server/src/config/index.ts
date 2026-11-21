import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current dir .env

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/buna_fair_price',
  jwtSecret: process.env.JWT_SECRET || 'buna_fair_price_hackathon_super_secret_jwt_2026',
  jwtExpiresIn: '7d',
  botApiKey: process.env.BOT_API_KEY || 'buna_bot_secure_api_key_jimma_2026',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  addisApiKey: process.env.ADDIS_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
};
