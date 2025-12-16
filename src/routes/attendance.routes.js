import { Router } from 'express';
import { scanQR } from '../controllers/attendance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/scan', authenticate, scanQR);

export default router;
