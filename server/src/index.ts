import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/init.js';
import router from './routes/index.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量（从项目根目录）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 调试：检查环境变量是否加载
console.log('🔑 环境变量加载状态:');
console.log('  QWEN_API_KEY:', process.env.QWEN_API_KEY ? `已配置 (${process.env.QWEN_API_KEY.substring(0, 10)}...)` : '未配置');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `已配置 (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : '未配置');
console.log('  DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? `已配置 (${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...)` : '未配置');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
initDatabase();

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'An-AI 服务运行中' });
});

// API 路由
app.use('/api', router);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器启动成功！`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
});
