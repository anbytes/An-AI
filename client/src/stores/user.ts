import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User } from '../types';
import { userApi } from '../api/user';

/**
 * 用户状态管理
 */
export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null);

  /**
   * 初始化用户（从 localStorage 恢复或创建新用户）
   */
  async function initUser() {
    const savedNickname = localStorage.getItem('nickname');

    if (savedNickname) {
      try {
        const res = await userApi.createOrGet(savedNickname);
        currentUser.value = res.data;
      } catch (error) {
        console.error('初始化用户失败:', error);
      }
    }
  }

  /**
   * 设置用户昵称
   */
  async function setNickname(nickname: string) {
    try {
      const res = await userApi.createOrGet(nickname);
      currentUser.value = res.data;
      localStorage.setItem('nickname', nickname);
      return true;
    } catch (error) {
      console.error('设置昵称失败:', error);
      return false;
    }
  }

  /**
   * 更新用户昵称
   */
  async function updateNickname(nickname: string) {
    if (!currentUser.value) return false;

    try {
      await userApi.updateNickname(currentUser.value.id, nickname);
      currentUser.value.nickname = nickname;
      localStorage.setItem('nickname', nickname);
      return true;
    } catch (error) {
      console.error('更新昵称失败:', error);
      return false;
    }
  }

  return {
    currentUser,
    initUser,
    setNickname,
    updateNickname
  };
});
