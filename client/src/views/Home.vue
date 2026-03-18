<template>
  <div class="home">
    <div class="welcome-card">
      <h1>👋 欢迎使用 An-AI</h1>
      <p>一个支持多个免费 AI 模型的聊天机器人</p>

      <el-form @submit.prevent="handleStart" style="margin-top: 40px">
        <el-form-item label="请输入你的昵称">
          <el-input
            v-model="nickname"
            placeholder="输入昵称开始使用"
            size="large"
            @keyup.enter="handleStart"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            @click="handleStart"
            :loading="loading"
            style="width: 100%"
          >
            开始使用
          </el-button>
        </el-form-item>
      </el-form>

      <div class="features">
        <div class="feature-item">
          <span class="icon">🤖</span>
          <span>支持通义千问和 Groq</span>
        </div>
        <div class="feature-item">
          <span class="icon">💬</span>
          <span>流式输出打字机效果</span>
        </div>
        <div class="feature-item">
          <span class="icon">📝</span>
          <span>Markdown 和代码高亮</span>
        </div>
        <div class="feature-item">
          <span class="icon">💾</span>
          <span>会话管理和历史记录</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../stores/user';

const router = useRouter();
const userStore = useUserStore();

const nickname = ref('');
const loading = ref(false);

/**
 * 初始化 - 如果已有用户，直接跳转
 */
onMounted(async () => {
  await userStore.initUser();

  if (userStore.currentUser) {
    router.push('/chat');
  }
});

/**
 * 开始使用
 */
async function handleStart() {
  if (!nickname.value.trim()) {
    ElMessage.warning('请输入昵称');
    return;
  }

  loading.value = true;

  try {
    const success = await userStore.setNickname(nickname.value.trim());

    if (success) {
      ElMessage.success('欢迎使用！');
      router.push('/chat');
    } else {
      ElMessage.error('设置昵称失败');
    }
  } catch (error) {
    ElMessage.error('网络错误');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.welcome-card {
  background: #fff;
  border-radius: 16px;
  padding: 60px 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h1 {
  font-size: 36px;
  margin-bottom: 16px;
  text-align: center;
  color: #333;
}

p {
  font-size: 16px;
  color: #666;
  text-align: center;
  margin-bottom: 20px;
}

.features {
  margin-top: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.icon {
  font-size: 20px;
}
</style>
