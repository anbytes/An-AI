import { db } from '../database/init.js';
import type { Conversation } from '../types/index.js';
import { getCurrentUTCTime } from '../utils/time.js';

/**
 * 会话模型
 */
export class ConversationModel {
  /**
   * 创建新会话
   */
  static create(userId: number, title: string, model?: string): Conversation {
    const createdAt = getCurrentUTCTime();
    const result = db
      .prepare(
        'INSERT INTO conversations (user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(userId, title, model || null, createdAt, createdAt);

    return {
      id: result.lastInsertRowid as number,
      user_id: userId,
      title,
      model: model || null,
      created_at: createdAt,
      updated_at: createdAt
    };
  }

  /**
   * 获取用户的所有会话
   */
  static findByUserId(userId: number): Conversation[] {
    return db
      .prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as Conversation[];
  }

  /**
   * 根据 ID 获取会话
   */
  static findById(id: number): Conversation | undefined {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as
      | Conversation
      | undefined;
  }

  /**
   * 更新会话标题
   */
  static updateTitle(id: number, title: string): boolean {
    const result = db
      .prepare(
        'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(title, id);

    return result.changes > 0;
  }

  /**
   * 更新会话的最后更新时间
   */
  static touch(id: number): boolean {
    const result = db
      .prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  /**
   * 删除会话
   */
  static delete(id: number): boolean {
    const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
