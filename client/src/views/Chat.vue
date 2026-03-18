<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <el-button type="primary" :icon="Plus" style="width: 100%" @click="handleNewChat">
          新建对话
        </el-button>
      </div>

      <!-- 标签页切换 -->
      <div class="sidebar-tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'conversations' }"
          @click="handleTabChange('conversations')"
        >
          会话列表
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'favorites' }"
          @click="handleTabChange('favorites')"
        >
          收藏
        </div>
      </div>

      <!-- 会话列表 -->
      <div v-if="activeTab === 'conversations'" class="conversation-list">
        <div
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === chatStore.currentConversationId }"
          @click="handleSwitchConversation(conv.id)"
        >
          <span class="conversation-title">{{ conv.title }}</span>
          <div class="conversation-actions">
            <el-icon class="action-icon" @click.stop="handleRenameConversation(conv)">
              <Edit />
            </el-icon>
            <el-icon class="action-icon" @click.stop="handleDeleteConversation(conv.id)">
              <Delete />
            </el-icon>
          </div>
        </div>
      </div>

      <!-- 收藏列表 -->
      <div v-else class="favorites-list">
        <div v-if="favoriteMessages.length === 0" class="empty-favorites">
          <p>暂无收藏</p>
        </div>
        <div
          v-for="msg in favoriteMessages"
          :key="msg.id"
          class="favorite-item"
          @click="handleShowFavoriteDetail(msg)"
        >
          <div class="favorite-header">
            <span class="favorite-role">{{ msg.role === 'user' ? '👤 我' : '🤖 AI' }}</span>
            <span class="favorite-time">{{ formatTime(msg.created_at) }}</span>
          </div>
          <div class="favorite-content">
            <!-- AI 消息：Markdown 渲染 -->
            <template v-if="msg.role === 'assistant'">
              <div v-if="expandedFavorites.has(msg.id)" class="favorite-markdown">
                <MarkdownRenderer :content="msg.content" />
              </div>
              <div v-else class="favorite-markdown">
                <MarkdownRenderer
                  :content="msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')"
                />
              </div>
            </template>
            <!-- 用户消息：纯文本 -->
            <template v-else>
              <template v-if="expandedFavorites.has(msg.id)">
                {{ msg.content }}
              </template>
              <template v-else>
                {{ msg.content.substring(0, 100) }}{{ msg.content.length > 100 ? '...' : '' }}
              </template>
            </template>
          </div>
          <div v-if="msg.content.length > 100" class="favorite-expand">
            <el-button :text="true" size="small" @click.stop="toggleFavoriteExpand(msg.id)">
              {{ expandedFavorites.has(msg.id) ? '收起' : '展开' }}
            </el-button>
          </div>
          <div class="favorite-actions" @click.stop>
            <el-tooltip content="取消收藏" placement="top">
              <el-icon class="action-icon favorited" @click="handleToggleFavorite(msg)">
                <StarFilled />
              </el-icon>
            </el-tooltip>
            <el-tooltip content="复制" placement="top">
              <el-icon class="action-icon" @click="handleCopy(msg.content)">
                <DocumentCopy />
              </el-icon>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏详情弹窗 -->
    <el-dialog
      v-model="showFavoriteDetail"
      title="收藏详情"
      width="70%"
      :close-on-click-modal="false"
    >
      <div v-if="currentFavorite" class="favorite-detail">
        <div class="favorite-detail-header">
          <span class="favorite-detail-role">
            {{ currentFavorite.role === 'user' ? '👤 我' : '🤖 AI' }}
          </span>
          <span class="favorite-detail-time">{{ formatTime(currentFavorite.created_at) }}</span>
        </div>
        <div class="favorite-detail-content">
          <MarkdownRenderer
            v-if="currentFavorite.role === 'assistant'"
            :content="currentFavorite.content"
          />
          <div v-else class="user-message-content">{{ currentFavorite.content }}</div>
        </div>
      </div>
      <template #footer>
        <div class="favorite-detail-actions">
          <el-button @click="handleCopy(currentFavorite?.content || '')">
            <el-icon><DocumentCopy /></el-icon>
            复制
          </el-button>
          <el-button
            @click="
              handleToggleFavorite(currentFavorite!);
              showFavoriteDetail = false;
            "
          >
            <el-icon><StarFilled /></el-icon>
            取消收藏
          </el-button>
          <el-button type="primary" @click="showFavoriteDetail = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 主聊天区域 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <div class="header">
        <el-icon class="menu-icon" @click="toggleSidebar">
          <Expand v-if="sidebarCollapsed" />
          <Fold v-else />
        </el-icon>
        <span class="title">{{ chatStore.currentConversation?.title || 'An-AI' }}</span>

        <!-- 导出按钮 -->
        <el-dropdown v-if="chatStore.currentConversationId" @command="handleExport">
          <el-button text>
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="md">导出为 Markdown</el-dropdown-item>
              <el-dropdown-item command="txt">导出为文本</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-select v-model="chatStore.currentModel" placeholder="选择模型" style="width: 200px">
          <el-option
            v-for="model in chatStore.modelOptions"
            :key="model.value"
            :label="model.label"
            :value="model.value"
            :disabled="model.disabled"
          >
            <span>{{ model.label }}</span>
            <span v-if="model.disabled" style="color: #999; font-size: 12px; margin-left: 8px">
              {{ model.disabledReason }}
            </span>
          </el-option>
        </el-select>

        <!-- 用户信息 -->
        <div class="user-profile" @click="showSettings = true">
          <div class="user-avatar">{{ userStore.currentUser?.nickname?.charAt(0) || '?' }}</div>
          <span class="user-nickname">{{ userStore.currentUser?.nickname }}</span>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messageListRef" class="message-list">
        <div v-if="chatStore.messages.length === 0" class="empty-state">
          <h2>👋 你好！我是 An-AI</h2>
          <p>开始一段新的对话吧</p>
        </div>

        <div
          v-for="msg in chatStore.messages"
          :id="`message-${msg.id}`"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
          :data-message-id="msg.id"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <!-- 用户消息：纯文本 -->
            <div v-if="msg.role === 'user'" class="message-text">{{ msg.content }}</div>

            <!-- AI 消息：Markdown 渲染 -->
            <div v-else class="message-text">
              <MarkdownRenderer :content="msg.content" />
            </div>

            <!-- 版本切换器（仅 AI 消息且有多个版本时显示） -->
            <div
              v-if="msg.role === 'assistant' && msg.total_versions && msg.total_versions > 1"
              class="version-switcher"
            >
              <el-button
                :icon="ArrowLeft"
                size="small"
                text
                :disabled="msg.current_version === 1"
                @click="handleSwitchVersion(msg, (msg.current_version || 1) - 1)"
              />
              <span class="version-info">
                {{ msg.current_version || 1 }}/{{ msg.total_versions }}
              </span>
              <el-button
                :icon="ArrowRight"
                size="small"
                text
                :disabled="msg.current_version === msg.total_versions"
                @click="handleSwitchVersion(msg, (msg.current_version || 1) + 1)"
              />
            </div>

            <div class="message-footer">
              <span class="message-time">{{ formatTime(msg.created_at) }}</span>

              <!-- 消息操作按钮 -->
              <div class="message-actions">
                <el-tooltip :content="msg.is_favorited ? '取消收藏' : '收藏'" placement="top">
                  <el-icon
                    class="action-icon"
                    :class="{ favorited: msg.is_favorited }"
                    @click="handleToggleFavorite(msg)"
                  >
                    <StarFilled v-if="msg.is_favorited" />
                    <Star v-else />
                  </el-icon>
                </el-tooltip>

                <el-tooltip content="复制" placement="top">
                  <el-icon class="action-icon" @click="handleCopy(msg.content)">
                    <DocumentCopy />
                  </el-icon>
                </el-tooltip>

                <el-tooltip v-if="msg.role === 'user'" content="编辑" placement="top">
                  <el-icon class="action-icon" @click="handleEditMessage(msg)">
                    <Edit />
                  </el-icon>
                </el-tooltip>

                <el-tooltip v-if="msg.role === 'assistant'" content="重新生成" placement="top">
                  <el-icon class="action-icon" @click="handleRegenerate(msg)">
                    <Refresh />
                  </el-icon>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="input-area">
        <el-input
          ref="inputRef"
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          :disabled="chatStore.isSending"
          @keydown="handleKeyDown"
        />
        <el-button
          type="primary"
          :loading="chatStore.isSending"
          :disabled="!inputMessage.trim()"
          @click="handleSend"
        >
          {{ chatStore.isSending ? '发送中' : '发送' }}
        </el-button>
      </div>
    </div>

    <!-- 对话导航组件（固定在屏幕右侧居中） -->
    <div v-if="topics.length > 0" class="navigation-widget">
      <!-- 紧凑模式 -->
      <template v-if="!navigationListExpanded">
        <div class="navigation-compact">
          <el-tooltip content="第一个话题" placement="left">
            <el-icon
              class="nav-btn"
              :class="{ disabled: currentTopicIndex === 0 }"
              @click="navigateToFirst"
            >
              <Top />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="上一个话题" placement="left">
            <el-icon
              class="nav-btn"
              :class="{ disabled: !canNavigatePrev }"
              @click="navigateToPrev"
            >
              <ArrowUp />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="话题导航" placement="left">
            <el-icon class="nav-btn nav-btn-menu" @click="toggleNavigationList">
              <Operation />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="下一个话题" placement="left">
            <el-icon
              class="nav-btn"
              :class="{ disabled: !canNavigateNext }"
              @click="navigateToNext"
            >
              <ArrowDown />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="最后一个话题" placement="left">
            <el-icon
              class="nav-btn"
              :class="{ disabled: currentTopicIndex === topics.length - 1 }"
              @click="navigateToLast"
            >
              <Bottom />
            </el-icon>
          </el-tooltip>
        </div>
      </template>

      <!-- 展开模式 -->
      <template v-else>
        <div class="navigation-expanded">
          <div class="navigation-header">
            <span class="navigation-title">对话导航</span>
            <el-icon class="close-icon" @click="toggleNavigationList">
              <Close />
            </el-icon>
          </div>
          <div class="navigation-content">
            <div class="topic-list">
              <div
                v-for="topic in topics"
                :key="topic.id"
                class="topic-item"
                :class="{ active: activeTopicId === topic.messageId }"
                @click="scrollToTopic(topic.messageId)"
              >
                <span class="topic-title">{{ topic.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 用户设置 -->
    <UserSettings v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Delete,
  Expand,
  Fold,
  DocumentCopy,
  Refresh,
  Edit,
  Download,
  Star,
  StarFilled,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Operation,
  Close,
  Top,
  Bottom
} from '@element-plus/icons-vue';
import { useChatStore } from '../stores/chat';
import { useUserStore } from '../stores/user';
import { conversationApi } from '../api/conversation';
import { chatApi } from '../api/chat';
import MarkdownRenderer from '../components/MarkdownRenderer.vue';
import UserSettings from '../components/UserSettings.vue';
import type { Message } from '../types';

const chatStore = useChatStore();
const userStore = useUserStore();

const inputMessage = ref('');
const sidebarCollapsed = ref(false);
const messageListRef = ref<HTMLElement>();
const showSettings = ref(false);
const inputRef = ref();
const activeTab = ref<'conversations' | 'favorites'>('conversations');
const favoriteMessages = ref<Message[]>([]);
const expandedFavorites = ref<Set<number>>(new Set());
const showFavoriteDetail = ref(false);
const currentFavorite = ref<Message | null>(null);

// 对话导航相关
const navigationListExpanded = ref(false); // 导航列表是否展开
const activeTopicId = ref<number | null>(null); // 当前高亮的话题 ID
const isManualScrolling = ref(false); // 是否正在手动跳转（防止滚动监听器覆盖高亮）

/**
 * 话题接口
 */
interface Topic {
  id: number;
  messageId: number;
  title: string;
}

/**
 * 计算属性：从消息列表中提取话题
 */
const topics = computed<Topic[]>(() => {
  return chatStore.messages
    .filter(msg => msg.role === 'user')
    .map(msg => {
      let title = msg.content.trim();
      // 移除多余空格和换行
      title = title.replace(/\s+/g, ' ');
      // 截取前 20 个字
      if (title.length > 20) {
        title = title.substring(0, 20) + '...';
      }
      return {
        id: msg.id,
        messageId: msg.id,
        title
      };
    });
});

/**
 * 计算属性：当前话题的索引
 */
const currentTopicIndex = computed(() => {
  return topics.value.findIndex(t => t.messageId === activeTopicId.value);
});

/**
 * 计算属性：是否可以导航到上一个话题
 */
const canNavigatePrev = computed(() => {
  return currentTopicIndex.value > 0;
});

/**
 * 计算属性：是否可以导航到下一个话题
 */
const canNavigateNext = computed(() => {
  return currentTopicIndex.value < topics.value.length - 1 && currentTopicIndex.value !== -1;
});

/**
 * 初始化
 */
onMounted(async () => {
  console.log('Chat 组件初始化');
  console.log('当前用户:', userStore.currentUser);

  // 确保用户已初始化
  if (!userStore.currentUser) {
    console.log('用户未初始化，尝试初始化...');
    await userStore.initUser();
    console.log('用户初始化后:', userStore.currentUser);
  }

  await chatStore.loadConversations();

  // 如果有会话，自动选择第一个
  if (chatStore.conversations.length > 0) {
    await chatStore.switchConversation(chatStore.conversations[0].id);
    // 加载完消息后滚动到底部
    await nextTick();
    scrollToBottom();

    // 初始化当前话题高亮（设置为最后一个话题）
    await nextTick();
    initializeActiveTopic();
  }
});

/**
 * 检查用户是否在底部附近（距离底部小于 100px）
 */
function isNearBottom(): boolean {
  if (!messageListRef.value) return true;

  const { scrollTop, scrollHeight, clientHeight } = messageListRef.value;
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;

  return distanceToBottom < 100;
}

/**
 * 监听消息列表变化，只有用户在底部时才自动滚动
 */
watch(
  () => chatStore.messages,
  async () => {
    // 如果正在手动跳转，不自动滚动
    if (isManualScrolling.value) return;

    // 只有用户在底部附近时才自动滚动
    if (isNearBottom()) {
      await nextTick();
      scrollToBottom();
    }
  },
  { deep: true }
);

/**
 * 滚动到消息列表底部
 */
function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  }
}

/**
 * 加载收藏列表
 */
async function loadFavorites() {
  try {
    if (!userStore.currentUser) {
      return;
    }
    const response = await chatApi.getFavorites(userStore.currentUser.id);
    if (response.success) {
      favoriteMessages.value = response.data;
      // 清空展开状态
      expandedFavorites.value.clear();
    }
  } catch {
    ElMessage.error('加载收藏列表失败');
  }
}

/**
 * 切换收藏项的展开/收起状态
 */
function toggleFavoriteExpand(messageId: number) {
  if (expandedFavorites.value.has(messageId)) {
    expandedFavorites.value.delete(messageId);
  } else {
    expandedFavorites.value.add(messageId);
  }
}

/**
 * 显示收藏详情
 */
function handleShowFavoriteDetail(message: Message) {
  currentFavorite.value = message;
  showFavoriteDetail.value = true;
}

/**
 * 切换标签页
 */
async function handleTabChange(tab: 'conversations' | 'favorites') {
  activeTab.value = tab;
  if (tab === 'favorites') {
    await loadFavorites();
  }
}

/**
 * 新建对话
 */
async function handleNewChat() {
  try {
    await chatStore.createConversation();
    ElMessage.success('创建成功');
  } catch {
    ElMessage.error('创建失败');
  }
}

/**
 * 切换会话
 */
async function handleSwitchConversation(id: number) {
  await chatStore.switchConversation(id);
  // 切换会话后滚动到底部
  await nextTick();
  scrollToBottom();
  // 初始化当前话题高亮
  await nextTick();
  initializeActiveTopic();
}

/**
 * 删除会话
 */
async function handleDeleteConversation(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除这个对话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    await chatStore.deleteConversation(id);
    ElMessage.success('删除成功');
  } catch {
    // 用户取消
  }
}

/**
 * 处理键盘事件
 */
function handleKeyDown(event: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
}

/**
 * 发送消息
 */
async function handleSend() {
  if (!inputMessage.value.trim()) return;

  console.log('开始发送消息...');
  console.log('当前会话ID:', chatStore.currentConversationId);
  console.log('当前模型:', chatStore.currentModel);

  // 如果没有当前会话，先创建一个
  if (!chatStore.currentConversationId) {
    console.log('没有当前会话，创建新会话...');
    try {
      await chatStore.createConversation('新对话');
      console.log('新会话创建成功，ID:', chatStore.currentConversationId);
    } catch (error: any) {
      console.error('创建会话失败:', error);
      ElMessage.error('创建会话失败: ' + (error.message || '未知错误'));
      return;
    }
  }

  const message = inputMessage.value.trim();
  inputMessage.value = '';

  console.log('发送消息内容:', message);

  try {
    await chatStore.sendMessage(message);
    console.log('消息发送成功');

    // 消息发送完成后，更新话题高亮并聚焦到输入框
    await nextTick();
    initializeActiveTopic();

    nextTick(() => {
      inputRef.value?.focus();
    });
  } catch (error: any) {
    console.error('发送消息失败:', error);
    // 错误信息已经在聊天框中显示，不需要额外弹窗

    // 即使失败也聚焦到输入框
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
}

/**
 * 复制消息内容
 */
async function handleCopy(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    ElMessage.success('已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败');
  }
}

/**
 * 重新生成回复
 */
/**
 * 重新生成 AI 回复
 */
async function handleRegenerate(message: Message) {
  try {
    // 找到这条消息之前的用户消息
    const messageIndex = chatStore.messages.findIndex(m => m.id === message.id);
    if (messageIndex <= 0) {
      ElMessage.warning('无法找到对应的用户消息');
      return;
    }

    const userMessage = chatStore.messages[messageIndex - 1];
    if (userMessage.role !== 'user') {
      ElMessage.warning('消息顺序异常');
      return;
    }

    // 保存原内容，用于错误恢复
    const originalContent = message.content;
    const originalVersion = message.current_version;
    const originalTotalVersions = message.total_versions;

    // 显示加载状态
    chatStore.messages[messageIndex] = {
      ...message,
      content: '正在重新生成...'
    };

    // 设置发送状态
    chatStore.isSending = true;

    try {
      // 使用流式输出重新生成
      let newContent = '';
      await chatApi.regenerateStream(
        message.conversation_id,
        message.id,
        chatStore.currentModel,
        // 接收流式数据块
        (chunk: string) => {
          // 第一次接收到数据时，清空加载提示
          if (newContent === '') {
            const currentIndex = chatStore.messages.findIndex(m => m.id === message.id);
            if (currentIndex !== -1) {
              chatStore.messages[currentIndex] = {
                ...chatStore.messages[currentIndex],
                content: ''
              };
            }
          }

          newContent += chunk;
          // 实时更新消息内容
          const currentIndex = chatStore.messages.findIndex(m => m.id === message.id);
          if (currentIndex !== -1) {
            chatStore.messages[currentIndex] = {
              ...chatStore.messages[currentIndex],
              content: newContent
            };
          }
        },
        // 完成时接收最终的消息（包含版本信息）
        (updatedMsg: Message) => {
          // 用更新后的消息替换
          const currentIndex = chatStore.messages.findIndex(m => m.id === message.id);
          if (currentIndex !== -1) {
            chatStore.messages[currentIndex] = updatedMsg;
          }
          // 更新会话列表
          chatStore.loadConversations();
        },
        // 错误处理
        (error: string) => {
          ElMessage.error(`重新生成失败: ${error}`);
          // 恢复原内容
          const currentIndex = chatStore.messages.findIndex(m => m.id === message.id);
          if (currentIndex !== -1) {
            chatStore.messages[currentIndex] = {
              ...message,
              content: originalContent,
              current_version: originalVersion,
              total_versions: originalTotalVersions
            };
          }
        }
      );
    } finally {
      chatStore.isSending = false;
    }
  } catch (error: any) {
    console.error('重新生成失败:', error);
    ElMessage.error('重新生成失败');
    chatStore.isSending = false;
  }
}

/**
 * 重命名会话
 */
async function handleRenameConversation(conv: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的会话名称', '重命名会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: conv.title,
      inputPattern: /.+/,
      inputErrorMessage: '会话名称不能为空'
    });

    await chatStore.renameConversation(conv.id, value);
    ElMessage.success('重命名成功');
  } catch {
    // 用户取消
  }
}

/**
 * 导出会话
 */
async function handleExport(format: 'md' | 'txt') {
  if (!chatStore.currentConversationId) return;

  try {
    const response = await conversationApi.export(chatStore.currentConversationId, format);
    const blob = new Blob([response], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chatStore.currentConversation?.title || '对话'}_${new Date().toISOString().split('T')[0]}.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败');
  }
}

/**
 * 编辑消息
 */
function handleEditMessage(message: Message) {
  // 将消息内容填充到输入框
  inputMessage.value = message.content;

  // 聚焦到输入框
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus();
    }
  });
}

/**
 * 切换消息收藏状态
 */
async function handleToggleFavorite(message: Message) {
  try {
    await chatApi.toggleFavorite(message.id);

    // 更新本地消息的收藏状态
    const msg = chatStore.messages.find(m => m.id === message.id);
    if (msg) {
      msg.is_favorited = msg.is_favorited ? 0 : 1;
      ElMessage.success(msg.is_favorited ? '已收藏' : '已取消收藏');
    }

    // 如果在收藏列表中，刷新收藏列表
    if (activeTab.value === 'favorites') {
      await loadFavorites();
    }
  } catch {
    ElMessage.error('操作失败');
  }
}

/**
 * 切换侧边栏
 */
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

/**
 * 格式化时间为北京时间
 */
function formatTime(time: string) {
  const date = new Date(time);
  // 转换为北京时间（UTC+8）
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });
}

/**
 * 切换消息版本
 */
async function handleSwitchVersion(message: Message, targetVersion: number) {
  try {
    const response = await chatApi.switchVersion(message.id, targetVersion);
    if (response.success) {
      // 更新本地消息
      const index = chatStore.messages.findIndex(m => m.id === message.id);
      if (index !== -1) {
        chatStore.messages[index] = response.data;
      }
      ElMessage.success(`已切换到版本 ${targetVersion}`);
    }
  } catch (error) {
    console.error('切换版本失败:', error);
    ElMessage.error('切换版本失败');
  }
}

/**
 * 导航到上一个话题
 */
function navigateToPrev() {
  if (canNavigatePrev.value) {
    const prevTopic = topics.value[currentTopicIndex.value - 1];
    scrollToTopic(prevTopic.messageId);
  }
}

/**
 * 导航到下一个话题
 */
function navigateToNext() {
  if (canNavigateNext.value) {
    const nextTopic = topics.value[currentTopicIndex.value + 1];
    scrollToTopic(nextTopic.messageId);
  }
}

/**
 * 导航到第一个话题
 */
function navigateToFirst() {
  if (topics.value.length > 0 && currentTopicIndex.value !== 0) {
    const firstTopic = topics.value[0];
    scrollToTopic(firstTopic.messageId);
  }
}

/**
 * 导航到最后一个话题
 */
function navigateToLast() {
  if (topics.value.length > 0 && currentTopicIndex.value !== topics.value.length - 1) {
    const lastTopic = topics.value[topics.value.length - 1];
    scrollToTopic(lastTopic.messageId);
  }
}

/**
 * 切换导航列表的展开/收起状态
 */
function toggleNavigationList() {
  navigationListExpanded.value = !navigationListExpanded.value;
}

/**
 * 初始化当前话题高亮
 */
function initializeActiveTopic() {
  if (topics.value.length === 0) return;

  // 默认高亮最后一个话题（最新的用户消息）
  const lastTopic = topics.value[topics.value.length - 1];
  activeTopicId.value = lastTopic.messageId;
}

/**
 * 跳转到指定话题
 */
function scrollToTopic(messageId: number) {
  const element = document.getElementById(`message-${messageId}`);
  if (element) {
    // 标记为手动跳转，防止自动滚动打断
    isManualScrolling.value = true;

    // 先设置高亮
    activeTopicId.value = messageId;

    // 然后滚动
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // 2 秒后恢复自动高亮（等待滚动动画完成 + 额外缓冲时间）
    setTimeout(() => {
      isManualScrolling.value = false;
    }, 2000);
  }
}

/**
 * 监听滚动，更新当前高亮的话题
 */
function updateActiveTopicOnScroll() {
  // 如果正在手动跳转，不更新高亮
  if (isManualScrolling.value || !messageListRef.value) return;

  const messageElements = messageListRef.value.querySelectorAll('.message-item.user');
  const viewportCenter = window.innerHeight / 2;

  for (const element of Array.from(messageElements)) {
    const rect = element.getBoundingClientRect();
    if (rect.top < viewportCenter && rect.bottom > viewportCenter) {
      const messageId = (element as HTMLElement).dataset.messageId;
      if (messageId) {
        activeTopicId.value = Number(messageId);
      }
      break;
    }
  }
}

/**
 * 监听消息列表滚动
 */
onMounted(() => {
  if (messageListRef.value) {
    messageListRef.value.addEventListener('scroll', updateActiveTopicOnScroll);
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
  max-width: 100vw;
  overflow-x: hidden;
}

.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.tab-item {
  flex: 1;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: #1976d2;
  background: #f5f5f5;
}

.tab-item.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  font-weight: 500;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.favorites-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-favorites {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.favorite-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
  cursor: pointer;
}

.favorite-item:hover {
  background: #f5f5f5;
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.favorite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.favorite-role {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.favorite-time {
  font-size: 12px;
  color: #999;
}

.favorite-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 8px;
  word-break: break-word;
  white-space: pre-wrap;
}

.favorite-markdown {
  font-size: 14px;
  line-height: 1.6;
}

.favorite-expand {
  margin-bottom: 8px;
  text-align: right;
}

.favorite-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.favorite-actions .action-icon {
  font-size: 16px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.favorite-actions .action-icon:hover {
  color: #1976d2;
}

.favorite-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.favorite-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.favorite-detail-role {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.favorite-detail-time {
  font-size: 14px;
  color: #999;
}

.favorite-detail-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.user-message-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.favorite-detail-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.conversation-item {
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f5f5f5;
}

.conversation-item.active {
  background: #e3f2fd;
}

.conversation-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.conversation-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.conversation-actions .action-icon {
  font-size: 16px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.conversation-actions .action-icon:hover {
  color: #1976d2;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  min-width: 0;
  overflow: hidden;
}

.header {
  height: 60px;
  padding: 0 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}

.menu-icon {
  font-size: 20px;
  cursor: pointer;
}

.title {
  flex: 1;
  font-size: 18px;
  font-weight: 500;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 12px;
}

.user-profile:hover {
  background: #f5f5f5;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
}

.user-nickname {
  font-size: 14px;
  color: #333;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 100px 20px;
  color: #999;
}

.empty-state h2 {
  font-size: 32px;
  margin-bottom: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e3f2fd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  min-width: 100px;
}

.message-text {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-item.user .message-text {
  background: #1976d2;
  color: #fff;
}

.message-text.loading {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: loading 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding: 0 4px;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.message-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.action-icon {
  font-size: 16px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.action-icon:hover {
  color: #1976d2;
}

.action-icon.favorited {
  color: #ffc107;
}

.action-icon.favorited:hover {
  color: #ff9800;
}

.input-area {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
}

.input-area :deep(.el-textarea__inner) {
  resize: none;
}

/* 对话导航组件样式 - 固定在屏幕右侧居中 */
.navigation-widget {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 默认状态：紧凑模式（只显示按钮） */
.navigation-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 18px;
}

.nav-btn:hover:not(.disabled) {
  background: #f0f7ff;
  color: #1976d2;
}

.nav-btn.disabled {
  color: #d0d0d0;
  cursor: not-allowed;
}

.nav-btn-menu {
  border: 1px solid #d0d0d0;
  background: #fafafa;
}

.nav-btn-menu:hover {
  border-color: #1976d2;
  background: #f0f7ff;
}

/* 展开状态：显示列表 */
.navigation-expanded {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 280px;
  min-height: 300px;
  max-height: 500px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.navigation-header {
  height: 50px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.navigation-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.close-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-icon:hover {
  background: #e8e8e8;
  color: #1976d2;
}

.navigation-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topic-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  position: relative;
  min-height: 44px;
}

.topic-item:hover {
  background: #f7f8fa;
}

.topic-item.active {
  background: #f0f7ff;
  border-left-color: #1976d2;
}

.topic-item.active .topic-title {
  color: #1976d2;
  font-weight: 500;
}

.topic-title {
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* 响应式：小屏幕时调整位置 */
@media (max-width: 1200px) {
  .navigation-widget {
    right: 10px;
  }

  .navigation-expanded {
    right: 10px;
    width: 240px;
  }

  .sidebar {
    width: 220px;
  }

  .message-content {
    max-width: 75%;
  }
}

@media (max-width: 1024px) {
  .header {
    padding: 0 12px;
  }

  .header .title {
    font-size: 16px;
  }

  .user-nickname {
    display: none;
  }

  .message-content {
    max-width: 80%;
  }

  .navigation-widget {
    right: 8px;
  }

  .navigation-expanded {
    right: 8px;
    width: 220px;
  }
}

@media (max-width: 800px) {
  .sidebar {
    width: 200px;
  }

  .sidebar.collapsed {
    width: 0;
  }

  .header {
    padding: 0 10px;
    gap: 8px;
  }

  .header .el-select {
    width: 140px !important;
  }

  .message-list {
    padding: 12px;
  }

  .message-content {
    max-width: 85%;
  }

  .input-area {
    padding: 12px;
    gap: 8px;
  }

  .input-area :deep(.el-textarea__inner) {
    font-size: 14px;
  }

  .input-area .el-button {
    padding: 8px 12px;
  }

  /* 小屏幕时隐藏导航组件 */
  .navigation-widget {
    display: none;
  }

  /* 收藏列表和会话列表优化 */
  .conversation-item,
  .favorite-item {
    padding: 10px;
  }

  .favorite-content {
    font-size: 13px;
  }
}

/* 确保容器不会超出视口 */
.chat-container {
  max-width: 100vw;
  overflow-x: hidden;
}

.main-area {
  min-width: 0;
  flex: 1;
}

.header {
  flex-wrap: nowrap;
  overflow: hidden;
}

.header .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.message-list {
  overflow-x: hidden;
}

.message-text {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* 输入框自适应 */
.input-area :deep(.el-textarea) {
  min-width: 0;
  flex: 1;
}

/* 对话框自适应 */
.el-dialog {
  max-width: calc(100vw - 40px);
}

.version-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding: 4px 0;
}

.version-info {
  font-size: 13px;
  color: #666;
  min-width: 40px;
  text-align: center;
}

.version-switcher .el-button {
  padding: 4px;
}

.version-switcher .el-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

/* 对话导航面板样式 */
.navigation-panel {
  width: 220px;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.navigation-panel.collapsed {
  width: 40px;
}

/* 默认状态：紧凑模式（只显示按钮） */
.navigation-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 18px;
}

.nav-btn:hover:not(.disabled) {
  background: #f5f5f5;
  color: #1976d2;
}

.nav-btn.disabled {
  color: #d0d0d0;
  cursor: not-allowed;
}

.nav-btn-menu {
  border: 1px solid #e0e0e0;
}

.nav-btn-menu:hover {
  border-color: #1976d2;
}

/* 展开状态：显示列表 */
.navigation-expanded {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.navigation-header {
  height: 50px;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.navigation-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.close-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-icon:hover {
  background: #f5f5f5;
  color: #1976d2;
}

.navigation-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-control-icon {
  font-size: 16px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-control-icon:hover:not(.disabled) {
  background: #f5f5f5;
  color: #1976d2;
}

.nav-control-icon.disabled {
  color: #d0d0d0;
  cursor: not-allowed;
}

.collapse-icon {
  font-size: 16px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  margin-left: 4px;
}

.collapse-icon:hover {
  background: #f5f5f5;
  color: #1976d2;
}

.navigation-panel.collapsed .navigation-title {
  display: none;
}

.navigation-panel.collapsed .navigation-controls {
  display: none;
}

.navigation-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.navigation-empty {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 13px;
}

.navigation-empty p {
  margin: 4px 0;
}

.topic-list {
  display: flex;
  flex-direction: column;
}

.topic-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  position: relative;
}

.topic-item:hover {
  background: #f7f8fa;
}

.topic-item.active {
  background: #f0f7ff;
  border-left-color: #1976d2;
}

.topic-item.active .topic-title {
  color: #1976d2;
  font-weight: 500;
}

.topic-title {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

/* 响应式：小屏幕自动隐藏导航 */
@media (max-width: 1200px) {
  .navigation-panel {
    display: none;
  }
}
</style>
