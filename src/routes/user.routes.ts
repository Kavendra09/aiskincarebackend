import { Router } from 'express';
import { UserController, updateProfileValidators } from '../controllers/user.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { uploadSingle } from '../middleware/upload';

const router = Router();

router.use(protect);

router.get('/profile', UserController.getProfile);
router.put('/profile', updateProfileValidators, validate, UserController.updateProfile);
router.post('/avatar', uploadSingle('avatar'), UserController.uploadAvatar);

export default router;
