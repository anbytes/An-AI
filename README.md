# An-AI - 智能聊天机器人

一个支持多个免费 AI 模型切换的聊天机器人网页应用，提供类似 ChatGPT 的用户体验。

## ✨ 特性

- 🤖 支持多个免费 AI 模型（通义千问、Groq）
- 💬 流式输出，打字机效果
- 📝 Markdown 渲染和代码高亮
- 💾 会话管理（创建、删除、重命名、切换）
- 🎨 简洁现代的界面设计
- 🔒 请求频率限制，防止滥用
- 📦 本地 SQLite 数据库存储

## 🛠️ 技术栈

### 前端

- Vue 3 + TypeScript
- Vite
- Element Plus
- Pinia（状态管理）
- Axios（HTTP 客户端）
- Markdown-it（Markdown 渲染）
- Highlight.js（代码高亮）

### 后端

- Node.js + Express
- TypeScript
- Better-SQLite3（数据库）
- Axios（API 调用）

## 📦 安装

### 前置要求

- Node.js >= 18
- npm 或 yarn 或 pnpm

### 1. 克隆项目

```bash
git clone https://github.com/anansong/An-AI.git
cd An-AI
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# 服务器配置
PORT=3000

# 通义千问 API 配置
QWEN_API_KEY=your_qwen_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# Groq API 配置
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# 数据库配置
DATABASE_PATH=./database/chat.db

# 请求频率限制（每分钟）
RATE_LIMIT_PER_MINUTE=20
```

## 🚀 运行

### 开发模式

```bash
# 启动后端服务（在 server 目录）
cd server
npm run dev

# 启动前端服务（在 client 目录，新开一个终端）
cd client
npm run dev
```

前端访问地址：http://localhost:5173  
后端 API 地址：http://localhost:3000

### 生产模式

```bash
# 构建前端
cd client
npm run build

# 构建后端
cd ../server
npm run build

# 启动后端服务
npm start
```

## 📖 API Key 获取

### 通义千问

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 注册并登录
3. 创建应用获取 API Key

### Groq

1. 访问 [Groq Console](https://console.groq.com/)
2. 注册并登录
3. 创建 API Key

## 📁 项目结构

```
An-AI/
├── client/                    # 前端项目
│   ├── src/
│   │   ├── api/              # API 请求封装
│   │   ├── assets/           # 静态资源
│   │   ├── components/       # 通用组件
│   │   ├── views/            # 页面组件
│   │   ├── stores/           # Pinia 状态管理
│   │   ├── utils/            # 工具函数
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── router/           # 路由配置
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 入口文件
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                    # 后端项目
│   ├── src/
│   │   ├── controllers/      # 控制器
│   │   ├── models/           # 数据库模型
│   │   ├── routes/           # 路由定义
│   │   ├── services/         # 业务逻辑
│   │   ├── middlewares/      # 中间件
│   │   ├── utils/            # 工具函数
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── database/         # 数据库初始化
│   │   └── index.ts          # 入口文件
│   ├── database/             # SQLite 数据库文件
│   └── package.json
│
├── .env.example              # 环境变量示例
├── .gitignore
└── README.md
```

## 🗄️ 数据库表结构

### users（用户表）

- id: 主键
- nickname: 用户昵称
- created_at: 创建时间
- updated_at: 更新时间

### conversations（会话表）

- id: 主键
- user_id: 用户 ID
- title: 会话标题
- model: 使用的模型
- created_at: 创建时间
- updated_at: 更新时间

### messages（消息表）

- id: 主键
- conversation_id: 会话 ID
- role: 角色（user/assistant/system）
- content: 消息内容
- created_at: 创建时间

### settings（系统配置表）

- id: 主键
- user_id: 用户 ID
- key: 配置键
- value: 配置值（JSON 格式）
- updated_at: 更新时间

## 🎯 功能路线图

### MVP（第一阶段）✅

- [x] 用户昵称识别
- [x] 基础文字对话
- [x] 流式输出
- [x] Markdown 渲染
- [x] 代码高亮
- [x] 会话管理
- [x] 侧边栏会话列表
- [x] 基础设置面板

### 第二阶段 🚧

- [ ] 多模型切换
- [ ] 消息编辑和重新生成
- [ ] 对话导出（Markdown/TXT）
- [ ] 多轮对话上下文管理
- [ ] 会话重命名

### 第三阶段 📋

- [ ] 文件上传
- [ ] 语音输入/输出
- [ ] 收藏/标记重要消息
- [ ] 深色/浅色主题切换
- [ ] 响应式设计（移动端适配）

## 📝 开发规范

- 所有代码注释使用中文
- 组件文件使用 PascalCase 命名
- 按文件类型组织项目结构
- 使用 @ 别名指向 src 目录

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👨‍💻 作者

anansong

---

**注意**：本项目仅供学习交流使用，请遵守各 AI 服务商的使用条款。
