import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', DashboardController.getDashboard);

export default router;
