# 占卜应用管理后台 - 前端界面

这是占卜应用管理后台的前端管理界面，基于React + Refine + Ant Design构建，提供直观的管理界面。

## 🚀 快速开始

### 本地开发

```bash
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

```bash
# 构建镜像
docker build -t zhanwen-frontend .

# 运行容器
docker run -d \
  --name zhanwen-frontend \
  -p 80:80 \
  -e VITE_API_URL=https://your-backend-domain.com \
  zhanwen-frontend
```

## 🐳 Coolify部署

### 1. 创建新服务

在Coolify中创建新的Static Site服务：

- **Repository**: `https://github.com/yourusername/zhanwen-frontend`
- **Branch**: `main`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Port**: `80`

### 2. 环境变量配置

```env
VITE_API_URL=https://your-backend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com/api
VITE_APP_TITLE=占卜应用管理后台
NODE_ENV=production
```

### 3. 健康检查

- **Path**: `/health`
- **Port**: `80`

## 📋 主要功能

- ✅ AI模型管理界面
- ✅ 提示词模板管理界面
- ✅ 应用配置管理界面
- ✅ 用户认证和权限管理
- ✅ 响应式设计，支持移动端
- ✅ 中文界面，用户友好
- ✅ 数据表格、表单、详情页面

## 🛠️ 技术栈

- **框架**: React 18 + TypeScript
- **管理框架**: Refine
- **UI组件**: Ant Design
- **构建工具**: Vite
- **路由**: React Router v6
- **状态管理**: Refine内置状态管理
- **HTTP客户端**: Axios

## 🔧 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `VITE_API_URL` | 后端API地址 | - |
| `VITE_API_BASE_URL` | API基础路径 | - |
| `VITE_APP_TITLE` | 应用标题 | `占卜应用管理后台` |
| `NODE_ENV` | 运行环境 | `production` |

## 📁 项目结构

```
src/
├── pages/           # 页面组件
│   ├── ai-models/   # AI模型管理页面
│   ├── prompts/     # 提示词管理页面
│   ├── configs/     # 配置管理页面
│   └── dashboard/   # 仪表盘页面
├── providers/       # 数据提供者
├── components/      # 公共组件
└── App.tsx          # 应用入口
```

## 🎨 界面特性

- **响应式设计**: 支持桌面和移动端
- **暗色主题**: 支持明暗主题切换
- **国际化**: 完整的中文界面
- **数据表格**: 支持排序、筛选、分页
- **表单验证**: 完整的表单验证机制
- **权限控制**: 基于角色的权限管理

## 🔒 安全特性

- JWT Token认证
- 路由权限控制
- XSS防护
- CSRF防护
- 安全HTTP头

## 📱 浏览器支持

- Chrome >= 88
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 🛠️ 开发

### 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产构建
- `npm run lint` - 代码检查

### 代码规范

项目使用ESLint和Prettier进行代码格式化和规范检查。

## 📝 许可证

MIT License
