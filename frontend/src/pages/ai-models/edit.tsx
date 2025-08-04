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
} from "antd";
import { ReloadOutlined, ApiOutlined, SaveOutlined } from "@ant-design/icons";
import { aiModelsAPI } from "../../utils/api";

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
  });


  const [providers, setProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (queryResult?.data && providers.length > 0) {
      const provider = providers.find(p => p.id === queryResult.data.providerId);
      if (provider) {
        setSelectedProvider(provider);
      } else {
        // 如果找不到提供商，可能是自定义提供商
        setSelectedProvider({
          name: 'custom',
          displayName: queryResult.data.provider?.displayName || '自定义提供商',
          id: queryResult.data.providerId
        });
      }
    }
  }, [queryResult?.data, providers]);

  const loadProviders = async () => {
    try {
      const response = await aiModelsAPI.getActiveProviders();
      if (response.success) {
        setProviders(response.data);
      }
    } catch (error) {
      console.error("加载提供商失败:", error);
    }
  };

  const handleProviderChange = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    setSelectedProvider(provider);
    setAvailableModels([]);

    // 如果是DeepSeek提供商，自动填充API地址
    if (provider?.name === 'deepseek') {
      form?.setFieldsValue({ customApiUrl: 'https://api.gmi-serving.com/v1' });
    }
  };

  const fetchModels = async () => {
    const apiKey = form?.getFieldValue('apiKeyEncrypted');
    const customApiUrl = form?.getFieldValue('customApiUrl');

    if (!selectedProvider) {
      message.error('请先选择AI提供商');
      return;
    }

    if (!apiKey) {
      message.error('请先输入API密钥');
      return;
    }

    if (selectedProvider.name === 'custom' && !customApiUrl) {
      message.error('自定义提供商请先输入API地址');
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
      message.error('请先选择AI提供商');
      return;
    }

    if (!apiKey || apiKey.trim() === '') {
      message.error('请先输入API密钥');
      return;
    }

    if (selectedProvider.name === 'custom' && !customApiUrl) {
      message.error('自定义提供商请先输入API地址');
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
      saveButtonProps={{
        ...saveButtonProps,
        children: "保存"
      }}
      headerButtons={({ saveButtonProps: headerSaveProps }) => (
        <Button
          {...headerSaveProps}
          type="primary"
          icon={<SaveOutlined />}
        >
          保存
        </Button>
      )}
    >
      <Form {...formProps} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="基本信息" size="small">
              <Form.Item
                label="AI提供商"
                name="providerId"
                rules={[{ required: true, message: "请选择AI提供商" }]}
              >
                <Select
                  placeholder="选择AI提供商"
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
                      value: model.id,
                    }))}
                  />
                ) : (
                  <Input placeholder="例如: gpt-4, deepseek-chat" />
                )}
              </Form.Item>



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
