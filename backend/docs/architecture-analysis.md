# 占卜应用架构分析报告

## 1. 项目概述

**项目名称**: 占问 - 六壬金口诀智能占卜应用  
**技术栈**: React + TypeScript + Tailwind CSS + Capacitor  
**目标平台**: Web、iOS、Android、微信小程序  

## 2. 当前架构分析

### 2.1 前端架构
```
divination-app/
├── src/
│   ├── components/          # UI组件
│   │   ├── hand/            # 手掌相关组件
│   │   ├── hexagram/        # 卦象相关组件
│   │   └── Settings.tsx     # 设置组件
│   ├── data/                # 静态数据
│   ├── hooks/               # 自定义Hooks
│   ├── services/            # API服务
│   │   ├── apiService.ts    # AI API调用
│   │   └── logService.ts    # 日志服务
│   ├── store/               # 状态管理 (Zustand)
│   ├── types/               # TypeScript类型定义
│   └── utils/               # 工具函数
│       ├── db.ts            # 本地数据库 (Dexie)
│       └── platformUtils.ts # 平台检测工具
```

### 2.2 核心功能模块

#### 2.2.1 AI服务配置 (apiService.ts)
**当前问题**:
- API配置硬编码在代码中
- 缺乏动态配置能力
- 无法热更新AI模型参数

```typescript
// 当前配置方式
const DEEPSEEK_API_URL = process.env.REACT_APP_API_URL || 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.REACT_APP_API_KEY || 'sk-052946e9f1cd46fcb5af103c6033220c';
```

#### 2.2.2 应用设置管理 (useAppStore.ts)
**当前状态**:
- 使用Zustand进行状态管理
- 本地存储持久化
- 支持主题、字体、语言等配置

```typescript
interface AppSettings {
  theme: ThemeMode;
  fontSize: number;
  fontFamily: FontFamily;
  language: string;
  vibration: boolean;
  liuLianElement: FiveElement;
  xiaoJiElement: FiveElement;
  useColorSymbols: boolean;
}
```

#### 2.2.3 数据存储 (db.ts)
**当前方案**:
- 使用Dexie (IndexedDB)进行本地存储
- 支持数据加密
- 版本化数据库结构

### 2.3 多平台支持

#### 2.3.1 平台检测 (platformUtils.ts)
- 支持Android、iOS、Web平台检测
- WebView环境识别
- 设备像素比适配

#### 2.3.2 Capacitor集成
- 支持原生应用打包
- 跨平台API调用

## 3. 管理后台需求分析

### 3.1 核心管理需求

#### 3.1.1 AI模型配置管理
- **API配置**: URL、密钥、模型选择
- **参数调优**: temperature、max_tokens、top_p
- **服务商管理**: DeepSeek、OpenAI、Claude等
- **备用模型**: 主备切换机制

#### 3.1.2 提示词模板管理
- **系统提示词**: AI角色定义
- **解读模板**: 不同类型卦象的解读模板
- **格式规范**: 输出格式控制
- **版本管理**: 提示词版本控制

#### 3.1.3 应用配置管理
- **主题配置**: 颜色方案、字体设置
- **功能开关**: 特性开关控制
- **平台特定配置**: 不同平台的差异化配置
- **版本控制**: 配置版本管理

#### 3.1.4 内容管理
- **卦象数据**: 卦象信息、解释文本
- **五行配置**: 五行属性、相生相克关系
- **多语言内容**: 国际化文本管理

#### 3.1.5 运营数据
- **使用统计**: 用户行为分析
- **API调用监控**: 成本控制、性能监控
- **错误日志**: 问题追踪和诊断
- **A/B测试**: 功能测试管理

### 3.2 平台特殊需求

#### 3.2.1 微信小程序
- **域名白名单**: API域名管理
- **内容审核**: 敏感内容过滤
- **功能限制**: 平台特定功能开关

#### 3.2.2 iOS应用
- **审核合规**: 避免热更新敏感操作
- **配置缓存**: 本地配置缓存策略

#### 3.2.3 Android应用
- **权限管理**: 网络权限配置
- **性能优化**: 资源加载优化

## 4. 技术架构设计

### 4.1 整体架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React-Admin    │    │   配置API服务    │    │   占卜应用      │
│   管理后台      │───▶│  (Node.js)      │◀───│ (多平台客户端)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   配置数据库     │
                       └──────────────────┘
```

### 4.2 数据库设计

#### 4.2.1 AI配置表 (ai_configs)
```sql
CREATE TABLE ai_configs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  api_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_fallback BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.2.2 提示词模板表 (prompt_templates)
```sql
CREATE TABLE prompt_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  system_prompt TEXT,
  user_prompt_template TEXT,
  format_instructions TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.2.3 应用配置表 (app_configs)
```sql
CREATE TABLE app_configs (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, config_key)
);
```

### 4.3 API接口设计

#### 4.3.1 配置获取接口
```typescript
// GET /api/config/{platform}
interface ConfigResponse {
  aiConfig: {
    primary: AIModelConfig;
    fallback: AIModelConfig;
    parameters: AIParameters;
  };
  prompts: {
    systemPrompt: string;
    templates: Record<string, string>;
  };
  appSettings: Record<string, any>;
  version: string;
}
```

#### 4.3.2 配置管理接口
```typescript
// POST /api/admin/ai-configs
// PUT /api/admin/ai-configs/{id}
// DELETE /api/admin/ai-configs/{id}
// GET /api/admin/ai-configs
```

## 5. 实施计划

### 5.1 第一阶段：基础架构
1. 搭建Node.js + Express API服务
2. 设计并创建PostgreSQL数据库
3. 实现基础的配置CRUD接口
4. 搭建React-Admin管理界面

### 5.2 第二阶段：核心功能
1. AI模型配置管理
2. 提示词模板管理
3. 客户端配置SDK开发
4. 占卜应用集成配置服务

### 5.3 第三阶段：高级功能
1. 版本控制和灰度发布
2. 监控和统计功能
3. A/B测试支持
4. 多平台特定配置

## 6. 风险评估

### 6.1 技术风险
- **配置同步**: 多平台配置一致性
- **缓存策略**: 配置更新延迟
- **安全性**: API密钥安全存储

### 6.2 业务风险
- **服务可用性**: 配置服务单点故障
- **审核合规**: 平台审核要求
- **成本控制**: API调用成本管理

## 7. 下一步行动

1. ✅ 完成架构分析
2. 🔄 定义详细功能需求
3. ⏳ 设计数据库结构
4. ⏳ 选择技术栈和框架
5. ⏳ 开始后端API开发
