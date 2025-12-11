import express from 'express';
import { 
    softDeleteUser, 
    restoreUser, 
    softDeleteListener, 
    restoreListener, 
    softDeleteSession, 
    restoreSession, 
    getDeletedItems 
} from '../controllers/softDelete.control.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';

const router = express.Router();

// Middleware to check if user is authenticated and has admin privileges
const adminAuth = [verifyToken, isSuperAdmin];

// User routes
router.post('/users/soft-delete/:id', adminAuth, softDeleteUser);
router.post('/users/restore/:id', adminAuth, restoreUser);

// Listener routes
router.post('/listeners/soft-delete/:id', adminAuth, softDeleteListener);
router.post('/listeners/restore/:id', adminAuth, restoreListener);

// Session routes
router.post('/sessions/soft-delete/:id', verifyToken, softDeleteSession);
router.post('/sessions/restore/:id', verifyToken, restoreSession);

// Get all deleted items
router.get('/deleted/:type', adminAuth, getDeletedItems);

export default router;
