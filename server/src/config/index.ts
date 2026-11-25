import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current dir .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // repo-root .env fills in anything server/.env lacks

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/buna_fair_price',
  jwtSecret: process.env.JWT_SECRET || 'buna_fair_price_hackathon_super_secret_jwt_2026',
  jwtExpiresIn: '7d',
  botApiKey: process.env.BOT_API_KEY || 'buna_bot_secure_api_key_jimma_2026',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotEnabled: process.env.ENABLE_TELEGRAM_BOT !== 'false',
  addisApiKey: process.env.ADDIS_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY3 || process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY2 || '',
  // Photo grading tries each key in this order when one fails (KEY3 is the paid Pro account)
  geminiApiKeys: ['GEMINI_API_KEY3', 'GEMINI_API_KEY', 'GEMINI_API_KEY2']
    .map((name) => ({ name, value: process.env[name] || '' }))
    .filter((key) => key.value),
  // gemini-2.5-flash is closed to new API keys; gemini-3.8-flash is often overloaded (HTTP 503)
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 90000,
  // Photo grading: geminiModel gets this long across all keys, then the lighter fallback model is tried
  geminiPrimaryMs: Number(process.env.GEMINI_PRIMARY_MS) || 20000,
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-flash-lite-latest',
  // Cache settings (supports Redis TCP URL or Unix domain socket for IPC)
  redisUrl:
    process.env.REDIS_URL ||
    (fs.existsSync('/tmp/redis.sock') ? '/tmp/redis.sock' : 'redis://127.0.0.1:6379'),
  redisEnabled: process.env.REDIS_ENABLED !== 'false',
  redisTtlDefault: parseInt(process.env.REDIS_TTL_DEFAULT || '300', 10), // 5 minutes default
};
