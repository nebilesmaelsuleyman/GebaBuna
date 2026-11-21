import { Notification, NotificationType } from '../models/Notification';
import mongoose from 'mongoose';

export async function createNotification(params: {
  recipient: mongoose.Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await Notification.create({
      recipient: params.recipient,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || '',
      metadata: params.metadata || {},
    });
  } catch (err: any) {
    console.error('Failed to create notification:', err.message);
  }
}
