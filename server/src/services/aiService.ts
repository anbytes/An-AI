import axios from 'axios';
import type { Message } from '../types/index.js';

/**
 * AI 服务类
 */
export class AIService {
  /**
   * 调用通义千问 API（OpenAI 兼容格式）
   */
  static async callQwen(messages: Message[], temperature: number = 0.7): Promise<string> {
    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey || apiKey === '你的通义千问API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 QWEN_API_KEY');
    }

    try {
      // 使用 OpenAI 兼容格式
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-plus', // 使用 qwen-plus 模型
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 300000 // 5 分钟超时
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('通义千问 API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 调用 DeepSeek API（OpenAI 兼容格式）
   */
  static async callDeepSeek(messages: Message[], model: string = 'deepseek-chat', temperature: number = 0.7): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === '你的DeepSeek_API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 DEEPSEEK_API_KEY');
    }

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 300000 // 5 分钟超时
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('DeepSeek API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 调用 Google Gemini API
   */
  static async callGemini(messages: Message[], model: string = 'gemini-1.5-flash', temperature: number = 0.7): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === '你的Gemini_API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 GEMINI_API_KEY');
    }

    try {
      // 将消息转换为 Gemini API 格式
      // Gemini 需要 contents 数组，每个元素包含 parts
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: 8192
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          timeout: 300000 // 5 分钟超时
        }
      );

      return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      console.error('Gemini API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 根据模型名称调用对应的 AI 服务
   */
  static async chat(messages: Message[], model: string, temperature: number = 0.7): Promise<string> {
    if (model.startsWith('qwen')) {
      return this.callQwen(messages, temperature);
    } else if (model.startsWith('deepseek')) {
      return this.callDeepSeek(messages, model, temperature);
    } else if (model.startsWith('gemini')) {
      return this.callGemini(messages, model, temperature);
    } else {
      throw new Error(`不支持的模型: ${model}`);
    }
  }

  /**
   * 调用通义千问 API（流式输出）
   */
  static async callQwenStream(
    messages: Message[],
    temperature: number = 0.7,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey || apiKey === '你的通义千问API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 QWEN_API_KEY');
    }

    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-plus',
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature,
          stream: true // 启用流式输出
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 300000,
          responseType: 'stream' // 接收流式响应
        }
      );

      // 处理流式数据
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error: any) {
      console.error('通义千问流式 API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 调用 DeepSeek API（流式输出）
   */
  static async callDeepSeekStream(
    messages: Message[],
    model: string = 'deepseek-chat',
    temperature: number = 0.7,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === '你的DeepSeek_API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 DEEPSEEK_API_KEY');
    }

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature,
          stream: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          timeout: 300000,
          responseType: 'stream'
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error: any) {
      console.error('DeepSeek 流式 API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 调用 Google Gemini API（流式输出）
   */
  static async callGeminiStream(
    messages: Message[],
    model: string = 'gemini-1.5-flash',
    temperature: number = 0.7,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === '你的Gemini_API_KEY') {
      throw new Error('请在 .env 文件中配置有效的 GEMINI_API_KEY');
    }

    try {
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens: 8192
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000,
          responseType: 'stream'
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error: any) {
      console.error('Gemini 流式 API 调用失败:', error.response?.data || error.message);
      throw new Error('AI 服务调用失败');
    }
  }

  /**
   * 根据模型名称调用对应的 AI 服务（流式输出）
   */
  static async chatStream(
    messages: Message[],
    model: string,
    onChunk: (chunk: string) => void,
    temperature: number = 0.7
  ): Promise<void> {
    if (model.startsWith('qwen')) {
      return this.callQwenStream(messages, temperature, onChunk);
    } else if (model.startsWith('deepseek')) {
      return this.callDeepSeekStream(messages, model, temperature, onChunk);
    } else if (model.startsWith('gemini')) {
      return this.callGeminiStream(messages, model, temperature, onChunk);
    } else {
      throw new Error(`不支持的模型: ${model}`);
    }
  }
}
