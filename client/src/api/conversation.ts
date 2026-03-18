import request from './request';
import type { Conversation, Message } from '../types';

/**
 * 会话相关 API
 */
export const conversationApi = {
  /**
   * 获取用户的所有会话
   */
  getAll(userId: number): Promise<{ success: boolean; data: Conversation[] }> {
    return request.get('/conversations', { params: { userId } });
  },

  /**
   * 创建新会话
   */
  create(
    userId: number,
    title: string,
    model?: string
  ): Promise<{ success: boolean; data: Conversation }> {
    return request.post('/conversations', { userId, title, model });
  },

  /**
   * 更新会话标题
   */
  updateTitle(id: number, title: string): Promise<{ success: boolean; message: string }> {
    return request.put(`/conversations/${id}`, { title });
  },

  /**
   * 删除会话
   */
  delete(id: number): Promise<{ success: boolean; message: string }> {
    return request.delete(`/conversations/${id}`);
  },

  /**
   * 获取会话的消息列表
   */
  getMessages(id: number): Promise<{ success: boolean; data: Message[] }> {
    return request.get(`/conversations/${id}/messages`);
  },

  /**
   * 导出会话
   */
  export(id: number, format: 'md' | 'txt' = 'md'): Promise<Blob> {
    return request.get(`/conversations/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }
};
