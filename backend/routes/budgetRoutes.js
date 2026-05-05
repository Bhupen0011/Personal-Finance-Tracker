import express from 'express';
import { body, query } from 'express-validator';
import { createBudget, getBudgets } from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(
    [
      body('category').isIn(['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Education']),
      body('monthlyLimit').isFloat({ min: 0 }).withMessage('Monthly limit must be a positive number'),
      body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
      body('year').isInt({ min: 2024 }).withMessage('Year must be valid'),
    ],
    validateRequest,
    createBudget,
  )
  .get(
    [
      query('month').optional().isInt({ min: 1, max: 12 }),
      query('year').optional().isInt({ min: 2024 }),
    ],
    validateRequest,
    getBudgets,
  );

export default router;
