# 占卜应用管理后台数据库设计

## 1. 数据库概览

**数据库类型**: PostgreSQL 14+  
**字符集**: UTF8  
**时区**: UTC  

## 2. 核心表结构设计

### 2.1 AI服务服务商表 (ai_providers)

```sql
CREATE TABLE ai_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,           -- 服务商名称
    display_name VARCHAR(100) NOT NULL,          -- 显示名称
    base_url TEXT NOT NULL,                      -- API基础URL
    auth_type VARCHAR(20) DEFAULT 'api_key',     -- 认证类型
    supported_models TEXT[] DEFAULT '{}',        -- 支持的模型列表
    rate_limit_rpm INTEGER DEFAULT 60,          -- 每分钟请求限制
    rate_limit_tpm INTEGER DEFAULT 60000,       -- 每分钟token限制
    is_active BOOLEAN DEFAULT true,             -- 是否启用
    metadata JSONB DEFAULT '{}',                -- 额外元数据
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_providers_active ON ai_providers(is_active);
CREATE INDEX idx_ai_providers_name ON ai_providers(name);
```

### 2.2 AI模型配置表 (ai_models)

```sql
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES ai_providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                  -- 模型名称
    display_name VARCHAR(100) NOT NULL,          -- 显示名称
    api_key_encrypted TEXT,                      -- 加密的API密钥
    model_type VARCHAR(50) DEFAULT 'chat',       -- 模型类型
    parameters JSONB DEFAULT '{
        "temperature": 0.7,
        "max_tokens": 3000,
        "top_p": 1.0,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
    }',                                          -- 模型参数
    role VARCHAR(20) DEFAULT 'secondary',        -- primary/secondary/disabled
    priority INTEGER DEFAULT 100,               -- 优先级 (数字越小优先级越高)
    cost_per_1k_tokens DECIMAL(10,6) DEFAULT 0, -- 每1K tokens成本
    context_window INTEGER DEFAULT 4000,        -- 上下文窗口大小
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(provider_id, name)
);

-- 索引
CREATE INDEX idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX idx_ai_models_role ON ai_models(role);
CREATE INDEX idx_ai_models_active ON ai_models(is_active);
CREATE INDEX idx_ai_models_priority ON ai_models(priority);
```

### 2.3 提示词模板表 (prompt_templates)

```sql
CREATE TABLE prompt_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                  -- 模板名称
    type VARCHAR(50) NOT NULL,                   -- system/user/format
    category VARCHAR(50) DEFAULT 'general',      -- 分类
    system_prompt TEXT,                          -- 系统提示词
    user_prompt_template TEXT,                   -- 用户提示词模板
    format_instructions TEXT,                    -- 格式说明
    variables JSONB DEFAULT '[]',                -- 模板变量定义
    version INTEGER DEFAULT 1,                  -- 版本号
    status VARCHAR(20) DEFAULT 'draft',          -- draft/active/deprecated
    description TEXT,                            -- 描述
    tags TEXT[] DEFAULT '{}',                    -- 标签
    usage_count INTEGER DEFAULT 0,              -- 使用次数
    effectiveness_score DECIMAL(3,2),           -- 效果评分
    created_by INTEGER,                          -- 创建者ID
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(name, version)
);

-- 索引
CREATE INDEX idx_prompt_templates_type ON prompt_templates(type);
CREATE INDEX idx_prompt_templates_status ON prompt_templates(status);
CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_tags ON prompt_templates USING GIN(tags);
```

### 2.4 应用配置表 (app_configs)

```sql
CREATE TABLE app_configs (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,              -- web/ios/android/wechat
    config_key VARCHAR(100) NOT NULL,            -- 配置键
    config_value JSONB NOT NULL,                 -- 配置值
    data_type VARCHAR(20) DEFAULT 'json',        -- json/string/number/boolean
    category VARCHAR(50) DEFAULT 'general',      -- 配置分类
    description TEXT,                            -- 配置描述
    version INTEGER DEFAULT 1,                  -- 版本号
    is_active BOOLEAN DEFAULT true,             -- 是否生效
    is_sensitive BOOLEAN DEFAULT false,         -- 是否敏感数据
    validation_rules JSONB DEFAULT '{}',        -- 验证规则
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(platform, config_key)
);

-- 索引
CREATE INDEX idx_app_configs_platform ON app_configs(platform);
CREATE INDEX idx_app_configs_category ON app_configs(category);
CREATE INDEX idx_app_configs_active ON app_configs(is_active);
```

### 2.5 卦象数据表 (hexagram_data)

```sql
CREATE TABLE hexagram_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,            -- 卦象名称
    element VARCHAR(20) NOT NULL,                -- 五行属性
    description TEXT,                            -- 卦象描述
    interpretation TEXT,                         -- 解释文本
    favorable_actions TEXT[],                    -- 宜做的事
    unfavorable_actions TEXT[],                  -- 忌做的事
    time_info JSONB DEFAULT '{}',                -- 时间信息
    direction_info JSONB DEFAULT '{}',           -- 方位信息
    resolution_methods TEXT[],                   -- 化解方法
    metadata JSONB DEFAULT '{}',                 -- 额外元数据
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_hexagram_data_element ON hexagram_data(element);
CREATE INDEX idx_hexagram_data_active ON hexagram_data(is_active);
```

### 2.6 五行关系表 (element_relations)

```sql
CREATE TABLE element_relations (
    id SERIAL PRIMARY KEY,
    source_element VARCHAR(20) NOT NULL,         -- 源五行
    target_element VARCHAR(20) NOT NULL,         -- 目标五行
    relation_type VARCHAR(20) NOT NULL,          -- generate/overcome/neutral
    strength INTEGER DEFAULT 1,                 -- 关系强度 1-5
    description TEXT,                            -- 关系描述
    effect_description TEXT,                     -- 影响描述
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(source_element, target_element)
);

-- 索引
CREATE INDEX idx_element_relations_source ON element_relations(source_element);
CREATE INDEX idx_element_relations_target ON element_relations(target_element);
CREATE INDEX idx_element_relations_type ON element_relations(relation_type);
```

### 2.7 多语言内容表 (i18n_contents)

```sql
CREATE TABLE i18n_contents (
    id SERIAL PRIMARY KEY,
    content_key VARCHAR(200) NOT NULL,           -- 内容键
    language_code VARCHAR(10) NOT NULL,          -- 语言代码
    content_value TEXT NOT NULL,                 -- 内容值
    content_type VARCHAR(50) DEFAULT 'text',     -- text/html/markdown
    category VARCHAR(50) DEFAULT 'general',      -- 内容分类
    description TEXT,                            -- 描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(content_key, language_code)
);

-- 索引
CREATE INDEX idx_i18n_contents_key ON i18n_contents(content_key);
CREATE INDEX idx_i18n_contents_lang ON i18n_contents(language_code);
CREATE INDEX idx_i18n_contents_category ON i18n_contents(category);
```

## 3. 运营数据表

### 3.1 API调用日志表 (api_call_logs)

```sql
CREATE TABLE api_call_logs (
    id BIGSERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ai_models(id),
    request_id VARCHAR(100),                     -- 请求ID
    user_id VARCHAR(100),                        -- 用户ID (可选)
    platform VARCHAR(20),                       -- 平台
    prompt_hash VARCHAR(64),                     -- 提示词哈希
    tokens_used INTEGER,                        -- 使用的token数
    cost DECIMAL(10,6),                         -- 成本
    response_time_ms INTEGER,                   -- 响应时间(毫秒)
    status VARCHAR(20),                         -- success/error/timeout
    error_message TEXT,                         -- 错误信息
    metadata JSONB DEFAULT '{}',                -- 额外数据
    created_at TIMESTAMP DEFAULT NOW()
);

-- 分区表 (按月分区)
CREATE INDEX idx_api_call_logs_created_at ON api_call_logs(created_at);
CREATE INDEX idx_api_call_logs_model_id ON api_call_logs(model_id);
CREATE INDEX idx_api_call_logs_status ON api_call_logs(status);
CREATE INDEX idx_api_call_logs_platform ON api_call_logs(platform);
```

### 3.2 使用统计表 (usage_statistics)

```sql
CREATE TABLE usage_statistics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,                          -- 统计日期
    platform VARCHAR(20) NOT NULL,              -- 平台
    metric_name VARCHAR(100) NOT NULL,           -- 指标名称
    metric_value BIGINT NOT NULL,                -- 指标值
    metadata JSONB DEFAULT '{}',                 -- 额外数据
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(date, platform, metric_name)
);

-- 索引
CREATE INDEX idx_usage_statistics_date ON usage_statistics(date);
CREATE INDEX idx_usage_statistics_platform ON usage_statistics(platform);
CREATE INDEX idx_usage_statistics_metric ON usage_statistics(metric_name);
```

## 4. 系统管理表

### 4.1 管理员用户表 (admin_users)

```sql
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,       -- 用户名
    email VARCHAR(100) NOT NULL UNIQUE,         -- 邮箱
    password_hash VARCHAR(255) NOT NULL,        -- 密码哈希
    full_name VARCHAR(100),                     -- 全名
    role VARCHAR(50) DEFAULT 'admin',           -- 角色
    permissions JSONB DEFAULT '[]',             -- 权限列表
    is_active BOOLEAN DEFAULT true,             -- 是否激活
    last_login_at TIMESTAMP,                    -- 最后登录时间
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
```

### 4.2 操作日志表 (operation_logs)

```sql
CREATE TABLE operation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,               -- 操作类型
    resource_type VARCHAR(50) NOT NULL,         -- 资源类型
    resource_id VARCHAR(100),                   -- 资源ID
    old_values JSONB,                           -- 修改前的值
    new_values JSONB,                           -- 修改后的值
    ip_address INET,                            -- IP地址
    user_agent TEXT,                            -- 用户代理
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_action ON operation_logs(action);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);
```

## 5. 数据库函数和触发器

### 5.1 更新时间触发器

```sql
-- 创建更新时间函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加触发器
CREATE TRIGGER update_ai_providers_updated_at 
    BEFORE UPDATE ON ai_providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at 
    BEFORE UPDATE ON ai_models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... 为其他表添加类似触发器
```

### 5.2 配置版本管理函数

```sql
-- 创建配置版本管理函数
CREATE OR REPLACE FUNCTION increment_config_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为配置表添加版本触发器
CREATE TRIGGER increment_app_configs_version 
    BEFORE UPDATE ON app_configs 
    FOR EACH ROW EXECUTE FUNCTION increment_config_version();
```

## 6. 初始化数据

### 6.1 默认AI服务商

```sql
INSERT INTO ai_providers (name, display_name, base_url, supported_models) VALUES
('deepseek', 'DeepSeek', 'https://api.deepseek.com', ARRAY['deepseek-chat', 'deepseek-coder']),
('openai', 'OpenAI', 'https://api.openai.com/v1', ARRAY['gpt-4', 'gpt-3.5-turbo']),
('anthropic', 'Anthropic', 'https://api.anthropic.com', ARRAY['claude-3-opus', 'claude-3-sonnet']);
```

### 6.2 默认卦象数据

```sql
INSERT INTO hexagram_data (name, element, description) VALUES
('大安', 'wood', '大安卦象征平安吉祥，事业稳定发展'),
('留连', 'earth', '留连卦象征拖延迟缓，需要耐心等待'),
('速喜', 'fire', '速喜卦象征快速成功，喜事临门'),
('赤口', 'metal', '赤口卦象征口舌是非，需要谨慎言行'),
('小吉', 'water', '小吉卦象征小有收获，渐进发展'),
('空亡', 'earth', '空亡卦象征虚无缥缈，需要重新规划');
```

## 7. 性能优化

### 7.1 分区策略
- `api_call_logs` 表按月分区
- `usage_statistics` 表按年分区
- `operation_logs` 表按季度分区

### 7.2 索引优化
- 为常用查询字段创建复合索引
- 为JSONB字段创建GIN索引
- 定期分析和优化查询性能

### 7.3 数据清理策略
- API调用日志保留6个月
- 操作日志保留1年
- 统计数据永久保留
