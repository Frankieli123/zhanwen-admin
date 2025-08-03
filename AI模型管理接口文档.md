# AI模型管理接口文档

## 概述

本文档描述了zhanwen应用集成AI模型管理功能所需的接口。这些接口允许应用获取、配置和管理AI模型设置。

## 基础信息

- **服务器IP**: `37.120.170.174`
- **前端地址**: `https://zwam.vryo.de/`
- **基础URL**: `https://zwam.vryo.de/api` (生产环境)
- **本地开发**: `http://localhost:3001/api` (开发环境)
- **认证方式**: Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 部署配置

### 服务器信息
- **服务器IP**: `37.120.170.174`
- **前端管理界面**: `https://zwam.vryo.de/`
- **API基础地址**: `https://zwam.vryo.de/api`

### 环境配置
```bash
# 生产环境
API_BASE_URL=https://zwam.vryo.de/api

# 开发环境
API_BASE_URL=http://localhost:3001/api
```

### 网络要求
- 确保应用服务器能访问 `37.120.170.174:3001` 端口
- 支持HTTPS连接
- 建议配置CORS允许您的应用域名

## 认证

所有接口都需要在请求头中包含认证token：

```http
Authorization: Bearer <your-jwt-token>
```

### 获取认证Token
1. 访问管理界面：`https://zwam.vryo.de/`
2. 使用管理员账号登录
3. 在开发者工具中获取JWT token，或通过登录接口获取

## 接口列表

### 1. 获取活跃AI配置

获取当前系统中活跃的AI模型配置，包括主模型和备用模型。

**接口地址**: `GET /ai-models/active`

**请求示例**:
```http
GET https://zwam.vryo.de/api/ai-models/active
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取AI配置成功",
  "data": {
    "primary": {
      "id": 1,
      "name": "deepseek-chat",
      "displayName": "DeepSeek Chat",
      "apiKeyEncrypted": "sk-052946e9f1cd46fcb5af103c6033220c",
      "customApiUrl": "https://api.deepseek.com/v1",
      "modelType": "chat",
      "parameters": {
        "temperature": 0.7,
        "max_tokens": 3000,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
      },
      "role": "primary",
      "priority": 1,
      "costPer1kTokens": 0.002,
      "contextWindow": 32000,
      "isActive": true,
      "provider": {
        "id": 1,
        "name": "deepseek",
        "displayName": "DeepSeek",
        "baseUrl": "https://api.deepseek.com/v1"
      }
    },
    "backups": [
      {
        "id": 2,
        "name": "gpt-3.5-turbo",
        "displayName": "GPT-3.5 Turbo",
        "role": "secondary",
        "priority": 2,
        "isActive": true,
        "provider": {
          "name": "openai",
          "displayName": "OpenAI"
        }
      }
    ],
    "hasValidConfig": true
  }
}
```

### 2. 获取主模型配置

获取当前活跃的主模型配置。

**接口地址**: `GET /ai-models/primary`

**请求示例**:
```http
GET /api/ai-models/primary
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取主模型成功",
  "data": {
    "id": 1,
    "name": "deepseek-chat",
    "displayName": "DeepSeek Chat",
    "apiKeyEncrypted": "sk-052946e9f1cd46fcb5af103c6033220c",
    "customApiUrl": "https://api.deepseek.com/v1",
    "modelType": "chat",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 3000,
      "top_p": 1.0,
      "frequency_penalty": 0.0,
      "presence_penalty": 0.0
    },
    "role": "primary",
    "priority": 1,
    "costPer1kTokens": 0.002,
    "contextWindow": 32000,
    "isActive": true,
    "provider": {
      "id": 1,
      "name": "deepseek",
      "displayName": "DeepSeek",
      "baseUrl": "https://api.deepseek.com/v1"
    }
  }
}
```

### 3. 测试API连接

测试指定AI模型的API连接是否正常。

**接口地址**: `POST /ai-models/test-connection`

**请求参数**:
```json
{
  "provider": "deepseek",
  "apiKey": "sk-052946e9f1cd46fcb5af103c6033220c",
  "apiUrl": "https://api.deepseek.com/v1"
}
```

**请求示例**:
```http
POST /api/ai-models/test-connection
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "provider": "deepseek",
  "apiKey": "sk-052946e9f1cd46fcb5af103c6033220c",
  "apiUrl": "https://api.deepseek.com/v1"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "API连接测试成功",
  "data": {
    "connected": true,
    "responseTime": 245,
    "provider": "deepseek",
    "testTime": "2025-08-03T03:30:00.000Z"
  }
}
```

### 4. 拉取可用模型列表

从指定AI提供商拉取可用的模型列表。

**接口地址**: `POST /ai-models/fetch-models`

**请求参数**:
```json
{
  "provider": "deepseek",
  "apiKey": "sk-052946e9f1cd46fcb5af103c6033220c",
  "apiUrl": "https://api.deepseek.com/v1"
}
```

**请求示例**:
```http
POST /api/ai-models/fetch-models
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "provider": "deepseek",
  "apiKey": "sk-052946e9f1cd46fcb5af103c6033220c",
  "apiUrl": "https://api.deepseek.com/v1"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "成功拉取到 3 个模型",
  "data": [
    {
      "id": "deepseek-chat",
      "name": "deepseek-chat",
      "description": "deepseek-chat",
      "type": "chat"
    },
    {
      "id": "deepseek-coder",
      "name": "deepseek-coder",
      "description": "deepseek-coder",
      "type": "chat"
    },
    {
      "id": "deepseek-reasoner",
      "name": "deepseek-reasoner",
      "description": "deepseek-reasoner",
      "type": "chat"
    }
  ]
}
```

### 5. 获取AI提供商列表

获取系统中可用的AI提供商列表。

**接口地址**: `GET /ai-models/providers`

**请求示例**:
```http
GET /api/ai-models/providers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "获取提供商列表成功",
  "data": [
    {
      "id": 1,
      "name": "deepseek",
      "displayName": "DeepSeek",
      "baseUrl": "https://api.deepseek.com/v1",
      "isActive": true
    },
    {
      "id": 2,
      "name": "openai",
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1",
      "isActive": true
    },
    {
      "id": 3,
      "name": "custom",
      "displayName": "自定义提供商",
      "baseUrl": "",
      "isActive": true
    }
  ]
}
```

## 数据结构说明

### AIModelConfig 对象

```typescript
interface AIModelConfig {
  id: number;                    // 模型ID
  name: string;                  // 模型名称
  displayName: string;           // 显示名称
  apiKeyEncrypted: string;       // API密钥
  customApiUrl?: string;         // 自定义API地址
  modelType: string;             // 模型类型: chat/completion/embedding
  parameters: {                  // 模型参数
    temperature: number;         // 温度参数 (0-2)
    max_tokens: number;          // 最大令牌数
    top_p: number;              // Top P参数 (0-1)
    frequency_penalty: number;   // 频率惩罚 (-2 to 2)
    presence_penalty: number;    // 存在惩罚 (-2 to 2)
  };
  role: 'primary' | 'secondary' | 'disabled';  // 角色
  priority: number;              // 优先级 (数字越小优先级越高)
  costPer1kTokens: number;      // 每1K tokens成本
  contextWindow: number;         // 上下文窗口大小
  isActive: boolean;            // 是否启用
  provider: {                   // 提供商信息
    id: number;
    name: string;
    displayName: string;
    baseUrl: string;
  };
}
```

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "error": {
    "code": "ERROR_CODE",
    "details": "详细错误信息"
  }
}
```

## 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| UNAUTHORIZED | 401 | 未授权，token无效或过期 |
| FORBIDDEN | 403 | 权限不足 |
| MODEL_NOT_FOUND | 404 | 模型不存在 |
| PROVIDER_NOT_FOUND | 404 | 提供商不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| API_CONNECTION_FAILED | 500 | API连接测试失败 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 使用示例

### JavaScript/TypeScript 示例

```javascript
// 配置API基础地址
const API_BASE_URL = 'https://zwam.vryo.de/api';

// 获取活跃AI配置
async function getActiveAIConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-models/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('主模型:', result.data.primary);
      console.log('备用模型:', result.data.backups);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('获取AI配置失败:', error);
    throw error;
  }
}

// 测试API连接
async function testAPIConnection(provider, apiKey, apiUrl) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-models/test-connection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider,
        apiKey,
        apiUrl
      })
    });
    
    const result = await response.json();
    return result.success && result.data.connected;
  } catch (error) {
    console.error('API连接测试失败:', error);
    return false;
  }
}

// 完整的AI配置服务类
class AIConfigService {
  constructor(baseUrl = 'https://zwam.vryo.de/api', token = '') {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // 设置认证token
  setToken(token) {
    this.token = token;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '请求失败');
    }

    return result.data;
  }

  // 获取活跃AI配置
  async getActiveConfig() {
    return await this.request('/ai-models/active');
  }

  // 获取主模型
  async getPrimaryModel() {
    return await this.request('/ai-models/primary');
  }

  // 测试连接
  async testConnection(provider, apiKey, apiUrl) {
    return await this.request('/ai-models/test-connection', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey, apiUrl })
    });
  }

  // 拉取模型列表
  async fetchModels(provider, apiKey, apiUrl) {
    return await this.request('/ai-models/fetch-models', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey, apiUrl })
    });
  }
}

// 使用示例
const aiService = new AIConfigService();
aiService.setToken('your-jwt-token-here');

// 获取AI配置
const config = await aiService.getActiveConfig();
console.log('当前AI配置:', config);
```

## 集成步骤

### 1. 环境配置
```bash
# 在您的应用中设置环境变量
ZHANWEN_API_URL=https://zwam.vryo.de/api
ZHANWEN_API_TOKEN=your-jwt-token
```

### 2. 网络配置
确保您的应用服务器能够访问：
- IP: `37.120.170.174`
- 端口: `3001` (HTTP) 或 `443` (HTTPS)
- 协议: HTTPS (推荐)

### 3. 防火墙设置
如果您的服务器有防火墙，请确保允许出站连接到：
```bash
# 允许HTTPS出站连接
iptables -A OUTPUT -p tcp --dport 443 -d 37.120.170.174 -j ACCEPT
```

### 4. 测试连接
```bash
# 测试网络连通性
curl -I https://zwam.vryo.de/api/ai-models/active

# 测试API响应
curl -H "Authorization: Bearer your-token" \
     https://zwam.vryo.de/api/ai-models/active
```

## 注意事项

1. **API密钥安全**: API密钥在传输和存储时都会被加密处理
2. **速率限制**: 建议在调用测试连接和拉取模型接口时添加适当的延迟
3. **错误处理**: 请务必处理所有可能的错误情况
4. **缓存策略**: 建议对AI配置信息进行适当缓存，避免频繁请求
5. **权限控制**: 确保用户具有相应的权限才能访问这些接口

## 更新日志

- **v1.0.0** (2025-08-03): 初始版本，包含基础AI模型管理功能
