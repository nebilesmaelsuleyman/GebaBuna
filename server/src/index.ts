import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import profileRoutes from './routes/profiles';
import listingRoutes from './routes/listings';
import marketPriceRoutes from './routes/marketPrices';
import offerRoutes from './routes/offers';
import tradeRoutes from './routes/trades';
import reviewRoutes from './routes/reviews';
import leaderboardRoutes from './routes/leaderboard';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import botRoutes from './routes/bot';
import voiceRoutes from './routes/voice';
import aiAnalysisRoutes from './routes/aiAnalysis';
import statsRoutes from './routes/stats';
import { TelegramBotService } from './services/telegramBotService';

const app = express();

// Middlewares
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static uploads directory (for hackathon demo file uploads)
app.use('/uploads', express.static(config.uploadDir));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    platform: 'GebaBuna (ገባ ቡና)',
    status: 'operational',
    region: 'Jimma, Ethiopia',
    timestamp: new Date().toISOString(),
  });
});

// Mount versioned REST API routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/market-prices', marketPriceRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/trades', tradeRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/bot', botRoutes);
app.use('/api/v1/voice', voiceRoutes);
app.use('/api/v1/ai', aiAnalysisRoutes);
app.use('/api/v1/stats', statsRoutes);

// Root greeting
app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to GebaBuna API ☕',
    description: 'Empowering Ethiopian coffee farmers with price transparency and verified buyer access.',
    docs: '/api/v1/health',
  });
});

// Centralized error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`☕ [GebaBuna Server] Running on http://localhost:${config.port}`);
      console.log(`📡 [API Base]: http://localhost:${config.port}/api/v1`);
      
      // Start BunaJimma Telegram Bot
      TelegramBotService.start().catch((botErr) => {
        console.warn('⚠️ [TelegramBot] Failed to initialize bot:', botErr.message);
      });
    });
  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

export default app;
