import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';

const router = Router();

router.use(authenticateJWT);

/**
 * GET /api/v1/notifications
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await Notification.find({ recipient: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user!._id,
      isRead: false,
    });

    res.json({ success: true, unreadCount, notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 */
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user!._id },
      { $set: { isRead: true } },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/notifications/read-all
 */
router.put('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Notification.updateMany({ recipient: req.user!._id, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
