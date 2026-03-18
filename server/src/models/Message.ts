import { db } from '../database/init.js';
import type { Message } from '../types/index.js';
import { getCurrentUTCTime } from '../utils/time.js';

/**
 * 消息模型
 */
export class MessageModel {
  /**
   * 创建新消息
   */
  static create(
    conversationId: number,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Message {
    const createdAt = getCurrentUTCTime();
    const result = db
      .prepare(
        'INSERT INTO messages (conversation_id, role, content, created_at, current_version, total_versions) VALUES (?, ?, ?, ?, 1, 1)'
      )
      .run(conversationId, role, content, createdAt);

    const messageId = result.lastInsertRowid as number;

    // 为 AI 消息创建第一个版本
    if (role === 'assistant') {
      db.prepare(
        'INSERT INTO message_versions (message_id, version, content, created_at) VALUES (?, 1, ?, ?)'
      ).run(messageId, content, createdAt);
    }

    return {
      id: messageId,
      conversation_id: conversationId,
      role,
      content,
      created_at: createdAt,
      current_version: 1,
      total_versions: 1
    };
  }

  /**
   * 根据 ID 获取单条消息
   */
  static findById(id: number): Message | undefined {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined;
  }

  /**
   * 获取会话的所有消息
   */
  static findByConversationId(conversationId: number, limit?: number): Message[] {
    if (limit) {
      // 获取最近 N 条消息
      return db
        .prepare(
          `
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `
        )
        .all(conversationId, limit) as Message[];
    }

    return db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId) as Message[];
  }

  /**
   * 获取会话的最近 N 条消息（用于上下文）
   */
  static getRecentMessages(conversationId: number, limit: number = 20): Message[] {
    const messages = db
      .prepare(
        `
      SELECT * FROM (
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      ) ORDER BY created_at ASC
    `
      )
      .all(conversationId, limit) as Message[];

    return messages;
  }

  /**
   * 删除消息
   */
  static delete(id: number): boolean {
    const result = db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * 更新消息内容
   */
  static update(id: number, content: string): boolean {
    const result = db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(content, id);
    return result.changes > 0;
  }

  /**
   * 切换消息收藏状态
   */
  static toggleFavorite(id: number): boolean {
    const result = db
      .prepare('UPDATE messages SET is_favorited = NOT is_favorited WHERE id = ?')
      .run(id);
    return result.changes > 0;
  }

  /**
   * 获取用户的所有收藏消息
   */
  static getFavorites(userId: number): Message[] {
    return db
      .prepare(
        `
      SELECT m.* FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.is_favorited = 1
      ORDER BY m.created_at DESC
    `
      )
      .all(userId) as Message[];
  }

  /**
   * 删除会话的所有消息
   */
  static deleteByConversationId(conversationId: number): boolean {
    const result = db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
    return result.changes > 0;
  }

  /**
   * 获取消息的所有版本
   */
  static getVersions(messageId: number) {
    return db
      .prepare(
        'SELECT version, content, created_at FROM message_versions WHERE message_id = ? ORDER BY version ASC'
      )
      .all(messageId);
  }

  /**
   * 切换消息版本
   */
  static switchVersion(messageId: number, version: number): boolean {
    // 获取指定版本的内容
    const versionData = db
      .prepare('SELECT content FROM message_versions WHERE message_id = ? AND version = ?')
      .get(messageId, version) as { content: string } | undefined;

    if (!versionData) {
      return false;
    }

    // 更新消息的当前版本和内容
    const result = db
      .prepare('UPDATE messages SET content = ?, current_version = ? WHERE id = ?')
      .run(versionData.content, version, messageId);

    return result.changes > 0;
  }

  /**
   * 为消息添加新版本（重新生成时调用）
   */
  static addVersion(messageId: number, content: string): number {
    const createdAt = getCurrentUTCTime();

    // 获取当前总版本数
    const message = db.prepare('SELECT total_versions FROM messages WHERE id = ?').get(messageId) as
      | { total_versions: number }
      | undefined;

    if (!message) {
      throw new Error('消息不存在');
    }

    const newVersion = message.total_versions + 1;

    // 如果版本数超过 5，删除最旧的版本
    if (message.total_versions >= 5) {
      // 删除版本 1
      db.prepare('DELETE FROM message_versions WHERE message_id = ? AND version = 1').run(
        messageId
      );

      // 将所有版本号减 1
      db.prepare('UPDATE message_versions SET version = version - 1 WHERE message_id = ?').run(
        messageId
      );

      // 新版本号仍然是 5
      const adjustedVersion = 5;

      // 插入新版本
      db.prepare(
        'INSERT INTO message_versions (message_id, version, content, created_at) VALUES (?, ?, ?, ?)'
      ).run(messageId, adjustedVersion, content, createdAt);

      // 更新消息表
      db.prepare(
        'UPDATE messages SET content = ?, current_version = ?, total_versions = ? WHERE id = ?'
      ).run(content, adjustedVersion, 5, messageId);

      return adjustedVersion;
    } else {
      // 插入新版本
      db.prepare(
        'INSERT INTO message_versions (message_id, version, content, created_at) VALUES (?, ?, ?, ?)'
      ).run(messageId, newVersion, content, createdAt);

      // 更新消息表
      db.prepare(
        'UPDATE messages SET content = ?, current_version = ?, total_versions = ? WHERE id = ?'
      ).run(content, newVersion, newVersion, messageId);

      return newVersion;
    }
  }
}
