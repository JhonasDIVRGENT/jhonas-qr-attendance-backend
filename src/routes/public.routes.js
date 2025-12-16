import { Router } from 'express';
import {
  getActiveMeetings,
  getPublicQR
} from '../controllers/public.controller.js';


const router = Router();

router.get('/meetings', getActiveMeetings);
router.get('/meetings/:id/qr', getPublicQR);
export default router;
