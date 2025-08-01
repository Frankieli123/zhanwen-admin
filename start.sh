#!/bin/bash

# 占卜应用管理后台启动脚本
echo "🚀 启动占卜应用管理后台..."

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3001}

# 进入后端目录
cd backend

# 检查前端是否已构建
if [ ! -d "../frontend/dist" ]; then
    echo "🔨 构建前端应用..."
    cd ../frontend
    npm run build
    cd ../backend
fi

# 检查后端是否已构建
if [ ! -d "dist" ]; then
    echo "🔨 构建后端应用..."
    npm run build
fi

# 等待数据库连接
echo "🗄️ 等待数据库连接..."
sleep 5

# 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
npm run prisma:deploy || echo "⚠️ 数据库迁移失败，继续启动..."

# 启动后端服务
echo "✅ 启动后端服务..."
npm start
