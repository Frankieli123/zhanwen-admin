# API KEY 管理功能详尽文档

## 1. 功能概述

API KEY 管理功能是 zhanwen-admin 系统的核心安全模块，用于管理、分配和监控API访问密钥。该功能提供完整的密钥生命周期管理，包括创建、编辑、查看、删除、重新生成和使用统计等功能。

## 2. 页面组件结构

### 2.1 页面文件组织
```
frontend/src/pages/apiKeys/
├── index.ts          # 导出所有组件
├── list.tsx          # API KEY 列表页面
├── create.tsx        # 创建 API KEY 页面  
├── edit.tsx          # 编辑 API KEY 页面
├── show.tsx          # API KEY 详情页面
└── stats.tsx         # API KEY 使用统计页面
```

### 2.2 路由配置
- `/api-keys` - API KEY 列表页
- `/api-keys/create` - 创建 API KEY 页
- `/api-keys/edit/:id` - 编辑 API KEY 页
- `/api-keys/show/:id` - API KEY 详情页
- `/api-keys/stats` - 使用统计页

## 3. 数据模型和字段定义

### 3.1 API KEY 数据结构
```typescript
interface ApiKey {
  id: number;                    // 主键ID
  name: string;                  // API KEY 名称 (1-100字符)
  key: string;                   // API KEY 值 (自动生成)
  permissions: string[];         // 权限列表
  description?: string;          // 描述 (0-500字符)
  isActive: boolean;             // 启用状态
  expiresAt?: string | null;     // 过期时间 (ISO格式)
  lastUsedAt?: string | null;    // 最后使用时间
  usageCount: number;            // 使用次数
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}
```

### 3.2 权限系统
```typescript
const AVAILABLE_PERMISSIONS = [
  { value: 'configs:read', label: '配置读取', color: 'blue' },
  { value: 'ai_models:read', label: 'AI模型读取', color: 'green' },
  { value: 'prompts:read', label: '提示词读取', color: 'orange' },
  { value: 'hexagrams:read', label: '卦象读取', color: 'purple' },
  { value: 'analytics:read', label: '分析数据读取', color: 'cyan' },
  { value: 'usage:write', label: '使用数据上报', color: 'red' },
];
```

### 3.3 验证规则
```typescript
// 创建验证
const createValidation = {
  name: 必填，1-100字符
  permissions: 可选，数组格式，至少选择一个
  description: 可选，0-500字符
  isActive: 可选，布尔值，默认true
  expiresAt: 可选，ISO日期格式或null
}

// 更新验证
const updateValidation = {
  name: 可选，1-100字符
  permissions: 可选，数组格式
  description: 可选，0-500字符
  isActive: 可选，布尔值
  expiresAt: 可选，ISO日期格式或null
}
```

## 4. API 接口详细规范

### 4.1 API 基础配置
```typescript
// 基础URL配置
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api'
);

// 认证头
Authorization: `Bearer ${token}`
```

### 4.2 接口列表

#### 4.2.1 获取 API KEY 列表
```http
GET /api/api-keys
```

**请求参数：**
```typescript
{
  page?: number;        // 页码，默认1
  limit?: number;       // 每页数量，默认10，最大100
  search?: string;      // 搜索关键词，匹配name和description
  sort?: 'asc' | 'desc'; // 排序方向
}
```

**响应格式：**
```typescript
{
  success: boolean;
  message: string;
  data: ApiKey[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### 4.2.2 获取 API KEY 详情
```http
GET /api/api-keys/{id}
```

**路径参数：**
- `id`: API KEY ID (必填)

**响应格式：**
```typescript
{
  success: boolean;
  message: string;
  data: ApiKey;
}
```

#### 4.2.3 创建 API KEY
```http
POST /api/api-keys
```

**请求体：**
```typescript
{
  name: string;           // 必填，API KEY 名称
  permissions: string[];  // 必填，权限列表
  description?: string;   // 可选，描述
  isActive?: boolean;     // 可选，启用状态，默认true
  expiresAt?: string;     // 可选，过期时间
}
```

**响应格式：**
```typescript
{
  success: boolean;
  message: string;
  data: ApiKey;  // 包含生成的key字段
}
```

#### 4.2.4 更新 API KEY
```http
PUT /api/api-keys/{id}
```

**路径参数：**
- `id`: API KEY ID (必填)

**请求体：**
```typescript
{
  name?: string;          // 可选，API KEY 名称
  permissions?: string[]; // 可选，权限列表
  description?: string;   // 可选，描述
  isActive?: boolean;     // 可选，启用状态
  expiresAt?: string;     // 可选，过期时间
}
```

#### 4.2.5 删除 API KEY
```http
DELETE /api/api-keys/{id}
```

**路径参数：**
- `id`: API KEY ID (必填)

#### 4.2.6 重新生成 API KEY
```http
POST /api/api-keys/{id}/regenerate
```

**路径参数：**
- `id`: API KEY ID (必填)

**响应格式：**
```typescript
{
  success: boolean;
  message: string;
  data: {
    id: number;
    key: string;  // 新生成的API KEY
  };
}
```

#### 4.2.7 批量删除 API KEY
```http
DELETE /api/api-keys/batch
```

**请求体：**
```typescript
{
  ids: number[];  // API KEY ID 数组
}
```

#### 4.2.8 获取使用统计
```http
GET /api/api-keys/usage-stats
```

**请求参数：**
```typescript
{
  days?: number;  // 统计天数，默认30
}
```

**响应格式：**
```typescript
{
  success: boolean;
  message: string;
  data: {
    summary: {
      totalKeys: number;
      activeKeys: number;
      recentlyUsedKeys: number;
      totalUsage: number;
      averageUsage: number;
    };
    apiKeys: ApiKeyStats[];
    period: {
      days: number;
      startDate: string;
      endDate: string;
    };
  };
}
```

## 5. 前端组件功能详解

### 5.1 列表页面 (list.tsx)

**主要功能：**
- 分页显示API KEY列表
- 搜索和筛选
- 快速操作（查看、编辑、删除、重新生成）
- 复制API KEY到剪贴板
- 掩码显示API KEY（前8位+星号+后4位）

**关键特性：**
- 权限标签彩色显示
- 状态标签（启用/禁用）
- 使用次数统计
- 最后使用时间
- 操作确认对话框

**表格列定义：**
```typescript
const columns = [
  { title: "名称", dataIndex: "name", sorter: true },
  { title: "API KEY", dataIndex: "key", render: 掩码+复制 },
  { title: "权限", dataIndex: "permissions", render: 彩色标签 },
  { title: "状态", dataIndex: "isActive", render: 状态标签 },
  { title: "使用次数", dataIndex: "usageCount", sorter: true },
  { title: "最后使用", dataIndex: "lastUsedAt" },
  { title: "过期时间", dataIndex: "expiresAt" },
  { title: "创建时间", dataIndex: "createdAt" },
  { title: "操作", render: 操作按钮组 }
];
```

### 5.2 创建页面 (create.tsx)

**表单字段：**
- 基本信息
  - 名称 (必填)
  - 描述 (可选)
- 权限配置
  - 权限多选 (必填，至少一个)
  - 权限说明展示
- 高级设置
  - 过期时间 (可选)
  - 启用状态 (默认启用)

**表单验证：**
- 名称：1-100字符，必填
- 描述：0-500字符，可选
- 权限：至少选择一个
- 过期时间：有效的ISO日期格式

### 5.3 编辑页面 (edit.tsx)

**功能特性：**
- 与创建页面类似的表单结构
- 显示当前API KEY值
- 提供复制和重新生成功能
- 显示使用统计信息
- 支持日期格式转换

**特殊功能：**
- API KEY显示和复制
- 重新生成确认对话框
- 实时使用统计展示

### 5.4 详情页面 (show.tsx)

**展示信息：**
- 基本信息（名称、描述、状态）
- API KEY（可切换显示/隐藏完整值）
- 权限配置（彩色标签显示）
- 使用统计（使用次数、最后使用时间）
- 使用示例（JavaScript代码示例）

**交互功能：**
- API KEY 显示/隐藏切换
- 一键复制API KEY
- 权限标签详细说明

### 5.5 统计页面 (stats.tsx)

**统计维度：**
- 概览统计
  - 总API KEY数量
  - 活跃API KEY数量
  - 近期使用API KEY数量
  - 总调用次数
- 详细统计表格
  - 每个API KEY的使用情况
  - 创建时间和使用频率
  - 平均日使用量

**筛选选项：**
- 统计周期：7天、30天、90天、1年

## 6. 权限和安全

### 6.1 认证要求
- 所有API接口需要Bearer Token认证
- Token过期自动刷新机制
- 登录失效自动跳转

### 6.2 权限控制
```typescript
// 前端权限检查
requirePermission('api_keys:read')    // 读取权限
requirePermission('api_keys:create')  // 创建权限  
requirePermission('api_keys:update')  // 更新权限
requirePermission('api_keys:delete')  // 删除权限
```

### 6.3 安全特性
- API KEY自动生成，保证唯一性
- 敏感操作（删除、重新生成）需要确认
- API KEY掩码显示，防止泄露
- 审计日志记录关键操作

## 7. 错误处理

### 7.1 常见错误码
```typescript
// 业务错误
API_KEY_NOT_FOUND: "API Key不存在"
DUPLICATE_NAME: "API Key名称已存在"
INVALID_PERMISSIONS: "权限配置无效"
EXPIRED_API_KEY: "API Key已过期"

// 验证错误
VALIDATION_ERROR: "输入数据验证失败"
REQUIRED_FIELD: "必填字段缺失"
INVALID_FORMAT: "数据格式错误"
```

### 7.2 错误处理机制
- 网络错误自动重试
- 用户友好的错误提示
- 表单验证实时反馈
- 操作失败回滚机制

## 8. 前端状态管理

### 8.1 Refine集成
```typescript
// 使用 Refine hooks
const { tableProps } = useTable({
  resource: "api-keys",
  syncWithLocation: true,
});

const { formProps, saveButtonProps } = useForm({
  resource: "api-keys",
});

const { queryResult } = useShow({
  resource: "api-keys",
});
```

### 8.2 数据提供者配置
```typescript
// dataProvider 资源映射
const resourceMap = {
  "api-keys": apiKeysAPI,
};

// 标准CRUD操作
- getList: 获取列表
- getOne: 获取详情  
- create: 创建资源
- update: 更新资源
- deleteOne: 删除资源
- deleteMany: 批量删除
```

## 9. 样式和UI组件

### 9.1 使用的Ant Design组件
```typescript
// 数据展示
Table, Tag, Descriptions, Statistic, Card

// 表单组件  
Form, Input, Select, Switch, DatePicker, Button

// 反馈组件
Modal, message, Tooltip

// 布局组件
Space, Row, Col, Grid
```

### 9.2 自定义样式
- 权限标签颜色映射
- 掩码API KEY显示
- 响应式布局设计
- 统计图表样式

## 10. 开发和调试

### 10.1 开发环境配置
```bash
# 安装依赖
npm install

# 启动前端开发服务器  
npm run dev:frontend

# 启动后端开发服务器
npm run dev:backend
```

### 10.2 调试技巧
- 使用浏览器开发者工具查看网络请求
- 检查控制台日志输出
- 利用Refine DevTools插件
- API响应数据验证

## 11. 部署说明

### 11.1 生产环境配置
```bash
# 构建前端
npm run build:frontend

# 构建后端  
npm run build:backend

# Docker部署
npm run docker:build
npm run docker:up
```

### 11.2 环境变量
```env
VITE_API_URL=http://localhost:3001/api  # API基础URL
NODE_ENV=production                      # 环境模式
```

## 12. 扩展和定制

### 12.1 新增权限类型
1. 在`AVAILABLE_PERMISSIONS`中添加新权限
2. 更新后端权限验证逻辑
3. 更新权限说明文档

### 12.2 自定义表单字段
1. 修改验证规则
2. 更新表单组件
3. 调整API接口参数

### 12.3 新增统计维度
1. 扩展统计API接口
2. 更新统计页面组件
3. 添加新的图表展示

---

该文档涵盖了API KEY管理功能的所有核心方面，为新前端框架的迁移提供了详尽的参考依据。