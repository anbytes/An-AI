/**
 * 用户类型
 */
export interface User {
  id: number;
  nickname: string;
  created_at: string;
  updated_at: string;
}

/**
 * 会话类型
 */
export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 消息类型
 */
export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  is_favorited?: number;
  current_version?: number;
  total_versions?: number;
  created_at: string;
}

/**
 * 消息版本类型
 */
export interface MessageVersion {
  version: number;
  content: string;
  created_at: string;
}

/**
 * 系统配置类型
 */
export interface Setting {
  id: number;
  user_id: number;
  key: string;
  value: string;
  updated_at: string;
}

/**
 * AI 模型配置
 */
export interface AIModelConfig {
  name: string;
  apiKey: string;
  apiUrl: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * 聊天请求
 */
export interface ChatRequest {
  conversationId: number;
  message: string;
  model: string;
}

/**
 * 聊天响应
 */
export interface ChatResponse {
  id: number;
  role: 'assistant';
  content: string;
  created_at: string;
}
