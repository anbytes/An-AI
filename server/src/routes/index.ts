import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { ConversationController } from '../controllers/conversationController.js';
import { ChatController } from '../controllers/chatController.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// 用户路由
router.post('/users', UserController.createOrGet);
router.put('/users/:id', UserController.updateNickname);

// 会话路由
router.get('/conversations', ConversationController.getAll);
router.post('/conversations', ConversationController.create);
router.put('/conversations/:id', ConversationController.updateTitle);
router.delete('/conversations/:id', ConversationController.delete);
router.get('/conversations/:id/messages', ConversationController.getMessages);
router.get('/conversations/:id/export', ConversationController.export);

// 聊天路由（应用频率限制）
router.post('/chat', rateLimiter, ChatController.sendMessage);
router.post('/chat/regenerate', rateLimiter, ChatController.regenerate);
router.post('/chat/regenerate-stream', rateLimiter, ChatController.regenerateStream);

// 消息路由
router.put('/messages/:id', ChatController.editMessage);
router.post('/messages/:id/favorite', ChatController.toggleFavorite);
router.get('/messages/favorites', ChatController.getFavorites);
router.get('/messages/:id/versions', ChatController.getVersions);
router.put('/messages/:id/version', ChatController.switchVersion);

export default router;
