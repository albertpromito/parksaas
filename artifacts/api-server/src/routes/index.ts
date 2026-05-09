import { Router, type IRouter } from "express";
import healthRouter from "./health";
import spotsRouter from "./spots";
import plansRouter from "./plans";
import subscribersRouter from "./subscribers";
import sessionsRouter from "./sessions";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import pricingRouter from "./pricing";
import authRouter from "./auth";
import adminRouter from "./admin";
import tenantSettingsRouter from "./tenant-settings";
import financeRouter from "./finance";
import expensesRouter from "./expenses";
import { requireActiveTenant } from "../middleware/auth.js";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(authRouter);
router.use(healthRouter);

// Admin routes (protected inside the handler)
router.use(adminRouter);

// Protected app routes — require authenticated & active session
router.use(requireActiveTenant);
router.use(spotsRouter);
router.use(plansRouter);
router.use(subscribersRouter);
router.use(sessionsRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(pricingRouter);
router.use(tenantSettingsRouter);
router.use(financeRouter);
router.use(expensesRouter);

export default router;
