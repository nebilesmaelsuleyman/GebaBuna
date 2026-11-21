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
      const connected = mongoose.connection;
      console.log(`☕ [MongoDB] Connected to ${connected.host}/${connected.name}`);
      return;
    } catch (err: any) {
      const label = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.warn(`⚠️ [MongoDB] Failed connecting to ${label}: ${err.message}`);
    }
  }

  throw new Error('❌ [MongoDB] Unable to connect to any MongoDB instance. Please check your MongoDB server.');
};
