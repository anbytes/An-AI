import request from './request';
import type { Message } from '../types';

/**
 * 聊天相关 API
 */
export const chatApi = {
  /**
   * 发送消息（流式输出）
   */
  async sendMessageStream(
    conversationId: number,
    message: string,
    model: string,
    onChunk: (chunk: string) => void,
    onUserMessage: (msg: Message) => void,
    onComplete: (msg: Message) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId, message, model })
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'userMessage') {
                onUserMessage(parsed.data);
              } else if (parsed.type === 'chunk') {
                onChunk(parsed.data);
              } else if (parsed.type === 'done') {
                onComplete(parsed.data);
              } else if (parsed.type === 'error') {
                onError(parsed.data.message);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message || '网络错误');
    }
  },

  /**
   * 发送消息（非流式，保留用于兼容）
   */
  sendMessage(
    conversationId: number,
    message: string,
    model: string
  ): Promise<{
    success: boolean;
    data: {
      userMessage: Message;
      assistantMessage: Message;
    };
  }> {
    return request.post('/chat', { conversationId, message, model });
  },

  /**
   * 重新生成回复
   */
  regenerate(
    conversationId: number,
    messageId: number,
    model: string
  ): Promise<{
    success: boolean;
    data: {
      id: number;
      content: string;
    };
  }> {
    return request.post('/chat/regenerate', { conversationId, messageId, model });
  },

  /**
   * 编辑消息
   */
  editMessage(id: number, content: string): Promise<{ success: boolean; message: string }> {
    return request.put(`/messages/${id}`, { content });
  },

  /**
   * 切换消息收藏状态
   */
  toggleFavorite(id: number): Promise<{ success: boolean; message: string }> {
    return request.post(`/messages/${id}/favorite`);
  },

  /**
   * 获取用户的所有收藏消息
   */
  getFavorites(userId: number): Promise<{ success: boolean; data: Message[] }> {
    return request.get('/messages/favorites', { params: { userId } });
  },

  /**
   * 获取消息的所有版本
   */
  getVersions(
    messageId: number
  ): Promise<{ success: boolean; data: { version: number; content: string; created_at: string }[] }> {
    return request.get(`/messages/${messageId}/versions`);
  },

  /**
   * 切换消息版本
   */
  switchVersion(
    messageId: number,
    version: number
  ): Promise<{ success: boolean; data: Message }> {
    return request.put(`/messages/${messageId}/version`, { version });
  },

  /**
   * 添加新版本（重新生成时调用）
   */
  async addVersion(messageId: number, content: string): Promise<void> {
    // 这个方法在后端的 addVersion 中自动处理，前端不需要直接调用
    // 保留此方法用于未来可能的扩展
    return Promise.resolve();
  },

  /**
   * 重新生成回复（流式输出）
   */
  async regenerateStream(
    conversationId: number,
    messageId: number,
    model: string,
    onChunk: (chunk: string) => void,
    onComplete: (msg: Message) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      console.log('开始重新生成:', { conversationId, messageId, model });
      
      const response = await fetch('http://localhost:3000/api/chat/regenerate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId, messageId, model })
      });

      console.log('响应状态:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('流读取完成，共接收', chunkCount, '个数据块');
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              console.log('接收到数据:', parsed.type, parsed.data);
              chunkCount++;

              if (parsed.type === 'chunk') {
                onChunk(parsed.data);
              } else if (parsed.type === 'done') {
                onComplete(parsed.data);
              } else if (parsed.type === 'error') {
                onError(parsed.data.message);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e, '原始数据:', data);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('regenerateStream 错误:', error);
      onError(error.message || '网络错误');
    }
  }
};
