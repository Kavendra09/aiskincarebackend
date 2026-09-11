import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { RoutineService } from '../services/routine.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ROUTINE_STEP_CATEGORIES } from '../models/Routine';

export const routineIdValidator = [
  param('id').isMongoId().withMessage('Invalid routine ID format'),
];

export const stepIdValidator = [
  param('id').isMongoId().withMessage('Invalid routine ID format'),
  param('stepId').isMongoId().withMessage('Invalid step ID format'),
];

export const createRoutineValidators = [
  body('name').trim().notEmpty().withMessage('Routine name is required'),
  body('type')
    .notEmpty()
    .withMessage('Routine type is required')
    .isIn(['morning', 'night', 'custom'])
    .withMessage('Type must be morning, night, or custom'),
  body('description').optional().trim(),
  body('steps').optional().isArray().withMessage('Steps must be an array'),
  body('steps.*.title').optional().trim().notEmpty().withMessage('Step title is required'),
  body('steps.*.category')
    .optional()
    .isIn(ROUTINE_STEP_CATEGORIES)
    .withMessage(`Category must be one of: ${ROUTINE_STEP_CATEGORIES.join(', ')}`),
];

export const updateRoutineValidators = [
  param('id').isMongoId().withMessage('Invalid routine ID format'),
  body('name').optional().trim().notEmpty().withMessage('Routine name cannot be empty'),
  body('type').optional().isIn(['morning', 'night', 'custom']),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
];

export const addStepValidators = [
  param('id').isMongoId().withMessage('Invalid routine ID format'),
  body('title').trim().notEmpty().withMessage('Step title is required'),
  body('description').optional().trim(),
  body('category')
    .optional()
    .isIn(ROUTINE_STEP_CATEGORIES)
    .withMessage(`Category must be one of: ${ROUTINE_STEP_CATEGORIES.join(', ')}`),
  body('order').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
];

export const completeStepValidators = [
  param('id').isMongoId().withMessage('Invalid routine ID format'),
  body('stepId').isMongoId().withMessage('Invalid step ID format'),
  body('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
];

export class RoutineController {
  static getRoutines = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const routines = await RoutineService.getUserRoutines(userId);
    return ApiResponse.success(res, 'Routines retrieved successfully', routines, 200);
  });

  static getRoutineById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const routine = await RoutineService.getRoutineById(userId, req.params.id as string);
    return ApiResponse.success(res, 'Routine retrieved successfully', routine, 200);
  });

  static createRoutine = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const routine = await RoutineService.createRoutine(userId, req.body);
    return ApiResponse.success(res, 'Routine created successfully', routine, 201);
  });

  static updateRoutine = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const routine = await RoutineService.updateRoutine(userId, req.params.id as string, req.body);
    return ApiResponse.success(res, 'Routine updated successfully', routine, 200);
  });

  static deleteRoutine = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await RoutineService.deleteRoutine(userId, req.params.id as string);
    return ApiResponse.success(res, 'Routine deleted successfully', result, 200);
  });

  static addStep = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const routine = await RoutineService.addStep(userId, req.params.id as string, req.body);
    return ApiResponse.success(res, 'Routine step added successfully', routine, 201);
  });

  static updateStep = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const id = req.params.id as string;
    const stepId = req.params.stepId as string;
    const routine = await RoutineService.updateStep(userId, id, stepId, req.body);
    return ApiResponse.success(res, 'Routine step updated successfully', routine, 200);
  });

  static deleteStep = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const id = req.params.id as string;
    const stepId = req.params.stepId as string;
    const routine = await RoutineService.deleteStep(userId, id, stepId);
    return ApiResponse.success(res, 'Routine step deleted successfully', routine, 200);
  });

  static completeStep = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const id = req.params.id as string;
    const { stepId, date } = req.body;
    const result = await RoutineService.toggleStepCompletion(userId, id, stepId, date);
    return ApiResponse.success(res, 'Step completion updated successfully', result, 200);
  });

  static getTodayRoutines = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const data = await RoutineService.getTodayRoutines(userId);
    return ApiResponse.success(res, "Today's routines retrieved successfully", data, 200);
  });

  static getRoutineStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const stats = await RoutineService.getRoutineStats(userId);
    return ApiResponse.success(res, 'Routine statistics retrieved successfully', stats, 200);
  });
}
