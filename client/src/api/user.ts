import request from './request';
import type { User } from '../types';

/**
 * 用户相关 API
 */
export const userApi = {
  /**
   * 创建或获取用户
   */
  createOrGet(nickname: string): Promise<{ success: boolean; data: User }> {
    return request.post('/users', { nickname });
  },

  /**
   * 更新用户昵称
   */
  updateNickname(id: number, nickname: string): Promise<{ success: boolean; message: string }> {
    return request.put(`/users/${id}`, { nickname });
  }
};
