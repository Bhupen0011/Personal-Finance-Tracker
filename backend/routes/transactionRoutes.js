import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

const transactionValidators = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category')
    .custom((value, { req }) => req.body.type === 'income' || Boolean(value))
    .withMessage('Category is required for expenses')
    .bail()
    .optional()
    .isIn(['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Education', 'Income']),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isISO8601().withMessage('Date must be valid'),
];

router.use(protect);

router
  .route('/')
  .post(transactionValidators, validateRequest, createTransaction)
  .get(
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 50 }),
      query('startDate').optional({ checkFalsy: true }).isISO8601(),
      query('endDate').optional({ checkFalsy: true }).isISO8601(),
    ],
    validateRequest,
    getTransactions,
  );

router
  .route('/:id')
  .put([param('id').isMongoId(), ...transactionValidators], validateRequest, updateTransaction)
  .delete([param('id').isMongoId()], validateRequest, deleteTransaction);

export default router;
