# API KEY 接口文档

## 📋 概述

本文档描述了如何使用 API KEY 访问占卜管理系统的公开接口。这些接口专为应用端（小程序、APP、网站等）设计，提供配置数据、AI 模型信息和提示词模板的访问。

## 🔑 认证方式

所有接口都需要在请求头中包含有效的 API KEY：

```http
X-API-Key: your-api-key-here
Content-Type: application/json
```

### 默认 API KEY

```
API KEY: zw_live_ed2257f4b4184d0f6960c6d0a006d26e
权限: configs:read, ai_models:read, prompts:read
状态: 启用
```

## 🌐 基础信息

- **基础 URL**: `https://zwam.vryo.de/api`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

## 📡 接口列表

### 📋 配置管理接口

#### 1. 获取平台配置

获取指定平台的应用配置信息。

**接口地址**
```
GET /public/configs/{platform}
```

**路径参数**
- `platform` (string, 必需): 平台类型
  - `web`: 网页端
  - `ios`: iOS 应用
  - `android`: Android 应用
  - `wechat`: 微信小程序

**查询参数**
- `category` (string, 可选): 配置分类，如 `basic`、`api`、`feature`

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/configs/web" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取配置成功",
  "data": [
    {
      "id": 1,
      "configKey": "app_name",
      "configValue": "占卜管理系统",
      "dataType": "string",
      "category": "basic",
      "description": "应用名称",
      "version": "1.0.0",
      "updatedAt": "2025-08-03T12:00:00.000Z"
    },
    {
      "id": 2,
      "configKey": "api_timeout",
      "configValue": "30000",
      "dataType": "number",
      "category": "api",
      "description": "API 超时时间（毫秒）",
      "version": "1.0.0",
      "updatedAt": "2025-08-03T12:00:00.000Z"
    }
  ]
}
```

### 🤖 AI 模型管理接口

#### 2. 获取活跃 AI 模型

获取当前启用的所有 AI 模型配置。

**接口地址**
```
GET /public/ai-models/active
```

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/ai-models/active" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取活跃AI模型成功",
  "data": [
    {
      "id": 1,
      "name": "gpt-4",
      "displayName": "GPT-4",
      "modelType": "chat",
      "parameters": {
        "temperature": 0.7,
        "max_tokens": 2000
      },
      "role": "primary",
      "priority": 1,
      "contextWindow": 8192,
      "provider": {
        "name": "openai",
        "displayName": "OpenAI",
        "baseUrl": "https://api.openai.com/v1"
      }
    }
  ]
}
```

### 3. 获取主要 AI 模型

获取当前设置为主要模型的 AI 配置。

**接口地址**
```
GET /public/ai-models/primary
```

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/ai-models/primary" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取主要AI模型成功",
  "data": {
    "id": 1,
    "name": "gpt-4",
    "displayName": "GPT-4",
    "modelType": "chat",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 2000
    },
    "role": "primary",
    "priority": 1,
    "contextWindow": 8192,
    "provider": {
      "name": "openai",
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1"
    }
  }
}
```

#### 4. 获取 AI 提供商列表

获取当前启用的所有 AI 提供商信息。

**接口地址**
```
GET /public/ai-models/providers
```

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/ai-models/providers" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取AI提供商列表成功",
  "data": [
    {
      "id": 1,
      "name": "openai",
      "displayName": "OpenAI",
      "baseUrl": "https://api.openai.com/v1",
      "description": "OpenAI官方API",
      "supportedModels": ["gpt-4", "gpt-3.5-turbo"]
    }
  ]
}
```

#### 5. 根据类型获取 AI 模型

根据模型类型获取对应的 AI 模型列表。

**接口地址**
```
GET /public/ai-models/by-type/{type}
```

**路径参数**
- `type` (string, 必需): 模型类型
  - `chat`: 对话模型
  - `completion`: 补全模型
  - `embedding`: 嵌入模型

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/ai-models/by-type/chat" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

### 💡 提示词管理接口

#### 6. 获取活跃提示词模板

获取当前启用的提示词模板。

**接口地址**
```
GET /public/prompts/active
```

**查询参数**
- `type` (string, 可选): 模板类型，如 `divination`、`chat`

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/prompts/active?type=divination" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取活跃提示词模板成功",
  "data": [
    {
      "id": 1,
      "name": "占卜解读模板",
      "type": "divination",
      "systemPrompt": "你是一位专业的占卜师...",
      "userPromptTemplate": "请为以下卦象进行解读：{hexagram}",
      "formatInstructions": "请按照以下格式输出...",
      "version": "1.0.0",
      "updatedAt": "2025-08-03T12:00:00.000Z"
    }
  ]
}
```

#### 7. 根据名称获取提示词模板

根据模板名称获取特定的提示词模板。

**接口地址**
```
GET /public/prompts/by-name/{name}
```

**路径参数**
- `name` (string, 必需): 模板名称

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/prompts/by-name/占卜解读模板" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

### 🔮 卦象数据接口

#### 8. 获取所有卦象数据

获取完整的64卦数据。

**接口地址**
```
GET /public/hexagrams/all
```

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/hexagrams/all" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

**响应示例**
```json
{
  "success": true,
  "message": "获取卦象数据成功",
  "data": [
    {
      "id": 1,
      "number": 1,
      "name": "Qian",
      "chineseName": "乾",
      "symbol": "☰",
      "upperTrigram": "乾",
      "lowerTrigram": "乾",
      "description": "天行健，君子以自强不息",
      "interpretation": "乾卦代表天，象征刚健、积极向上...",
      "keywords": ["刚健", "领导", "创造"],
      "element": "金",
      "season": "秋",
      "direction": "西北"
    }
  ]
}
```

#### 9. 根据编号获取卦象详情

根据卦象编号（1-64）获取详细信息。

**接口地址**
```
GET /public/hexagrams/{number}
```

**路径参数**
- `number` (integer, 必需): 卦象编号（1-64）

**请求示例**
```bash
curl -X GET "https://zwam.vryo.de/api/public/hexagrams/1" \
  -H "X-API-Key: zw_live_ed2257f4b4184d0f6960c6d0a006d26e" \
  -H "Content-Type: application/json"
```

## 🚨 错误响应

### 401 未授权
```json
{
  "success": false,
  "message": "缺少 API Key",
  "code": "NO_API_KEY"
}
```

### 403 权限不足
```json
{
  "success": false,
  "message": "权限不足",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### 404 资源不存在
```json
{
  "success": false,
  "message": "未找到主要AI模型",
  "code": "PRIMARY_MODEL_NOT_FOUND"
}
```

## 💻 客户端示例代码

### JavaScript/Node.js
```javascript
const axios = require('axios');

const apiClient = axios.create({
  baseURL: 'https://zwam.vryo.de/api',
  headers: {
    'X-API-Key': 'zw_live_ed2257f4b4184d0f6960c6d0a006d26e',
    'Content-Type': 'application/json'
  }
});

// 获取配置
async function getConfig(platform, category) {
  try {
    const response = await apiClient.get(`/public/configs/${platform}`, {
      params: category ? { category } : {}
    });
    return response.data;
  } catch (error) {
    console.error('获取配置失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取 AI 模型
async function getAIModels() {
  try {
    const response = await apiClient.get('/public/ai-models/active');
    return response.data;
  } catch (error) {
    console.error('获取AI模型失败:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
(async () => {
  try {
    const webConfig = await getConfig('web');
    console.log('Web配置:', webConfig);
    
    const aiModels = await getAIModels();
    console.log('AI模型:', aiModels);
  } catch (error) {
    console.error('请求失败:', error);
  }
})();
```

### Python
```python
import requests

class APIClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def get_config(self, platform, category=None):
        url = f"{self.base_url}/public/configs/{platform}"
        params = {'category': category} if category else {}
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_ai_models(self):
        url = f"{self.base_url}/public/ai-models/active"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

# 使用示例
client = APIClient(
    base_url='https://zwam.vryo.de/api',
    api_key='zw_live_ed2257f4b4184d0f6960c6d0a006d26e'
)

try:
    web_config = client.get_config('web')
    print('Web配置:', web_config)
    
    ai_models = client.get_ai_models()
    print('AI模型:', ai_models)
except requests.exceptions.RequestException as e:
    print('请求失败:', e)
```

## 📝 注意事项

1. **API KEY 安全**: 请妥善保管您的 API KEY，不要在客户端代码中硬编码
2. **请求频率**: 建议合理控制请求频率，避免过于频繁的调用
3. **缓存策略**: 配置数据变化不频繁，建议在客户端进行适当缓存
4. **错误处理**: 请务必处理各种错误情况，包括网络错误和业务错误
5. **HTTPS**: 生产环境请务必使用 HTTPS 协议

## 🔄 更新日志

- **v1.0.0** (2025-08-03): 初始版本，支持配置、AI模型、提示词接口
