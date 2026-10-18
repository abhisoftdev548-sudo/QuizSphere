import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);
router.delete('/', authenticate, clearAll);

export default router;
