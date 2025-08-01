#!/bin/bash

# 占卜应用管理后台启动脚本
echo "🚀 启动占卜应用管理后台..."

# 设置环境变量
export NODE_ENV=production
export PORT=${PORT:-3001}

# 检查数据目录
if [ ! -d "/app/data" ]; then
    echo "📁 创建数据目录..."
    mkdir -p /app/data
fi

# 进入后端目录
cd backend

# 检查是否已构建
if [ ! -d "dist" ]; then
    echo "🔨 构建后端应用..."
    npm run build
fi

# 初始化数据库（如果需要）
if [ ! -f "/app/data/database.sqlite" ]; then
    echo "🗄️ 初始化数据库..."
    npm run migrate || echo "⚠️ 数据库迁移失败，继续启动..."
fi

# 启动后端服务
echo "✅ 启动后端服务..."
npm start
