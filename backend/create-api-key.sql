-- 创建测试API密钥
INSERT INTO api_keys (name, key, permissions, is_active, description, created_at, updated_at)
VALUES (
  '测试API密钥',
  'zw_live_6d917c603d06d2a85b3ce4ff9b9c79f9',
  ARRAY['usage:write', 'usage:read'],
  true,
  '用于测试的API密钥',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  is_active = true,
  permissions = ARRAY['usage:write', 'usage:read'],
  expires_at = NULL,
  updated_at = NOW();
