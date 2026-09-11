import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import skinProfileRoutes from './skinProfile.routes';
import skinProgressRoutes from './skinProgress.routes';
import routineRoutes from './routine.routes';
import productRoutes from './product.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import aiSkinAnalysisRoutes from '../modules/ai/skin-analysis/ai.routes';

const router = Router();

// Version 1 Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/skin-profile', skinProfileRoutes);
router.use('/skin-progress', skinProgressRoutes);
router.use('/routines', routineRoutes);
router.use('/products', productRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiSkinAnalysisRoutes);
router.use('/ai/skin-analysis', aiSkinAnalysisRoutes);

export default router;
