import mongoose from 'mongoose';
import { config } from './index';

export const connectDB = async (): Promise<void> => {
  const urisToTry = [
    config.mongoUri,
    'mongodb://127.0.0.1:27017/buna_fair_price',
    'mongodb://127.0.0.1:27018/buna_fair_price',
  ];

  for (const uri of urisToTry) {
    try {
      await mongoose.connect(uri);
      console.log(`☕ [MongoDB] Successfully connected to: ${uri}`);
      return;
    } catch (err: any) {
      console.warn(`⚠️ [MongoDB] Failed connecting to ${uri}: ${err.message}`);
    }
  }

  throw new Error('❌ [MongoDB] Unable to connect to any MongoDB instance. Please check your MongoDB server.');
};
