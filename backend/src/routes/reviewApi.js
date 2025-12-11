import express from 'express';
const router = express.Router();
import {
    createReview,
    getListenerReviews,
    updateReview,
    deleteReview,
    getReview
} from '../controllers/review.controll.js';

import { verifyToken } from '../middlewares/verifyToken.js';
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';
import { isAuthenticated } from '../middlewares/isAuthenticated.js';

// Public routes
router.get('/listeners/:listenerId/reviews', getListenerReviews);
router.get('/:id', getReview);

// Protected routes (require authentication)
router.use(verifyToken);

// User routes
router.post('/listeners/:listenerId', isAuthenticated, createReview);
router.put('/:id', isAuthenticated, updateReview);
router.delete('/:id', isAuthenticated, deleteReview);

export default router;
