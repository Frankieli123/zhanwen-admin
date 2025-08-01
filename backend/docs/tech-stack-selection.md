# 占卜应用管理后台技术栈选择

## 1. 技术栈概览

基于项目需求分析和多平台发布考虑，推荐以下技术栈：

### 1.1 后端技术栈
- **运行时**: Node.js 18+ (LTS)
- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL 14+
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **缓存**: Redis (可选)
- **文档**: Swagger/OpenAPI

### 1.2 前端技术栈
- **框架**: React 18 + TypeScript
- **管理界面**: Refine
- **UI组件**: Ant Design
- **状态管理**: React Query (内置)
- **构建工具**: Vite
- **样式**: Ant Design + CSS-in-JS

### 1.3 部署和运维
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **进程管理**: PM2
- **监控**: 日志文件 + 简单监控脚本

## 2. 技术选择理由

### 2.1 后端框架选择：Express.js

**选择理由**：
✅ **成熟稳定** - 生态系统完善，社区活跃  
✅ **开发效率** - 简单易用，快速开发  
✅ **TypeScript支持** - 完善的类型支持  
✅ **中间件丰富** - 认证、日志、CORS等中间件齐全  
✅ **团队熟悉度** - 学习成本低  

**对比其他选择**：
- **Fastify**: 性能更好但生态相对较小
- **NestJS**: 功能强大但复杂度较高，适合大型项目
- **Koa**: 轻量但需要更多配置

### 2.2 数据库选择：PostgreSQL

**选择理由**：
✅ **JSONB支持** - 完美支持配置数据的灵活存储  
✅ **ACID特性** - 数据一致性保证  
✅ **扩展性强** - 支持复杂查询和索引  
✅ **开源免费** - 无许可证成本  
✅ **Prisma支持** - ORM支持完善  

**对比其他选择**：
- **MySQL**: 功能相对简单，JSONB支持不如PostgreSQL
- **MongoDB**: NoSQL灵活但缺乏事务支持
- **SQLite**: 轻量但不适合生产环境

### 2.3 ORM选择：Prisma

**选择理由**：
✅ **类型安全** - 完整的TypeScript支持  
✅ **开发体验** - 优秀的IDE支持和自动补全  
✅ **迁移管理** - 简单的数据库迁移  
✅ **查询构建器** - 直观的查询API  
✅ **性能优化** - 查询优化和连接池  

### 2.4 前端框架选择：Refine

**选择理由**：
✅ **现代化架构** - 基于React 18，支持最新特性
✅ **无头设计** - 高度可定制，不绑定特定UI库
✅ **TypeScript原生** - 完整的类型支持和智能提示
✅ **内置数据管理** - 集成React Query，数据状态管理简单
✅ **多UI框架支持** - 支持Ant Design、Material-UI、Chakra UI等
✅ **开发体验优秀** - 热重载、代码生成、CLI工具完善
✅ **性能优化** - 自动缓存、懒加载、代码分割

**对比其他选择**：
- **React-Admin**: 功能完整但架构相对传统
- **Ant Design Pro**: 功能强大但定制复杂
- **自研**: 开发周期长，维护成本高

## 3. 项目结构设计

### 3.1 后端项目结构

```
admin-backend/
├── src/
│   ├── controllers/         # 控制器
│   │   ├── ai-models.ts
│   │   ├── prompts.ts
│   │   ├── configs.ts
│   │   └── auth.ts
│   ├── services/            # 业务逻辑
│   │   ├── ai-model.service.ts
│   │   ├── prompt.service.ts
│   │   ├── config.service.ts
│   │   └── auth.service.ts
│   ├── middleware/          # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/              # 路由定义
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── admin.ts
│   ├── utils/               # 工具函数
│   │   ├── encryption.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── types/               # 类型定义
│   │   ├── api.types.ts
│   │   └── config.types.ts
│   ├── prisma/              # Prisma配置
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── app.ts               # 应用入口
├── tests/                   # 测试文件
├── docs/                    # 文档
├── docker/                  # Docker配置
├── package.json
├── tsconfig.json
└── .env.example
```

### 3.2 前端项目结构 (Refine)

```
admin-frontend/
├── src/
│   ├── components/          # 自定义组件
│   │   ├── ai-models/
│   │   ├── prompts/
│   │   ├── configs/
│   │   └── common/
│   ├── providers/           # Refine提供者
│   │   ├── data-provider.ts
│   │   ├── auth-provider.ts
│   │   ├── access-control-provider.ts
│   │   └── notification-provider.ts
│   ├── pages/               # 页面组件
│   │   ├── ai-models/
│   │   │   ├── list.tsx
│   │   │   ├── create.tsx
│   │   │   ├── edit.tsx
│   │   │   └── show.tsx
│   │   ├── prompts/
│   │   ├── configs/
│   │   ├── dashboard/
│   │   └── auth/
│   ├── hooks/               # 自定义Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # 类型定义
│   ├── constants/           # 常量定义
│   └── App.tsx              # 应用入口
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 4. 开发环境配置

### 4.1 开发工具

**必需工具**：
- Node.js 18+ (推荐使用nvm管理版本)
- PostgreSQL 14+ (可使用Docker)
- Git
- VS Code (推荐插件：Prisma, TypeScript, ESLint)

**可选工具**：
- Docker Desktop (容器化开发)
- Postman/Insomnia (API测试)
- pgAdmin (数据库管理)

### 4.2 代码规范

**ESLint配置**：
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**Prettier配置**：
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 5. 部署方案

### 5.1 开发环境部署

**Docker Compose配置**：
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: divination_admin
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./admin-backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admin:password@postgres:5432/divination_admin
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./admin-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 5.2 生产环境部署

**服务器要求**：
- CPU: 2核心以上
- 内存: 4GB以上
- 存储: 50GB以上
- 操作系统: Ubuntu 20.04+ / CentOS 8+

**部署步骤**：
1. 安装Docker和Docker Compose
2. 配置Nginx反向代理
3. 设置SSL证书 (Let's Encrypt)
4. 配置防火墙规则
5. 设置自动备份脚本

## 6. 安全考虑

### 6.1 API安全
- JWT Token认证
- API密钥加密存储
- 请求频率限制
- CORS配置
- 输入验证和SQL注入防护

### 6.2 数据安全
- 数据库连接加密
- 敏感数据加密存储
- 定期数据备份
- 访问日志记录

### 6.3 网络安全
- HTTPS强制使用
- 防火墙配置
- VPN访问 (可选)
- 定期安全更新

## 7. 性能优化

### 7.1 后端优化
- 数据库连接池
- Redis缓存
- API响应压缩
- 查询优化

### 7.2 前端优化
- 代码分割
- 懒加载
- 图片优化
- CDN使用

## 8. 监控和日志

### 8.1 日志管理
- 结构化日志 (JSON格式)
- 日志级别分类
- 日志轮转和清理
- 错误日志告警

### 8.2 性能监控
- API响应时间监控
- 数据库性能监控
- 内存和CPU使用监控
- 磁盘空间监控

## 9. 开发计划

### 9.1 第一阶段 (1-2周)
- 搭建基础项目结构
- 配置开发环境
- 实现基础认证功能
- 创建核心数据模型

### 9.2 第二阶段 (2-3周)
- 实现AI模型配置管理
- 实现提示词模板管理
- 开发管理后台界面
- 集成前后端

### 9.3 第三阶段 (1-2周)
- 实现应用配置管理
- 添加统计和监控功能
- 性能优化和测试
- 部署和上线

总计开发时间：**4-7周**
