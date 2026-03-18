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
 * AI 模型选项
 */
export interface ModelOption {
  label: string;
  value: string;
  provider: 'qwen' | 'groq' | 'gemini' | 'deepseek';
  disabled?: boolean;
  disabledReason?: string;
}
