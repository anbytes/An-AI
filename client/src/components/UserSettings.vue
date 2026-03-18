<template>
  <el-drawer v-model="visible" title="用户设置" direction="rtl" size="400px">
    <div class="settings-content">
      <!-- 用户信息 -->
      <div class="section">
        <h3 class="section-title">用户信息</h3>
        <div class="user-info">
          <div class="avatar">{{ userStore.currentUser?.nickname?.charAt(0) || '?' }}</div>
          <div class="info">
            <div class="nickname">{{ userStore.currentUser?.nickname }}</div>
            <div class="user-id">ID: {{ userStore.currentUser?.id }}</div>
          </div>
        </div>
      </div>

      <!-- 修改昵称 -->
      <div class="section">
        <h3 class="section-title">修改昵称</h3>
        <el-input
          v-model="newNickname"
          placeholder="输入新昵称"
          :maxlength="20"
          show-word-limit
          style="margin-bottom: 12px"
        />
        <el-button
          type="primary"
          :loading="updating"
          style="width: 100%"
          @click="handleUpdateNickname"
        >
          保存昵称
        </el-button>
      </div>

      <!-- 账号管理 -->
      <div class="section">
        <h3 class="section-title">账号管理</h3>
        <div class="button-group">
          <div>
            <el-button type="warning" plain style="width: 100%" @click="handleSwitchAccount">
              切换账号
            </el-button>
          </div>
          <div>
            <el-button type="info" plain style="width: 100%" @click="handleLogout">
              退出登录
            </el-button>
          </div>
        </div>
        <div class="tip">💡 切换账号会保留当前账号数据，退出登录会清除本地缓存</div>
      </div>

      <!-- 数据管理 -->
      <div class="section">
        <h3 class="section-title">数据管理</h3>
        <div class="button-group">
          <el-button type="danger" plain style="width: 100%" @click="handleClearData">
            清除所有数据
          </el-button>
        </div>
        <div class="tip">⚠️ 此操作将删除所有会话和消息，且不可恢复</div>
      </div>

      <!-- 关于 -->
      <div class="section">
        <h3 class="section-title">关于</h3>
        <div class="about-info">
          <p><strong>An-AI</strong></p>
          <p>版本：1.0.0</p>
          <p>一个支持多个免费 AI 模型的聊天机器人</p>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '../stores/user';
import { useChatStore } from '../stores/chat';
import { useRouter } from 'vue-router';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const userStore = useUserStore();
const chatStore = useChatStore();
const router = useRouter();

const visible = ref(props.modelValue);
const newNickname = ref('');
const updating = ref(false);

watch(
  () => props.modelValue,
  val => {
    visible.value = val;
    if (val) {
      newNickname.value = userStore.currentUser?.nickname || '';
    }
  }
);

watch(visible, val => {
  emit('update:modelValue', val);
});

async function handleUpdateNickname() {
  if (!newNickname.value.trim()) {
    ElMessage.warning('昵称不能为空');
    return;
  }

  if (newNickname.value === userStore.currentUser?.nickname) {
    ElMessage.info('昵称未改变');
    return;
  }

  updating.value = true;
  try {
    const success = await userStore.updateNickname(newNickname.value.trim());
    if (success) {
      ElMessage.success('昵称更新成功');
    } else {
      ElMessage.error('昵称更新失败');
    }
  } catch (error) {
    ElMessage.error('网络错误');
  } finally {
    updating.value = false;
  }
}

async function handleSwitchAccount() {
  try {
    await ElMessageBox.confirm('切换账号后，当前账号的数据会保留在服务器', '切换账号', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    });

    localStorage.removeItem('nickname');
    userStore.currentUser = null;
    chatStore.conversations = [];
    chatStore.messages = [];
    chatStore.currentConversationId = null;

    ElMessage.success('已退出当前账号');
    visible.value = false;
    router.push('/');
  } catch (error) {
    // 用户取消
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('退出登录会清除本地缓存', '退出登录', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    localStorage.clear();
    userStore.currentUser = null;
    chatStore.conversations = [];
    chatStore.messages = [];
    chatStore.currentConversationId = null;

    ElMessage.success('已退出登录');
    visible.value = false;
    router.push('/');
  } catch (error) {
    // 用户取消
  }
}

async function handleClearData() {
  try {
    await ElMessageBox.confirm('确定要清除所有数据吗？此操作不可恢复！', '危险操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    });

    localStorage.clear();
    userStore.currentUser = null;
    chatStore.conversations = [];
    chatStore.messages = [];
    chatStore.currentConversationId = null;

    ElMessage.success('数据已清除');
    visible.value = false;
    router.push('/');
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped>
.settings-content {
  padding: 20px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
}

.nickname {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  word-break: break-word;
}

.user-id {
  font-size: 13px;
  color: #999;
}

.tip {
  margin-top: 12px;
  padding: 12px;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  background: #fff9e6;
  border-radius: 6px;
  border-left: 3px solid #ffc107;
}

.about-info {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 14px;
  line-height: 2;
}

.about-info p {
  margin: 6px 0;
  color: #666;
}

.about-info strong {
  color: #333;
  font-size: 18px;
  display: block;
  margin-bottom: 8px;
}
</style>
