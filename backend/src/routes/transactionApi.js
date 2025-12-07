import { Router } from "express";
import { createTransaction, deleteTransaction, getAllTransactions, getTransactionById, updateTransaction } from "../controllers/transaction.control.js";


const transaction = Router();

transaction.post("/create", createTransaction);
transaction.get("/", getAllTransactions);
transaction.get("/:id", getTransactionById);
transaction.put("/:id", updateTransaction);
transaction.delete("/:id", deleteTransaction);

export default transaction;