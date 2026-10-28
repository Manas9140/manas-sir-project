import express from 'express';
import { getChatHistory, postChatMessage, getUnreadCount, markChatRead } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:serviceRequestId', protect, getChatHistory);
router.post('/:serviceRequestId', protect, postChatMessage);
router.get('/:serviceRequestId/unread', protect, getUnreadCount);
router.post('/:serviceRequestId/read', protect, markChatRead);
router.put('/:serviceRequestId/read', protect, markChatRead);

export default router;

