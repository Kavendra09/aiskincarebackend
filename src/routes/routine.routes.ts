import { Router } from 'express';
import {
  RoutineController,
  createRoutineValidators,
  updateRoutineValidators,
  routineIdValidator,
  addStepValidators,
  stepIdValidator,
  completeStepValidators,
} from '../controllers/routine.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(protect);

// Specific routes before param routes
router.get('/today', RoutineController.getTodayRoutines);
router.get('/stats', RoutineController.getRoutineStats);

// Routine collection routes
router.get('/', RoutineController.getRoutines);
router.post('/', createRoutineValidators, validate, RoutineController.createRoutine);

// Single routine routes
router.get('/:id', routineIdValidator, validate, RoutineController.getRoutineById);
router.put('/:id', updateRoutineValidators, validate, RoutineController.updateRoutine);
router.delete('/:id', routineIdValidator, validate, RoutineController.deleteRoutine);

// Routine step routes
router.post('/:id/steps', addStepValidators, validate, RoutineController.addStep);
router.put('/:id/steps/:stepId', stepIdValidator, validate, RoutineController.updateStep);
router.delete('/:id/steps/:stepId', stepIdValidator, validate, RoutineController.deleteStep);

// Step completion tracking route
router.post('/:id/complete', completeStepValidators, validate, RoutineController.completeStep);

export default router;
