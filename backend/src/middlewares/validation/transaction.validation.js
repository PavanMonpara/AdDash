import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// Common validation for transaction ID
const validateTransactionId = [
  param('id')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid transaction ID')
];

// Validation for creating a new transaction
export const validateCreateTransaction = [
  body('user')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID'),
    
  body('recipient')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid recipient ID')
    .custom((value, { req }) => {
      if (['session payment', 'refund', 'commission'].includes(req.body.type) && !value) {
        throw new Error('Recipient is required for this transaction type');
      }
      return true;
    }),

  body('session')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid session ID')
    .custom((value, { req }) => {
      if (req.body.type === 'session payment' && !value) {
        throw new Error('Session ID is required for session payment');
      }
      return true;
    }),

  body('type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(['deposit', 'withdrawal', 'session payment', 'refund', 'commission'])
    .withMessage('Invalid transaction type'),

  body('method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['razorpay', 'wallet', 'bank transfer', 'auto'])
    .withMessage('Invalid payment method'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat(),

  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status'),

  body('razorpayId')
    .optional()
    .isString()
    .withMessage('Razorpay ID must be a string'),
    
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation for updating a transaction
export const validateUpdateTransaction = [
  ...validateTransactionId,
  
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status'),
    
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
    
  body('razorpayId')
    .optional()
    .isString()
    .withMessage('Razorpay ID must be a string'),
    
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number')
    .toFloat()
];

// Validation for query parameters when listing transactions
export const validateListTransactions = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
    
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status filter'),
    
  query('type')
    .optional()
    .isIn(['deposit', 'withdrawal', 'session payment', 'refund', 'commission'])
    .withMessage('Invalid transaction type filter'),
    
  query('userId')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID filter'),
    
  query('recipientId')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid recipient ID filter'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date string'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date string')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Validation for getting user transactions
export const validateUserTransactions = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid user ID'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
    
  query('type')
    .optional()
    .isIn(['deposit', 'withdrawal', 'session payment', 'refund', 'commission'])
    .withMessage('Invalid transaction type filter'),
    
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Invalid status filter')
];

export default {
  validateTransactionId,
  validateCreateTransaction,
  validateUpdateTransaction,
  validateListTransactions,
  validateUserTransactions
};
