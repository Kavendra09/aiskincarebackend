import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  AuthController,
  registerValidators,
  loginValidators,
  refreshValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { protect } from '../middleware/auth';

const router = Router();

// Strict rate limiting on authentication attempts to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    errors: [],
  },
});

router.post('/register', authLimiter, registerValidators, validate, AuthController.register);
router.post('/login', authLimiter, loginValidators, validate, AuthController.login);
router.post('/refresh', refreshValidators, validate, AuthController.refresh);
router.post('/logout', protect, AuthController.logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidators, validate, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, validate, AuthController.resetPassword);

export default router;
