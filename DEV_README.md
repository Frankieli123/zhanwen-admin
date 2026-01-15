# 开发环境使用指南

## 本地开发环境启动

### 方式1：直接使用 npm（推荐）
```bash
# 同时启动前后端开发服务器（支持热重载）
npm run dev

# 或者分别启动
npm run dev:backend  # 后端开发服务器
npm run dev:frontend # 前端开发服务器
```

### 方式2：使用 nixpacks 开发配置
```bash
# 使用开发配置构建
nixpacks build . --config nixpacks.dev.toml --name zhanwen-dev

# 运行开发容器
docker run -p 3001:3001 -p 5173:5173 zhanwen-dev
```

### 方式3：Windows 批处理脚本
```cmd
# 直接运行开发脚本
start-all.bat
```

## 开发环境特点

- **前端**: Vite 开发服务器，支持热重载（`start-all.bat` 默认 http://localhost:3006；直接运行 `cd zhanwen-admin-vue && npm run dev` 默认 5173）
- **后端**: Nodemon 监听文件变化，自动重启 (http://localhost:3001)
- **数据库**: Prisma + PostgreSQL（迁移需要手动执行）

## 数据库/Prisma（你要改的文件）

- **改数据库连接**：编辑 `backend/.env` 的 `DATABASE_URL`（先复制 `backend/.env.example`）
- **改表结构**：编辑 `backend/prisma/schema.prisma`（不要改 `backend/node_modules/.prisma/**`）
- **生成并应用迁移**：`npm --prefix backend run migrate`（等价 `npm --prefix backend run prisma:migrate`）
- **仅应用已存在迁移（生产）**：`npm --prefix backend run prisma:deploy`

## 生产部署

保持使用原有的 `nixpacks.toml` 配置，直接推送到 Coolify：

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin main
```

Coolify 会自动使用 `nixpacks.toml` 进行生产部署。

## 文件说明

- `nixpacks.toml` - 生产环境配置（Coolify 使用）
- `nixpacks.dev.toml` - 开发环境配置
- `start-all.bat` - Windows 一键启动（后端 + 管理端前端）
- `docker-compose.yml` - Docker Compose（含 Postgres + 后端 + 前端）
- `.env.example` - Docker Compose 环境变量示例（根目录）
- `backend/.env.example` - 后端环境变量示例
- `zhanwen-admin-vue/.env.example` - 管理端前端环境变量示例

## 端口配置

- 前端开发服务器: 3006（`start-all.bat` 默认）/ 5173（Vite 默认）
- 后端开发服务器: 3001
- 生产环境: 3001（前端静态文件由后端服务）
