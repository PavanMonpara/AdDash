import { Router } from 'express';
import { body, query } from 'express-validator';
const router = Router();
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';
import { generateYearlyReport, validateYearlyReport } from '../controllers/report.control.js';
import { verifyToken } from '../middlewares/verifyToken.js';


router.get(
    '/', verifyToken, isSuperAdmin,
    [
        query('year')
            .optional()
            .isInt({ min: 2020, max: new Date().getFullYear() + 1 })
            .withMessage('Year must be between 2020 and next year')
    ],
    validateYearlyReport, generateYearlyReport
);

// Add more report routes here as needed
// Example:
// router.get('/monthly', verifyToken, isSuperAdmin, validateMonthlyReport, generateMonthlyReport);
// router.get('/custom', verifyToken, isSuperAdmin, validateCustomReport, generateCustomReport);

export default router;
