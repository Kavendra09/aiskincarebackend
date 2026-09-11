import { Router } from 'express';
import {
  SkinProgressController,
  progressIdValidator,
  progressPaginationValidators,
} from '../controllers/skinProgress.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { uploadProgressPhotos } from '../middleware/upload';

const router = Router();

router.use(protect);

router.post('/', uploadProgressPhotos, SkinProgressController.createProgress);
router.get('/', progressPaginationValidators, validate, SkinProgressController.getProgressHistory);
router.get('/:id', progressIdValidator, validate, SkinProgressController.getProgressById);
router.delete('/:id', progressIdValidator, validate, SkinProgressController.deleteProgress);

export default router;
