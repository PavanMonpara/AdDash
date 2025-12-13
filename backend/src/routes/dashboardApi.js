import { Router } from "express";

import { getDashboard } from "../controllers/dashboard.control.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const dashboard = Router();

// Admin dashboard summary
// GET /api/dashboard?days=7&months=6&recentLimit=10
dashboard.get("/", verifyToken, isAuthenticated, getDashboard);

export default dashboard;
