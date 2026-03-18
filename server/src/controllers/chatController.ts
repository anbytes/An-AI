import { Request, Response } from 'express';
import { MessageModel } from '../models/Message.js';
import { ConversationModel } from '../models/Conversation.js';
import { AIService } from '../services/aiService.js';

/**
 * 聊天控制器
 */
export class ChatController {
  /**
   * 发送消息并获取 AI 回复（流式输出）
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, message, model } = req.body;

      if (!conversationId || !message || !model) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // 验证会话是否存在
      const conversation = ConversationModel.findById(Number(conversationId));
      if (!conversation) {
        return res.status(404).json({ error: '会话不存在' });
      }

      // 保存用户消息
      const userMessage = MessageModel.create(Number(conversationId), 'user', message);

      // 获取最近的消息作为上下文（最近 20 条）
      const recentMessages = MessageModel.getRecentMessages(Number(conversationId), 20);

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 发送用户消息
      res.write(`data: ${JSON.stringify({ type: 'userMessage', data: userMessage })}\n\n`);

      // 调用 AI 服务（流式）
      let aiResponse = '';
      try {
        await AIService.chatStream(recentMessages, model, (chunk: string) => {
          aiResponse += chunk;
          // 发送流式数据块
          res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
        });

        // 保存 AI 回复
        const assistantMessage = MessageModel.create(
          Number(conversationId),
          'assistant',
          aiResponse
        );

        // 更新会话的最后更新时间
        ConversationModel.touch(Number(conversationId));

        // 发送完成消息
        res.write(`data: ${JSON.stringify({ type: 'done', data: assistantMessage })}\n\n`);
        res.end();
      } catch (aiError: any) {
        console.error('AI 服务调用失败:', aiError.message);
        res.write(
          `data: ${JSON.stringify({ type: 'error', data: { message: aiError.message } })}\n\n`
        );
        res.end();
      }
    } catch (error: any) {
      console.error('发送消息失败:', error);
      res.status(500).json({ error: error.message || '服务器错误' });
    }
  }

  /**
   * 重新生成 AI 回复（流式输出）
   */
  static async regenerateStream(req: Request, res: Response) {
    try {
      const { conversationId, messageId, model } = req.body;

      if (!conversationId || !messageId || !model) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // 验证会话是否存在
      const conversation = ConversationModel.findById(Number(conversationId));
      if (!conversation) {
        return res.status(404).json({ error: '会话不存在' });
      }

      // 获取最近的消息作为上下文
      const recentMessages = MessageModel.getRecentMessages(Number(conversationId), 20);

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 调用 AI 服务（流式）
      let aiResponse = '';
      try {
        await AIService.chatStream(recentMessages, model, (chunk: string) => {
          aiResponse += chunk;
          // 发送流式数据块
          res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
        });

        // 为消息添加新版本
        const newVersion = MessageModel.addVersion(Number(messageId), aiResponse);

        // 获取更新后的消息
        const messages = MessageModel.findByConversationId(Number(conversationId));
        const updatedMessage = messages.find(m => m.id === Number(messageId));

        // 更新会话的最后更新时间
        ConversationModel.touch(Number(conversationId));

        // 发送完成消息
        res.write(`data: ${JSON.stringify({ type: 'done', data: updatedMessage })}\n\n`);
        res.end();
      } catch (aiError: any) {
        console.error('AI 服务调用失败:', aiError.message);
        res.write(
          `data: ${JSON.stringify({ type: 'error', data: { message: aiError.message } })}\n\n`
        );
        res.end();
      }
    } catch (error: any) {
      console.error('重新生成失败:', error);
      res.status(500).json({ error: error.message || '服务器错误' });
    }
  }

  /**
   * 重新生成 AI 回复
   */
  static async regenerate(req: Request, res: Response) {
    try {
      const { conversationId, messageId, model } = req.body;

      if (!conversationId || !messageId || !model) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // 获取最近的消息作为上下文
      const recentMessages = MessageModel.getRecentMessages(Number(conversationId), 20);

      // 调用 AI 服务
      const aiResponse = await AIService.chat(recentMessages, model);

      // 更新原消息
      MessageModel.update(Number(messageId), aiResponse);

      res.json({
        success: true,
        data: {
          id: Number(messageId),
          content: aiResponse
        }
      });
    } catch (error: any) {
      console.error('重新生成回复失败:', error);
      res.status(500).json({ error: error.message || '服务器错误' });
    }
  }

  /**
   * 编辑消息
   */
  static async editMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: '消息内容不能为空' });
      }

      const success = MessageModel.update(Number(id), content);

      if (!success) {
        return res.status(404).json({ error: '消息不存在' });
      }

      res.json({
        success: true,
        message: '消息更新成功'
      });
    } catch (error) {
      console.error('编辑消息失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 切换消息收藏状态
   */
  static async toggleFavorite(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const success = MessageModel.toggleFavorite(Number(id));

      if (!success) {
        return res.status(404).json({ error: '消息不存在' });
      }

      res.json({
        success: true,
        message: '收藏状态更新成功'
      });
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 获取用户的所有收藏消息
   */
  static async getFavorites(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: '缺少用户 ID' });
      }

      const favorites = MessageModel.getFavorites(Number(userId));

      res.json({
        success: true,
        data: favorites
      });
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 获取消息的所有版本
   */
  static async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const versions = MessageModel.getVersions(Number(id));

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('获取版本列表失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 切换消息版本
   */
  static async switchVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { version } = req.body;

      if (!version) {
        return res.status(400).json({ error: '缺少版本号' });
      }

      const success = MessageModel.switchVersion(Number(id), Number(version));

      if (!success) {
        return res.status(404).json({ error: '版本不存在' });
      }

      // 获取更新后的消息
      const message = MessageModel.findById(Number(id));

      if (!message) {
        return res.status(404).json({ error: '消息不存在' });
      }

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('切换版本失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }
}
