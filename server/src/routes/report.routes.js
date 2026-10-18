import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportSchema } from '../validators/common.validator.js';
import Report from '../models/Report.js';

const router = express.Router();

router.post('/', authenticate, validate(reportSchema), async (req, res, next) => {
  try {
    const report = await Report.create({ reporter: req.user._id, ...req.body });
    res.status(201).json({ success: true, message: 'Report submitted', data: { report } });
  } catch (err) { next(err); }
});

router.get('/my', authenticate, async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { reports } });
  } catch (err) { next(err); }
});

export default router;
