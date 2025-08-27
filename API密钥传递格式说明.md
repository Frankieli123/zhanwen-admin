# API密钥传递格式说明 - 用户端前端

## 问题现象
- **用户端前端**控制台显示: `app收到的是[API_KEY_HIDDEN]`
- 错误信息: `没有可用的AI模型配置`
- 占卜功能无法获取AI解读

## 用户端前端API密钥传递流程

### 1. 用户端前端调用链路
```typescript
// divinationService.ts 中的调用流程
DivinationService.generateAIReading()
  ↓
AIConfigService.getModelSelectionStrategy()  // 获取可用模型列表
  ↓
getModelAPIConfig(model)  // 提取单个模型的API配置
  ↓
callAIAPI(result, apiConfig)  // 实际调用AI服务
```

### 2. 关键代码位置

#### divinationService.ts 第257行:
```typescript
private static getModelAPIConfig(model: AIModelConfig) {
  return {
    apiUrl,
    apiKey: model.apiKeyEncrypted || '',  // 问题可能在这里
    model: model.name,
    parameters: model.parameters,
  };
}
```

#### divinationService.ts 第287行:
```typescript
const response = await fetch(apiConfig.apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiConfig.apiKey}`  // 这里使用的密钥
  },
  body: JSON.stringify(request)
});
```

### 3. 后端API返回格式

#### `/api/ai-models/active` 接口应该返回:
```json
{
  "success": true,
  "data": {
    "primary": {
      "id": 1,
      "name": "deepseek-chat",
      "displayName": "DeepSeek Chat",
      "apiKeyEncrypted": "sk-1234567890abcdef...",  // 应该是解密后的原始密钥
      "provider": {
        "name": "deepseek",
        "baseUrl": "https://api.deepseek.com"
      }
    },
    "backups": [...],
    "hasValidConfig": true
  }
}
```

## 用户端前端排查步骤

### 1. 在用户端前端添加调试日志
在 `divinationService.ts` 中添加日志：

```typescript
// 在 getModelAPIConfig 方法中添加
private static getModelAPIConfig(model: AIModelConfig) {
  console.log('用户端获取模型配置:', {
    modelName: model.name,
    apiKeyLength: model.apiKeyEncrypted?.length || 0,
    apiKeyPreview: model.apiKeyEncrypted ? 
      `${model.apiKeyEncrypted.substring(0, 10)}...` : 'null',
    isHidden: model.apiKeyEncrypted === '[API_KEY_HIDDEN]'
  });
  
  return {
    apiUrl,
    apiKey: model.apiKeyEncrypted || '',
    model: model.name,
    parameters: model.parameters,
  };
}
```

### 2. 检查用户端网络请求
在浏览器开发者工具中查看:
- Network 标签页中 `/api/ai-models/active` 请求的响应
- 确认 `apiKeyEncrypted` 字段是否包含实际密钥

### 3. 检查前端日志输出位置
搜索以下文件中的日志输出:
```bash
# 查找输出 "[API_KEY_HIDDEN]" 的位置
grep -r "API_KEY_HIDDEN" frontend/src/
grep -r "app收到的是" frontend/src/
```

### 4. 检查AI配置服务调用
```typescript
// 在 aiConfigService.ts 中添加调试日志
static async getAPIConfig() {
  const config = await this.getActiveConfiguration();
  console.log('AI配置原始数据:', config);
  
  if (!config.primary) {
    console.log('没有主模型配置');
    return null;
  }
  
  console.log('主模型API密钥:', config.primary.apiKeyEncrypted);
  
  return {
    apiUrl: ...,
    apiKey: config.primary.apiKeyEncrypted || '',
    model: config.primary.name,
    parameters: config.primary.parameters,
  };
}
```

## 可能的问题原因

### 1. 认证问题
- 前端请求 `/api/ai-models/active` 时没有正确的认证token
- 后端返回401或403错误

### 2. 数据库配置问题
- 数据库中没有配置AI模型
- AI模型的 `apiKeyEncrypted` 字段为空

### 3. 前端处理逻辑问题
- 前端在某处将真实密钥替换为了 `[API_KEY_HIDDEN]` 占位符
- API调用链路中的数据转换错误

## 调试建议

### 1. 在前端添加详细日志
```typescript
// 在调用AI服务的地方添加日志
console.log('准备调用AI服务，配置:', {
  apiUrl: config.apiUrl,
  apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : 'null',
  model: config.model
});
```

### 2. 检查网络请求
- 打开浏览器开发者工具
- 查看 Network 标签页
- 找到 `/api/ai-models/active` 请求
- 检查响应数据中的 `apiKeyEncrypted` 字段

### 3. 检查后端日志
- 查看后端控制台输出
- 确认数据库连接正常
- 确认AI模型配置存在且有效

## 修复方向

1. **如果后端返回空配置**: 需要在管理界面配置AI模型和API密钥
2. **如果后端返回正常但前端处理错误**: 检查前端的数据处理逻辑
3. **如果认证失败**: 检查前端的token传递和后端的认证中间件

## 测试验证

配置修复后，应该看到:
- 控制台不再显示 `[API_KEY_HIDDEN]`
- AI服务调用成功
- 前端能正常获取AI解读内容
