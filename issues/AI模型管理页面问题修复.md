# AI模型管理页面问题修复

## 任务概述
修复AI模型管理页面的两个主要问题：
1. 编辑页面没显示API密钥
2. 列表页面测试连接直接显示成功，没有实际测试

## 问题分析

### 问题1：编辑页面API密钥不显示
**原因**：
- 后端已正确解密API密钥并返回
- 前端useForm钩子存在数据初始化时序问题
- 表单字段没有正确绑定解密后的API密钥数据

**影响**：用户无法在编辑页面看到当前配置的API密钥

### 问题2：列表页面测试连接直接显示成功
**原因**：
- 列表页面调用的是模拟测试接口 `/ai-models/${id}/test`
- 编辑页面调用的是真实API测试接口 `/ai-models/test-connection`
- 两个页面行为不一致，列表页面没有真正测试API连接

**影响**：用户无法准确判断AI模型的实际连接状态

## 修复方案

### 1. 修复编辑页面API密钥显示
**文件**：`frontend/src/pages/ai-models/edit.tsx`
**修改内容**：
- 添加新的useEffect钩子监听queryResult.data变化
- 手动调用form.setFieldsValue设置表单值
- 确保API密钥字段正确初始化

```typescript
// 确保API密钥正确显示在表单中
useEffect(() => {
  if (queryResult?.data && form) {
    // 手动设置表单值，确保API密钥能正确显示
    form.setFieldsValue({
      ...queryResult.data,
      // 确保API密钥字段正确设置
      apiKeyEncrypted: queryResult.data.apiKeyEncrypted || '',
    });
  }
}, [queryResult?.data, form]);
```

### 2. 统一测试连接逻辑
**文件**：`frontend/src/pages/ai-models/list.tsx`
**修改内容**：
- 修改handleTestConnection方法
- 先获取模型详细信息
- 调用真实的API测试接口 `/ai-models/test-connection`
- 与编辑页面保持一致的测试逻辑

**修改前**：调用 `aiModelsAPI.testModelConnection(id)` (模拟测试)
**修改后**：调用 `aiModelsAPI.testConnection()` (真实API测试)

### 3. 修改页面标题大小写
**涉及文件**：
- `frontend/src/pages/ai-models/list.tsx`
- `frontend/src/pages/ai-models/edit.tsx`
- `frontend/src/pages/ai-models/create.tsx`
- `frontend/src/pages/ai-models/show.tsx`

**修改内容**：将所有"Ai"改为"AI"大写

## 技术细节

### API接口对比
| 功能 | 原接口 | 新接口 | 说明 |
|------|--------|--------|------|
| 列表页测试连接 | `/ai-models/${id}/test` | `/ai-models/test-connection` | 从模拟测试改为真实API测试 |
| 编辑页测试连接 | `/ai-models/test-connection` | `/ai-models/test-connection` | 保持不变 |

### 数据流程
1. **编辑页面加载**：
   - 获取模型数据 → 解密API密钥 → 手动设置表单值 → 显示API密钥

2. **列表页面测试连接**：
   - 获取模型详情 → 检查API密钥 → 调用真实API测试 → 显示测试结果

## 验证清单

### 编辑页面API密钥显示
- [ ] 打开任意AI模型的编辑页面
- [ ] 确认API密钥字段显示解密后的密钥内容
- [ ] 确认密钥可以正常编辑和保存

### 列表页面测试连接
- [ ] 在AI模型列表页面点击测试连接按钮
- [ ] 确认显示"正在测试连接..."加载状态
- [ ] 确认根据实际API响应显示成功或失败结果
- [ ] 确认响应时间显示准确

### 页面标题显示
- [ ] 确认所有页面标题显示"AI模型"而不是"Ai模型"
- [ ] 确认表单标签显示"AI提供商"而不是"Ai提供商"

## 预期效果

1. **编辑页面**：用户可以看到当前配置的API密钥，便于验证和修改
2. **列表页面**：测试连接功能真实反映API连接状态，提供准确的连接测试结果
3. **用户体验**：统一的测试连接行为，一致的页面标题显示

## 风险评估

**低风险**：
- 修改仅涉及前端页面逻辑
- 不影响后端API和数据库结构
- 向后兼容，不破坏现有功能

**注意事项**：
- 确保API密钥在前端正确处理，避免安全问题
- 测试连接功能需要真实的API密钥才能正常工作
