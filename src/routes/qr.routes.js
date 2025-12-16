import { Router } from 'express';
import { forceRegenerateQR } from '../controllers/qr.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/:meetingId/regenerate',
  authenticate,
  authorize(['admin']),
  forceRegenerateQR
);

export default router; 
