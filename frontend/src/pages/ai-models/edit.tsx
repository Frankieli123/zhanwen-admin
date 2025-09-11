import React, { useEffect, useState } from "react";
import { Edit, useForm } from "@refinedev/antd";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Card,
  Row,
  Col,
  Divider,
  Button,
  message,
  Space,
  Checkbox,
  Table,
} from "antd";
import { ReloadOutlined, ApiOutlined, SaveOutlined } from "@ant-design/icons";
import { aiModelsAPI } from "../../utils/api";
import { AIConfigService } from "../../services/aiConfigService";

export const AIModelEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult, form } = useForm({
    successNotification: {
      message: "保存成功",
      description: "AI模型配置已成功更新",
      type: "success",
    },
    errorNotification: {
      message: "保存失败",
      description: "更新AI模型配置时发生错误，请重试",
      type: "error",
    },
    onMutationSuccess: () => {
      // 更新成功后清除AI配置缓存
      AIConfigService.clearCache();
    },
  });

  // 批量创建处理函数
  const handleBatchCreate = async () => {
    if (selectedModels.length === 0) {
      message.error('请至少选择一个模型');
      return;
    }

    try {
      const formValues = await form?.validateFields() as any;
      const baseConfig = {
        ...formValues,
        apiKeyEncrypted: formValues?.apiKeyEncrypted,
        customApiUrl: formValues?.customApiUrl,
      };

      let successCount = 0;
      let failCount = 0;

      for (const modelName of selectedModels) {
        try {
          const modelConfig = {
            ...baseConfig,
            name: modelName,
            displayName: modelName,
          };

          await aiModelsAPI.createModel(modelConfig);
          successCount++;
        } catch (error) {
          console.error(`创建模型 ${modelName} 失败:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        message.success(`成功创建 ${successCount} 个模型${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
        AIConfigService.clearCache();
        
        // 重置表单和选择
        form?.resetFields();
        setSelectedModels([]);
        setBatchMode(false);
        setAvailableModels([]);
      }

      if (failCount > 0 && successCount === 0) {
        message.error('批量创建失败，请检查配置');
      }

    } catch (error) {
      console.error('批量创建失败:', error);
      message.error('批量创建失败，请检查表单配置');
    }
  };

  const [providers, setProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [testingModels, setTestingModels] = useState<Set<string>>(new Set());
  const [batchTesting, setBatchTesting] = useState(false);
  const [modelTestResults, setModelTestResults] = useState<Record<string, { success: boolean; latency?: number; error?: string }>>({});

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (queryResult?.data && providers.length > 0) {
      const modelData = queryResult.data as any;
      const provider = providers.find(p => p.id === modelData.providerId);
      if (provider) {
        setSelectedProvider(provider);
      } else {
        // 如果找不到服务商，可能是自定义服务商
        setSelectedProvider({
          name: 'custom',
          displayName: modelData.provider?.displayName || '自定义服务商',
          id: modelData.providerId
        });
      }
    }
  }, [queryResult?.data, providers]);

  // 确保API密钥正确显示在表单中
  useEffect(() => {
    if (queryResult?.data && form) {
      console.log('编辑页面数据:', queryResult.data);
      // 手动设置表单值，确保API密钥能正确显示
      const formData: any = queryResult.data.data || queryResult.data;

      // 检查API密钥是否解密失败
      if (formData.apiKeyEncrypted === null && queryResult.data.data) {
        message.warning('API密钥解密失败，请重新输入API密钥', 5);
      }

      form.setFieldsValue({
        ...formData,
        // 如果API密钥解密失败（为null），则显示空字符串
        apiKeyEncrypted: formData.apiKeyEncrypted || '',
      });
    }
  }, [queryResult?.data, form]);

  const loadProviders = async () => {
    try {
      const response = await aiModelsAPI.getActiveProviders();
      if (response.success) {
        setProviders(response.data);
      }
    } catch (error) {
      console.error("加载服务商失败:", error);
    }
  };

  const handleProviderChange = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    setSelectedProvider(provider);
    setAvailableModels([]);

    // 如果是DeepSeek服务商，自动填充API地址
    if (provider?.name === 'deepseek') {
      form?.setFieldsValue({ customApiUrl: 'https://api.gmi-serving.com/v1' });
    }
  };

  // 单独测试模型
  const testSingleModel = async (modelName: string) => {
    const apiKey = form?.getFieldValue('apiKeyEncrypted');
    const customApiUrl = form?.getFieldValue('customApiUrl');

    if (!selectedProvider || !apiKey) {
      message.error('请先选择服务商并输入API密钥');
      return;
    }

    setTestingModels(prev => new Set(prev).add(modelName));

    try {
      // 直接测试特定模型是否可用，发送实际的聊天完成请求
      const testPayload = {
        model: modelName,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
        temperature: 0
      };

      const apiUrl = customApiUrl || selectedProvider.baseUrl;
      const endpoint = apiUrl.endsWith('/') ? `${apiUrl}v1/chat/completions` : `${apiUrl}/v1/chat/completions`;

      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok && result.choices) {
        setModelTestResults(prev => ({
          ...prev,
          [modelName]: { success: true, latency }
        }));
      } else if (result.error) {
        const errorMsg = result.error.message || result.error.code || '未知错误';
        setModelTestResults(prev => ({
          ...prev,
          [modelName]: { success: false, error: errorMsg }
        }));
      } else {
        setModelTestResults(prev => ({
          ...prev,
          [modelName]: { success: false, error: '响应格式异常' }
        }));
      }
    } catch (error) {
      console.error(`测试模型 ${modelName} 失败:`, error);
      setModelTestResults(prev => ({
        ...prev,
        [modelName]: { success: false, error: '连接失败' }
      }));
    } finally {
      setTestingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  // 批量测试选中的模型（并发执行）
  const batchTestModels = async () => {
    if (selectedModels.length === 0) {
      message.error('请先选择要测试的模型');
      return;
    }

    const apiKey = form?.getFieldValue('apiKeyEncrypted');
    const customApiUrl = form?.getFieldValue('customApiUrl');

    if (!selectedProvider || !apiKey) {
      message.error('请先选择服务商并输入API密钥');
      return;
    }

    setBatchTesting(true);
    
    // 创建测试任务数组
    const testTasks = selectedModels.map(async (modelName) => {
      try {
        // 直接测试特定模型是否可用，发送实际的聊天完成请求
        const testPayload = {
          model: modelName,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
          temperature: 0
        };

        const apiUrl = customApiUrl || selectedProvider.baseUrl;
        const endpoint = apiUrl.endsWith('/') ? `${apiUrl}v1/chat/completions` : `${apiUrl}/v1/chat/completions`;

        const startTime = Date.now();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify(testPayload)
        });

        const result = await response.json();
        const endTime = Date.now();
        const latency = endTime - startTime;

        if (response.ok && result.choices) {
          return { modelName, success: true, error: null, latency };
        } else if (result.error) {
          const errorMsg = result.error.message || result.error.code || '未知错误';
          return { modelName, success: false, error: errorMsg, latency };
        } else {
          return { modelName, success: false, error: '响应格式异常', latency };
        }
      } catch (error) {
        console.error(`测试模型 ${modelName} 失败:`, error);
        return { modelName, success: false, error: (error as Error).message || '未知错误', latency: 0 };
      }
    });

    try {
      // 并发执行所有测试任务
      const results = await Promise.all(testTasks);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const failedModels = results.filter(r => !r.success);
      const successModels = results.filter(r => r.success);

      if (successCount > 0) {
        const avgLatency = Math.round(successModels.reduce((sum, r) => sum + r.latency, 0) / successCount);
        message.success(`批量测试完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''} - 平均延迟: ${avgLatency}ms`);
        
        // 显示失败的模型详情
        if (failedModels.length > 0) {
          console.warn('失败的模型:', failedModels);
        }
      } else {
        message.error('批量测试失败，所有模型都无法连接');
      }
    } catch (error) {
      console.error('批量测试出错:', error);
      message.error('批量测试执行失败');
    } finally {
      setBatchTesting(false);
    }
  };

  const fetchModels = async () => {
    const apiKey = form?.getFieldValue('apiKeyEncrypted');
    const customApiUrl = form?.getFieldValue('customApiUrl');

    if (!selectedProvider) {
      message.error('请先选择AI服务商');
      return;
    }

    if (!apiKey) {
      message.error('请先输入API密钥');
      return;
    }

    if (selectedProvider.name === 'custom' && !customApiUrl) {
      message.error('自定义服务商请先输入API地址');
      return;
    }

    setFetchingModels(true);
    try {
      const response = await aiModelsAPI.fetchModels({
        provider: selectedProvider.name,
        apiKey,
        apiUrl: customApiUrl,
      });

      if (response.success) {
        setAvailableModels(response.data);
        message.success(`成功拉取到 ${response.data.length} 个模型`);
      } else {
        message.error(response.message || '拉取模型列表失败');
      }
    } catch (error) {
      console.error('拉取模型失败:', error);
      message.error('拉取模型列表失败，请检查网络连接');
    } finally {
      setFetchingModels(false);
    }
  };

  const testConnection = async () => {
    const apiKey = form?.getFieldValue('apiKeyEncrypted');
    const customApiUrl = form?.getFieldValue('customApiUrl');

    if (!selectedProvider) {
      message.error('请先选择AI服务商');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      message.error('请先输入API密钥');
      return;
    }

    if (selectedProvider.name === 'custom' && !customApiUrl) {
      message.error('自定义服务商请先输入API地址');
      return;
    }

    const startTime = Date.now();
    setTestingConnection(true);

    try {
      const response = await aiModelsAPI.testConnection({
        provider: selectedProvider.name,
        apiKey: apiKey.trim(),
        apiUrl: customApiUrl,
      });

      const duration = Date.now() - startTime;

      if (response.success && response.data.connected) {
        message.success(`API连接测试成功 (${duration}ms)`);
      } else {
        message.error(`API连接测试失败 (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('测试连接失败:', error);
      message.error(`测试连接失败 (${duration}ms)`);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Edit
      title="编辑 AI 模型"
      breadcrumb={false}
      saveButtonProps={batchMode ? {
        onClick: handleBatchCreate,
        children: `批量创建 (${selectedModels.length}个模型)`,
        disabled: selectedModels.length === 0,
      } : {
        ...saveButtonProps,
        children: "保存"
      }}
      headerButtons={() => (
        <Button
          {...(batchMode ? {
            onClick: handleBatchCreate,
            disabled: selectedModels.length === 0,
          } : saveButtonProps)}
          type="primary"
          icon={<SaveOutlined />}
        >
          {batchMode ? `批量创建 (${selectedModels.length}个模型)` : "保存"}
        </Button>
      )}
    >
      <Form {...formProps} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="基本信息" size="small">
              <Form.Item
                label="AI服务商"
                name="providerId"
                rules={[{ required: true, message: "请选择AI服务商" }]}
              >
                <Select
                  placeholder="选择AI服务商"
                  onChange={handleProviderChange}
                  options={providers.map((provider) => ({
                    label: provider.displayName,
                    value: provider.id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="API地址"
                name="customApiUrl"
                tooltip="自定义API地址，留空使用默认地址"
              >
                <Input placeholder={selectedProvider ? `默认: ${selectedProvider.baseUrl}` : "例如: https://api.openai.com/v1"} />
              </Form.Item>

              <Form.Item
                label="API密钥"
                name="apiKeyEncrypted"
                rules={[{ required: true, message: "请输入API密钥" }]}
              >
                <Input.Password
                  placeholder="输入API密钥"
                  visibilityToggle={{
                    visible: showApiKey,
                    onVisibleChange: setShowApiKey,
                  }}
                />
              </Form.Item>

              <Form.Item label="连接测试">
                <Space>
                  <Button
                    icon={<ApiOutlined />}
                    onClick={testConnection}
                    loading={testingConnection}
                    disabled={!selectedProvider}
                  >
                    测试连接
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchModels}
                    loading={fetchingModels}
                    disabled={!selectedProvider}
                  >
                    拉取模型列表
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item label="创建模式">
                <Space>
                  <Checkbox
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                  >
                    批量创建模式
                  </Checkbox>
                </Space>
              </Form.Item>

              {!batchMode && (
                <Form.Item
                  label="模型名称"
                  name="name"
                  rules={[{ required: true, message: "请选择或输入模型名称" }]}
                >
                  {availableModels.length > 0 ? (
                    <Select
                      placeholder="选择模型"
                      showSearch
                      optionFilterProp="children"
                      options={availableModels.map((model) => ({
                        label: `${model.name} ${model.description ? `(${model.description})` : ''}`,
                        value: model.name,
                      }))}
                    />
                  ) : (
                    <Input placeholder="手动输入模型名称" />
                  )}
                </Form.Item>
              )}

              {batchMode && availableModels.length > 0 && (
                <Form.Item label="选择模型">
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ApiOutlined />}
                        onClick={batchTestModels}
                        loading={batchTesting}
                        disabled={selectedModels.length === 0}
                      >
                        批量测试选中模型
                      </Button>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        已选择 {selectedModels.length} 个模型
                      </span>
                    </Space>
                  </div>
                  <Table
                    dataSource={availableModels}
                    rowKey="name"
                    size="small"
                    pagination={false}
                    scroll={{ y: 300 }}
                    rowSelection={{
                      type: 'checkbox',
                      selectedRowKeys: selectedModels,
                      onChange: (selectedRowKeys) => {
                        setSelectedModels(selectedRowKeys as string[]);
                      },
                    }}
                    columns={[
                      {
                        title: '模型名称',
                        dataIndex: 'name',
                        key: 'name',
                        width: 180,
                        render: (text: string) => <code>{text}</code>,
                      },
                      {
                        title: '描述',
                        dataIndex: 'description',
                        key: 'description',
                        ellipsis: true,
                        render: (text: string) => text || '-',
                      },
                      {
                        title: '类型',
                        dataIndex: 'type',
                        key: 'type',
                        width: 80,
                        render: (text: string) => text || 'chat',
                      },
                      {
                        title: '操作',
                        key: 'action',
                        width: 150,
                        render: (_, record) => {
                          const testResult = modelTestResults[record.name];
                          const isTesting = testingModels.has(record.name);
                          
                          if (isTesting) {
                            return (
                              <Space>
                                <span style={{ color: '#666' }}>测试中...</span>
                              </Space>
                            );
                          }
                          
                          if (testResult) {
                            if (testResult.success) {
                              return (
                                <Space>
                                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                    {testResult.latency}ms
                                  </span>
                                  <span style={{ 
                                    color: '#52c41a', 
                                    fontSize: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#52c41a'
                                  }}>
                                    ✓
                                  </span>
                                </Space>
                              );
                            } else {
                              return (
                                <Space>
                                  <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
                                    {testResult.error}
                                  </span>
                                  <span style={{ 
                                    color: '#ff4d4f', 
                                    fontSize: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ff4d4f'
                                  }}>
                                    ✗
                                  </span>
                                </Space>
                              );
                            }
                          }
                          
                          return (
                            <Button
                              type="link"
                              size="small"
                              icon={<ApiOutlined />}
                              onClick={() => testSingleModel(record.name)}
                            >
                              测试
                            </Button>
                          );
                        },
                      },
                    ]}
                  />
                </Form.Item>
              )}


              <Form.Item
                label="模型类型"
                name="modelType"
              >
                <Select>
                  <Select.Option value="chat">对话模型</Select.Option>
                  <Select.Option value="completion">补全模型</Select.Option>
                  <Select.Option value="embedding">嵌入模型</Select.Option>
                </Select>
              </Form.Item>


            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="配置参数" size="small">
              <Form.Item
                label="角色"
                name="role"
              >
                <Select>
                  <Select.Option value="primary">主模型</Select.Option>
                  <Select.Option value="secondary">备用模型</Select.Option>
                  <Select.Option value="disabled">禁用</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="优先级"
                name="priority"
              >
                <InputNumber
                  min={1}
                  max={1000}
                  style={{ width: "100%" }}
                  placeholder="数值越小优先级越高"
                />
              </Form.Item>

              <Form.Item
                label="成本/1K tokens (¥)"
                name="costPer1kTokens"
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  precision={6}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="上下文窗口"
                name="contextWindow"
              >
                <InputNumber
                  min={1}
                  max={32000}
                  style={{ width: "100%" }}
                  placeholder="tokens数量"
                />
              </Form.Item>

              <Form.Item
                label="启用状态"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="模型参数" size="small">
              <Form.Item
                label="温度参数"
                name={["parameters", "temperature"]}
                tooltip="控制输出的随机性，值越高越随机"
              >
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="最大令牌数"
                name={["parameters", "max_tokens"]}
                tooltip="单次生成的最大令牌数量"
              >
                <InputNumber
                  min={1}
                  max={8000}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="Top P参数"
                name={["parameters", "top_p"]}
                tooltip="核采样参数，控制词汇选择范围"
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item
                label="频率惩罚"
                name={["parameters", "frequency_penalty"]}
                tooltip="减少重复内容的惩罚参数"
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Card>
          </Col>


        </Row>
      </Form>
    </Edit>
  );
};
