import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Conversation, Message, ModelOption } from '../types';
import { conversationApi } from '../api/conversation';
import { chatApi } from '../api/chat';
import { useUserStore } from './user';

/**
 * 聊天状态管理
 */
export const useChatStore = defineStore('chat', () => {
  const userStore = useUserStore();

  // 会话列表
  const conversations = ref<Conversation[]>([]);
  // 当前会话 ID
  const currentConversationId = ref<number | null>(null);
  // 当前会话的消息列表
  const messages = ref<Message[]>([]);
  // 当前选择的模型（从 localStorage 恢复或使用默认值）
  const currentModel = ref<string>(localStorage.getItem('preferredModel') || 'qwen-plus');
  // 是否正在发送消息
  const isSending = ref(false);

  // 可用的模型列表
  const modelOptions: ModelOption[] = [
    { label: '通义千问 Plus', value: 'qwen-plus', provider: 'qwen' },
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', provider: 'gemini' },
    {
      label: 'DeepSeek Chat（收费）',
      value: 'deepseek-chat',
      provider: 'deepseek',
      disabled: true,
      disabledReason: '该模型需要充值后才能使用'
    },
    {
      label: 'DeepSeek Coder（收费）',
      value: 'deepseek-coder',
      provider: 'deepseek',
      disabled: true,
      disabledReason: '该模型需要充值后才能使用'
    }
  ];

  // 当前会话
  const currentConversation = computed(() => {
    return conversations.value.find(c => c.id === currentConversationId.value);
  });

  /**
   * 监听模型变化，自动保存到 localStorage
   */
  watch(currentModel, newModel => {
    localStorage.setItem('preferredModel', newModel);
    console.log('已保存首选模型:', newModel);
  });

  /**
   * 加载会话列表
   */
  async function loadConversations() {
    if (!userStore.currentUser) return;

    try {
      const res = await conversationApi.getAll(userStore.currentUser.id);
      conversations.value = res.data;
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  }

  /**
   * 创建新会话
   */
  async function createConversation(title: string = '新对话') {
    console.log('createConversation 被调用');
    console.log('当前用户:', userStore.currentUser);

    if (!userStore.currentUser) {
      console.error('当前用户为空，无法创建会话');
      throw new Error('请先登录');
    }

    try {
      console.log('调用 API 创建会话...');
      const res = await conversationApi.create(userStore.currentUser.id, title, currentModel.value);
      console.log('API 返回结果:', res);

      conversations.value.unshift(res.data);
      currentConversationId.value = res.data.id;
      messages.value = [];

      console.log('会话创建完成，ID:', res.data.id);
      return res.data;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  /**
   * 切换会话
   */
  async function switchConversation(id: number) {
    currentConversationId.value = id;
    await loadMessages(id);
  }

  /**
   * 加载会话的消息列表
   */
  async function loadMessages(conversationId: number) {
    try {
      const res = await conversationApi.getMessages(conversationId);
      messages.value = res.data;
    } catch (error) {
      console.error('加载消息列表失败:', error);
    }
  }

  /**
   * 发送消息（流式输出）
   */
  async function sendMessage(content: string) {
    if (!currentConversationId.value || isSending.value) return;

    isSending.value = true;

    // 创建临时用户消息（使用 UTC 时间）
    const tempUserMessage: Message = {
      id: Date.now(),
      conversation_id: currentConversationId.value,
      role: 'user',
      content: content,
      created_at: new Date().toISOString()
    };

    // 立即显示用户消息
    messages.value.push(tempUserMessage);

    // 创建临时 AI 消息 ID
    const tempAiMessageId = Date.now() + 1;
    let aiMessageAdded = false;

    try {
      await chatApi.sendMessageStream(
        currentConversationId.value,
        content,
        currentModel.value,
        // 接收流式数据块
        (chunk: string) => {
          // 如果 AI 消息还没添加到列表，先添加
          if (!aiMessageAdded) {
            messages.value.push({
              id: tempAiMessageId,
              conversation_id: currentConversationId.value!,
              role: 'assistant',
              content: chunk,
              created_at: new Date().toISOString()
            });
            aiMessageAdded = true;
          } else {
            // 找到消息并更新内容
            const index = messages.value.findIndex(m => m.id === tempAiMessageId);
            if (index !== -1) {
              // 创建新对象以触发响应式更新
              messages.value[index] = {
                ...messages.value[index],
                content: messages.value[index].content + chunk
              };
            }
          }
        },
        // 接收用户消息
        (userMsg: Message) => {
          // 替换临时用户消息
          const index = messages.value.findIndex(m => m.id === tempUserMessage.id);
          if (index !== -1) {
            messages.value[index] = userMsg;
          }
        },
        // 完成时接收最终的 AI 消息
        (aiMsg: Message) => {
          // 先移除临时 AI 消息
          messages.value = messages.value.filter(m => m.id !== tempAiMessageId);
          // 然后添加服务器返回的最终消息
          messages.value.push(aiMsg);
          // 更新会话列表
          loadConversations();
        },
        // 错误处理
        (error: string) => {
          console.error('流式输出错误:', error);
          // 移除临时消息
          messages.value = messages.value.filter(
            m => m.id !== tempUserMessage.id && m.id !== tempAiMessageId
          );
          // 添加错误消息
          const errorMessage: Message = {
            id: Date.now() + 2,
            conversation_id: currentConversationId.value!,
            role: 'assistant',
            content: `❌ **发送失败**\n\n${error}\n\n_提示：你可以点击重新生成按钮重试_`,
            created_at: new Date().toISOString()
          };
          messages.value.push(errorMessage);
        }
      );
    } catch (error: any) {
      console.error('发送消息失败:', error);
    } finally {
      isSending.value = false;
    }
  }

  /**
   * 删除会话
   */
  async function deleteConversation(id: number) {
    try {
      await conversationApi.delete(id);
      conversations.value = conversations.value.filter(c => c.id !== id);

      if (currentConversationId.value === id) {
        currentConversationId.value = null;
        messages.value = [];
      }
    } catch (error) {
      console.error('删除会话失败:', error);
      throw error;
    }
  }

  /**
   * 重命名会话
   */
  async function renameConversation(id: number, title: string) {
    try {
      await conversationApi.updateTitle(id, title);
      const conversation = conversations.value.find(c => c.id === id);
      if (conversation) {
        conversation.title = title;
      }
    } catch (error) {
      console.error('重命名会话失败:', error);
      throw error;
    }
  }

  return {
    conversations,
    currentConversationId,
    currentConversation,
    messages,
    currentModel,
    isSending,
    modelOptions,
    loadConversations,
    createConversation,
    switchConversation,
    loadMessages,
    sendMessage,
    deleteConversation,
    renameConversation
  };
});
