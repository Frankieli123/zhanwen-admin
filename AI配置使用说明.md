# AI配置管理系统使用说明

## 概述

本系统已成功将AI配置从硬编码文件迁移到数据库管理，支持多模型配置、优先级管理和动态切换。

## 系统架构

### 数据库结构
- **ai_providers**: AI服务提供商表（DeepSeek、OpenAI、Anthropic等）
- **ai_models**: AI模型配置表（具体模型、API密钥、参数等）
- **app_configs**: 应用配置表（主题、功能开关等）

### API接口
- `GET /api/ai-models/active` - 获取当前活跃AI配置
- `GET /api/ai-models/primary` - 获取当前主模型
- `GET /api/ai-models` - 获取所有AI模型列表
- `GET /api/ai-providers/active` - 获取活跃的AI提供商

## 当前配置状态

### DeepSeek配置
- **提供商**: DeepSeek
- **模型**: deepseek-chat
- **API URL**: https://api.deepseek.com/chat/completions
- **API密钥**: 已配置（sk-052946e9f1cd46fcb5af103c6033220c）
- **角色**: primary（主模型）
- **优先级**: 1（最高优先级）
- **状态**: 活跃

### 模型参数
```json
{
  "temperature": 0.7,
  "max_tokens": 3000,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0,
  "stream": false
}
```

## 前端应用使用方法

### 1. 使用AI配置服务

```typescript
import AIConfigService from './services/aiConfigService';

// 获取当前AI配置
const config = await AIConfigService.getActiveConfiguration();

// 获取API调用配置
const apiConfig = await AIConfigService.getAPIConfig();

// 使用故障转移策略
const strategy = await AIConfigService.getModelSelectionStrategy();
```

### 2. 占卜服务集成

```typescript
import DivinationService from './services/divinationService';

// 获取卦象解读（自动使用当前AI配置）
const reading = await DivinationService.getHexagramReading(result);

// 使用故障转移的解读
const reading = await DivinationService.getHexagramReadingWithFallback(result);
```

## 管理后台使用

### 1. 登录管理后台
- URL: http://localhost:5173（前端）
- 用户名: admin
- 密码: admin123456

### 2. AI模型管理
1. 进入"AI模型"页面
2. 可以查看、编辑、创建AI模型配置
3. 设置模型角色（主模型/备用模型/禁用）
4. 调整优先级（数字越小优先级越高）
5. 配置API密钥和参数

### 3. 添加新的AI模型
1. 点击"创建"按钮
2. 选择AI提供商
3. 输入模型名称和显示名称
4. 配置API密钥
5. 设置模型参数
6. 选择角色和优先级

## 优先级和故障转移

### 优先级规则
- 数字越小优先级越高
- 主模型(primary)优先于备用模型(secondary)
- 系统自动选择优先级最高的活跃模型

### 故障转移机制
1. 首先尝试主模型
2. 如果主模型失败，按优先级尝试备用模型
3. 所有模型都失败时返回错误

## 配置更新流程

### 1. 通过管理后台更新
- 实时生效，无需重启服务
- 配置缓存自动刷新（5分钟缓存期）

### 2. 通过API更新
```javascript
// 清除配置缓存
AIConfigService.clearCache();

// 重新获取配置
const newConfig = await AIConfigService.getActiveConfiguration(false);
```

## 环境变量配置

### 后端环境变量
```bash
# 数据库配置
DATABASE_URL="postgresql://..."

# 加密配置
ENCRYPTION_KEY="your-32-character-encryption-key"

# API密钥（可选，优先使用数据库配置）
DEEPSEEK_API_KEY="your-deepseek-api-key"
```

### 前端环境变量
```bash
# API配置
VITE_API_BASE_URL="http://localhost:3001"
VITE_APP_TITLE="占卜应用管理后台"
```

## 测试验证

### 运行完整系统测试
```bash
node test-complete-system.js
```

### 运行AI配置测试
```bash
node test-ai-config.js
```

## 常见问题

### Q: 如何添加新的AI提供商？
A: 需要在数据库的ai_providers表中添加新记录，或通过管理后台的AI提供商管理功能添加。

### Q: 如何切换主模型？
A: 在管理后台的AI模型页面，将目标模型的角色设置为"主模型"，系统会自动将其他主模型降级为备用模型。

### Q: API密钥如何安全存储？
A: 所有API密钥都使用AES加密存储在数据库中，加密密钥通过环境变量配置。

### Q: 如何监控AI API调用？
A: 系统提供API调用统计功能，可以在管理后台查看调用次数、成功率和成本统计。

## 下一步扩展

1. **多语言支持**: 添加国际化配置
2. **成本监控**: 实时监控API调用成本
3. **性能优化**: 添加请求缓存和限流
4. **安全增强**: 添加API密钥轮换机制
5. **监控告警**: 添加模型故障告警

## 技术支持

如有问题，请检查：
1. 后端服务状态：http://localhost:3001/health
2. 数据库连接状态
3. API密钥配置
4. 网络连接状态

系统已完全配置完成，可以正常使用！
