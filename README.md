# 占卜应用管理后台

这是占卜应用的统一管理后台系统，包含前端管理界面和后端API服务，提供AI模型管理、提示词模板管理和应用配置管理功能。

## 🏗️ 项目架构

```
zhanwen-admin/
├── backend/              # 后端API服务
│   ├── src/              # TypeScript源代码
│   ├── package.json      # 后端依赖配置
│   └── Dockerfile        # 后端Docker配置
├── frontend/             # 前端管理界面
│   ├── src/              # React源代码
│   ├── package.json      # 前端依赖配置
│   └── Dockerfile        # 前端Docker配置
├── docker-compose.yml    # 统一部署配置
└── README.md             # 项目文档
```

## 🚀 快速开始

### 本地开发

#### 1. 启动后端服务

```bash
# 进入后端目录
cd backend

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

#### 2. 启动前端服务

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env

# 启动开发服务器
npm run dev
```

### Docker部署

#### 使用Docker Compose一键部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🐳 Coolify部署

### 1. 创建新项目

在Coolify中创建新项目：

- **Repository**: `https://github.com/Frankieli123/zhanwen-admin`
- **Branch**: `main`
- **Project Type**: `Docker Compose`

### 2. 环境变量配置

**后端环境变量**:
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=sqlite:/app/data/database.sqlite
CORS_ORIGIN=https://your-frontend-domain.com
```

**前端环境变量**:
```env
VITE_API_URL=https://your-backend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com/api
NODE_ENV=production
```

### 3. 域名配置

- **后端**: `api.yourdomain.com`
- **前端**: `admin.yourdomain.com`

### 4. 持久化存储

为后端服务配置持久化存储：
- **挂载点**: `/app/data`
- **用于**: SQLite数据库文件存储

## 📋 主要功能

### 🤖 AI模型管理
- 支持多种AI提供商 (OpenAI, Anthropic, DeepSeek等)
- 模型参数配置和测试
- 使用统计和性能监控

### 📝 提示词模板管理
- 提示词模板创建和编辑
- 版本控制和历史记录
- 模板分类和标签管理
- 模板复制和激活功能

### ⚙️ 应用配置管理
- 多平台配置支持 (Web/iOS/Android/微信小程序)
- 动态配置更新
- 配置版本管理
- 敏感数据保护

## 🛠️ 技术栈

### 后端
- **框架**: Node.js + Express.js + TypeScript
- **数据库**: SQLite
- **认证**: JWT
- **文档**: Swagger/OpenAPI

### 前端
- **框架**: React 18 + TypeScript
- **管理框架**: Refine
- **UI组件**: Ant Design
- **构建工具**: Vite

## 🔧 开发指南

### 后端开发

```bash
cd backend

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test

# 代码检查
npm run lint
```

### 前端开发

```bash
cd frontend

# 开发模式
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 代码检查
npm run lint
```

## 🌟 特性

- ✅ **统一管理**: 前后端在同一个仓库中管理
- ✅ **Docker化**: 完整的容器化部署方案
- ✅ **自动部署**: GitHub推送自动触发部署
- ✅ **响应式设计**: 支持桌面和移动端
- ✅ **中文界面**: 完整的中文用户界面
- ✅ **权限管理**: 基于JWT的身份验证
- ✅ **API文档**: 完整的Swagger文档

## 📖 API文档

启动后端服务后，访问 `http://localhost:3001/api-docs` 查看完整的API文档。

## 🔒 安全特性

- JWT身份验证
- 密码加密存储
- API请求限流
- CORS跨域保护
- 输入数据验证

## 📞 支持

如果遇到问题，可以：
1. 查看项目文档
2. 检查GitHub Issues
3. 联系技术支持

## 📝 许可证

MIT License
