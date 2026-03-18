import { Request, Response } from 'express';
import { ConversationModel } from '../models/Conversation.js';
import { MessageModel } from '../models/Message.js';
import { toBeijingTimeString } from '../utils/time.js';

/**
 * 会话控制器
 */
export class ConversationController {
  /**
   * 获取用户的所有会话
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: '缺少用户 ID' });
      }

      const conversations = ConversationModel.findByUserId(Number(userId));

      res.json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('获取会话列表失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 创建新会话
   */
  static async create(req: Request, res: Response) {
    try {
      const { userId, title, model } = req.body;

      if (!userId || !title) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      const conversation = ConversationModel.create(Number(userId), title, model);

      res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('创建会话失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 更新会话标题
   */
  static async updateTitle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({ error: '标题不能为空' });
      }

      const success = ConversationModel.updateTitle(Number(id), title);

      if (!success) {
        return res.status(404).json({ error: '会话不存在' });
      }

      res.json({
        success: true,
        message: '会话标题更新成功'
      });
    } catch (error) {
      console.error('更新会话标题失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 删除会话
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const success = ConversationModel.delete(Number(id));

      if (!success) {
        return res.status(404).json({ error: '会话不存在' });
      }

      res.json({
        success: true,
        message: '会话删除成功'
      });
    } catch (error) {
      console.error('删除会话失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 获取会话的消息列表
   */
  static async getMessages(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const messages = MessageModel.findByConversationId(Number(id));

      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('获取消息列表失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 导出会话为 Markdown 或 TXT 格式
   */
  static async export(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { format = 'md' } = req.query;

      const conversation = ConversationModel.findById(Number(id));
      if (!conversation) {
        return res.status(404).json({ error: '会话不存在' });
      }

      const messages = MessageModel.findByConversationId(Number(id));

      let content = '';
      const timestamp = toBeijingTimeString(new Date().toISOString());

      if (format === 'md') {
        // Markdown 格式
        content = `# ${conversation.title}\n\n`;
        content += `**导出时间**: ${timestamp}\n`;
        content += `**模型**: ${conversation.model || '未知'}\n\n`;
        content += `---\n\n`;

        messages.forEach(msg => {
          const role = msg.role === 'user' ? '👤 用户' : '🤖 AI';
          const msgTime = toBeijingTimeString(msg.created_at);
          content += `## ${role}\n\n`;
          content += `${msg.content}\n\n`;
          content += `*${msgTime}*\n\n`;
          content += `---\n\n`;
        });
      } else {
        // 纯文本格式
        content = `${conversation.title}\n`;
        content += `导出时间: ${timestamp}\n`;
        content += `模型: ${conversation.model || '未知'}\n\n`;
        content += `${'='.repeat(50)}\n\n`;

        messages.forEach(msg => {
          const role = msg.role === 'user' ? '用户' : 'AI';
          const msgTime = toBeijingTimeString(msg.created_at);
          content += `[${role}]\n`;
          content += `${msg.content}\n`;
          content += `时间: ${msgTime}\n\n`;
          content += `${'-'.repeat(50)}\n\n`;
        });
      }

      const fileTimestamp = new Date().toISOString().split('T')[0];
      const filename = `${conversation.title.replace(/[^\w\s-]/g, '')}_${fileTimestamp}.${format === 'md' ? 'md' : 'txt'}`;

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(content);
    } catch (error) {
      console.error('导出会话失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }
}
