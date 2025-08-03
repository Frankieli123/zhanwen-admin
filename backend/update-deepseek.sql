-- 更新DeepSeek提供商的API地址
UPDATE ai_providers 
SET base_url = 'https://api.gmi-serving.com'
WHERE name = 'deepseek';

-- 查看更新结果
SELECT id, name, display_name, base_url FROM ai_providers WHERE name = 'deepseek';
