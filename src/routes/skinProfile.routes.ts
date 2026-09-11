import { Router } from 'express';
import {
  SkinProfileController,
  createSkinProfileValidators,
  updateSkinProfileValidators,
} from '../controllers/skinProfile.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(protect);

router.get('/', SkinProfileController.getProfile);
router.post('/', createSkinProfileValidators, validate, SkinProfileController.createProfile);
router.put('/', updateSkinProfileValidators, validate, SkinProfileController.updateProfile);
router.delete('/', SkinProfileController.deleteProfile);

export default router;
