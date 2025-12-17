import { Router } from 'express';
import {
  scanQR,
  grantRetry,
  getAttendanceByMeeting
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { closeMeeting } from '../controllers/attendance.controller.js';
import { getAttendanceReport } from '../controllers/attendance.controller.js';

const router = Router();

// Usuario escanea QR y marca asistencia
router.post('/scan', authenticate, scanQR);

// Admin autoriza reintento
router.post(
  '/retry',
  authenticate,
  authorize(['admin']),
  grantRetry
);
// Admin: listar asistencia por reunión
router.get(
  '/meeting/:meetingId',
  authenticate,
  authorize(['admin']),
  getAttendanceByMeeting
);


//Cierre automatico
router.post(
  '/meeting/:meetingId/close',
  authenticate,
  authorize(['admin']),
  closeMeeting
);


//Reportes
router.get(
  '/meeting/:meetingId/report',
  authenticate,
  authorize(['admin']),
  getAttendanceReport
);

export default router;
