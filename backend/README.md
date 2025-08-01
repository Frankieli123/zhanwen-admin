# 占卜应用管理后台 - 后端API

这是占卜应用管理后台的后端API服务，提供AI模型管理、提示词模板管理和应用配置管理功能。

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env

# 初始化数据库
npm run migrate

# 启动开发服务器
npm run dev
```

### Docker部署

```bash
# 构建镜像
docker build -t zhanwen-backend .

# 运行容器
docker run -d \
  --name zhanwen-backend \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=https://your-frontend-domain.com \
  zhanwen-backend
```

## 🐳 Coolify部署

### 1. 创建新服务

在Coolify中创建新的Node.js服务：

- **Repository**: `https://github.com/yourusername/zhanwen-backend`
- **Branch**: `main`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: `3001`

### 2. 环境变量配置

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-generated-secret-key
DATABASE_URL=sqlite:/app/data/database.sqlite
CORS_ORIGIN=https://your-frontend-domain.com
```

### 3. 持久化存储

添加持久化卷：
- **Source**: `/app/data`
- **Destination**: 选择持久化存储位置

### 4. 健康检查

- **Path**: `/api/health`
- **Port**: `3001`

## 📋 主要功能

- ✅ AI模型管理 (OpenAI, Anthropic, DeepSeek等)
- ✅ 提示词模板管理和版本控制
- ✅ 多平台应用配置管理
- ✅ JWT身份验证和权限控制
- ✅ RESTful API接口
- ✅ SQLite数据库存储
- ✅ Docker容器化部署

## 🔧 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | `sqlite:./data/database.sqlite` |
| `JWT_SECRET` | JWT密钥 | - |
| `JWT_EXPIRES_IN` | JWT过期时间 | `7d` |
| `PORT` | 服务器端口 | `3001` |
| `NODE_ENV` | 运行环境 | `production` |
| `CORS_ORIGIN` | CORS允许的源 | - |

## 📁 项目结构

```
src/
├── controllers/     # 控制器
├── services/        # 业务逻辑服务
├── middleware/      # 中间件
├── routes/          # 路由定义
├── utils/           # 工具函数
├── types/           # TypeScript类型定义
└── server.ts        # 应用入口
```
