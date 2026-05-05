import express from 'express';
import { query } from 'express-validator';
import { getAnalytics, getSummary } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

const rangeValidators = [
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2024 }),
];

router.get('/summary', rangeValidators, validateRequest, getSummary);
router.get('/analytics', rangeValidators, validateRequest, getAnalytics);

export default router;
