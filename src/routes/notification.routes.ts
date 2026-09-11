import { Router } from 'express';
import {
  NotificationController,
  notificationIdValidator,
  notificationQueryValidators,
} from '../controllers/notification.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(protect);

router.get('/', notificationQueryValidators, validate, NotificationController.getNotifications);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', notificationIdValidator, validate, NotificationController.markAsRead);
router.delete('/:id', notificationIdValidator, validate, NotificationController.deleteNotification);

export default router;
