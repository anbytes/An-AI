import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';

/**
 * 用户控制器
 */
export class UserController {
  /**
   * 创建或获取用户（通过昵称）
   */
  static async createOrGet(req: Request, res: Response) {
    try {
      const { nickname } = req.body;

      if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
        return res.status(400).json({ error: '昵称不能为空' });
      }

      const user = UserModel.findOrCreate(nickname.trim());

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('创建/获取用户失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }

  /**
   * 更新用户昵称
   */
  static async updateNickname(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nickname } = req.body;

      if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
        return res.status(400).json({ error: '昵称不能为空' });
      }

      const success = UserModel.updateNickname(Number(id), nickname.trim());

      if (!success) {
        return res.status(404).json({ error: '用户不存在' });
      }

      res.json({
        success: true,
        message: '昵称更新成功'
      });
    } catch (error) {
      console.error('更新昵称失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  }
}
