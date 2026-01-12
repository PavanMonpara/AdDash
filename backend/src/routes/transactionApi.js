import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  getUserTransactions,
  imposePenalty,
  rechargeWallet,
  getWalletBalance
} from "../controllers/transaction.control.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { validateCreateTransaction } from "../middlewares/validation/transaction.validation.js";
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js";

const router = Router();

// Public routes (if any)
// router.get("/public/transactions", getPublicTransactions);

// Protected routes (require authentication)
router.use(verifyToken);

// User-specific routes
router.get("/user/:userId", getUserTransactions);
router.get("/wallet/balance/:userId", getWalletBalance);
router.post("/recharge", rechargeWallet);

// Admin-only routes
router.use(isSuperAdmin);
router.post("/penalty", imposePenalty);
router.post("/", validateCreateTransaction, createTransaction);
router.get("/", getAllTransactions);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;