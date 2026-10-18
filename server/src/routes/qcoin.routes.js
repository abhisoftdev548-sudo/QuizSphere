import express from 'express';
import { getWallet, getTransactions, getEarnInfo } from '../controllers/qcoin.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/wallet', authenticate, getWallet);
router.get('/transactions', authenticate, getTransactions);
router.get('/earn-info', getEarnInfo);

export default router;
