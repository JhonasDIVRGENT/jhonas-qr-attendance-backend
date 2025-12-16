import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {
  createMeeting,
  getMeetings,
  updateMeeting,
  deleteMeeting,
  toggleMeeting
} from '../controllers/meetings.controller.js';

const router = Router();

router.post('/', authenticate, authorize(['admin']), createMeeting);
router.get('/', authenticate, authorize(['admin']), getMeetings);
router.put('/:id', authenticate, authorize(['admin']), updateMeeting);
router.delete('/:id', authenticate, authorize(['admin']), deleteMeeting);
router.patch('/:id/toggle', authenticate, authorize(['admin']), toggleMeeting);


export default router;
