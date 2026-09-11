import { Router } from 'express';
import {
  AISkinAnalysisController,
  analysisIdValidator,
  analysisPaginationValidators,
} from './ai.controller';
import { protect } from '../../../middleware/auth';
import { validate } from '../../../middleware/validation';
import { upload } from '../../../middleware/upload';
import { aiAnalysisLimiter } from '../../../middleware/aiRateLimit';

const router = Router();

// Configure photo upload fields for skin analysis (front is primary, left/right optional)
const uploadAnalysisPhotos = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'left', maxCount: 1 },
  { name: 'right', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// All AI skin analysis routes require authentication
router.use(protect);

/**
 * @route   POST /api/v1/ai/skin-analysis
 * @desc    Submit facial image(s) for AI skin analysis
 * @access  Private (Authenticated users)
 */
router.post(
  ['/', '/skin-analysis'],
  aiAnalysisLimiter,
  uploadAnalysisPhotos,
  AISkinAnalysisController.startSkinAnalysis
);

/**
 * @route   GET /api/v1/ai/skin-analysis
 * @desc    Get current user's skin analysis history
 * @access  Private (Authenticated users)
 */
router.get(
  ['/', '/skin-analysis'],
  analysisPaginationValidators,
  validate,
  AISkinAnalysisController.getSkinAnalysisHistory
);

/**
 * @route   GET /api/v1/ai/skin-analysis/:id
 * @desc    Get details of a specific skin analysis by ID
 * @access  Private (Owner only)
 */
router.get(
  ['/:id', '/skin-analysis/:id'],
  analysisIdValidator,
  validate,
  AISkinAnalysisController.getSkinAnalysisById
);

export default router;
