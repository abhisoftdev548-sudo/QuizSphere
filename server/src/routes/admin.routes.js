import express from 'express';
import { getDashboardStats, getUsers, updateUser, deleteUser, getReports, reviewReport, getAuditLogs, getSettings, updateSettings } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/reports', getReports);
router.put('/reports/:id', reviewReport);

router.get('/audit-logs', getAuditLogs);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
