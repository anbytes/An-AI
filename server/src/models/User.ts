import { db } from '../database/init.js';
import type { User } from '../types/index.js';
import { getCurrentUTCTime } from '../utils/time.js';

/**
 * 用户模型
 */
export class UserModel {
  /**
   * 根据昵称获取或创建用户
   */
  static findOrCreate(nickname: string): User {
    // 先查找用户
    const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname) as
      | User
      | undefined;

    if (user) {
      return user;
    }

    // 用户不存在，创建新用户
    const createdAt = getCurrentUTCTime();
    const result = db
      .prepare('INSERT INTO users (nickname, created_at, updated_at) VALUES (?, ?, ?)')
      .run(nickname, createdAt, createdAt);

    return {
      id: result.lastInsertRowid as number,
      nickname,
      created_at: createdAt,
      updated_at: createdAt
    };
  }

  /**
   * 根据 ID 获取用户
   */
  static findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  /**
   * 更新用户昵称
   */
  static updateNickname(id: number, nickname: string): boolean {
    const result = db
      .prepare('UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(nickname, id);

    return result.changes > 0;
  }
}
