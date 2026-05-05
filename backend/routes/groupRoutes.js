import express from 'express';
import { body, param, query } from 'express-validator';
import {
  addGroupMembers,
  addExpenseComment,
  createExpenseTemplate,
  createGroup,
  createRecurringRule,
  createSettlement,
  createSharedExpense,
  exportSharedHistoryCsv,
  getExpenseTemplates,
  getGroupActivity,
  getGroupBalances,
  getGroupDetails,
  getGroupExpenses,
  getGroups,
  getGroupSettlements,
  getNotifications,
  getOfflineDrafts,
  getRecurringRules,
  getSettleUpSuggestions,
  getSharedExpenseHistory,
  markNotificationRead,
  recordSettlementPayment,
  runRecurringRules,
  saveOfflineDraft,
  syncOfflineDraft,
} from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(
    [
      body('name').trim().notEmpty().withMessage('Group name is required'),
      body('baseCurrency').optional().isString(),
      body('members').optional().isArray(),
    ],
    validateRequest,
    createGroup,
  )
  .get([query('search').optional().isString()], validateRequest, getGroups);

router.get('/history', validateRequest, getSharedExpenseHistory);
router.get('/suggestions/settle-up', validateRequest, getSettleUpSuggestions);
router.get('/export/csv', exportSharedHistoryCsv);

router
  .route('/templates')
  .post(
    [
      body('name').trim().notEmpty().withMessage('Template name is required'),
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('splitType').optional().isIn(['equal', 'unequal', 'percentage', 'shares']),
    ],
    validateRequest,
    createExpenseTemplate,
  )
  .get(validateRequest, getExpenseTemplates);

router
  .route('/recurring')
  .post(
    [
      body('groupId').isMongoId().withMessage('Valid group id is required'),
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
      body('splitType').optional().isIn(['equal', 'unequal', 'percentage', 'shares']),
    ],
    validateRequest,
    createRecurringRule,
  )
  .get(validateRequest, getRecurringRules);

router.post('/recurring/run', runRecurringRules);

router
  .route('/drafts')
  .post(
    [
      body('clientDraftId').trim().notEmpty().withMessage('Draft id is required'),
      body('type').isIn(['shared_expense', 'settlement', 'group_create']).withMessage('Invalid draft type'),
    ],
    validateRequest,
    saveOfflineDraft,
  )
  .get(validateRequest, getOfflineDrafts);

router.post(
  '/drafts/:draftId/sync',
  [param('draftId').isMongoId()],
  validateRequest,
  syncOfflineDraft,
);

router.get('/notifications', getNotifications);
router.patch(
  '/notifications/:notificationId/read',
  [param('notificationId').isMongoId()],
  validateRequest,
  markNotificationRead,
);

router.get('/:id', [param('id').isMongoId()], validateRequest, getGroupDetails);
router.post(
  '/:id/members',
  [param('id').isMongoId(), body('members').isArray({ min: 1 }).withMessage('Members array is required')],
  validateRequest,
  addGroupMembers,
);

router
  .route('/:id/expenses')
  .post(
    [
      param('id').isMongoId(),
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
      body('splitType').optional().isIn(['equal', 'unequal', 'percentage', 'shares']),
    ],
    validateRequest,
    createSharedExpense,
  )
  .get([param('id').isMongoId()], validateRequest, getGroupExpenses);

router.post(
  '/:id/expenses/:expenseId/comments',
  [
    param('id').isMongoId(),
    param('expenseId').isMongoId(),
    body('text').optional().isString(),
    body('reaction').optional().isString(),
  ],
  validateRequest,
  addExpenseComment,
);

router.get('/:id/balances', [param('id').isMongoId()], validateRequest, getGroupBalances);

router
  .route('/:id/settlements')
  .post(
    [
      param('id').isMongoId(),
      body('fromUserId').isMongoId(),
      body('toUserId').isMongoId(),
      body('amount').isFloat({ min: 0 }),
      body('status').optional().isIn(['pending', 'partially_settled', 'settled']),
    ],
    validateRequest,
    createSettlement,
  )
  .get([param('id').isMongoId()], validateRequest, getGroupSettlements);

router.post(
  '/:id/settlements/:settlementId/payments',
  [
    param('id').isMongoId(),
    param('settlementId').isMongoId(),
    body('amount').isFloat({ min: 0.01 }),
  ],
  validateRequest,
  recordSettlementPayment,
);

router.get('/:id/activity', [param('id').isMongoId()], validateRequest, getGroupActivity);

export default router;
