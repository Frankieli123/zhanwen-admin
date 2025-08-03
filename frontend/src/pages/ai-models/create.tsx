import React, { useEffect, useState } from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
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
  Typography,
  Button,
  message,
  Space,
} from "antd";
import { ReloadOutlined, ApiOutlined } from "@ant-design/icons";
import { aiModelsAPI } from "../../utils/api";

const { Title } = Typography;

export const AIModelCreate: React.FC = () => {
  const { formProps, saveButtonProps, form } = useForm({
    successNotification: {
      message: "创建成功",
      description: "AI模型配置已成功创建",
      type: "success",
    },
    errorNotification: {
      message: "创建失败",
      description: "创建AI模型配置时发生错误，请重试",
      type: "error",
    },
  });
  const [providers, setProviders] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [showCustomProvider, setShowCustomProvider] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

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

  const handleProviderChange = (value: number | string) => {
    if (value === 'custom') {
      setShowCustomProvider(true);
      setSelectedProvider({ name: 'custom', displayName: '自定义提供商' });
      setAvailableModels([]);
      form?.setFieldsValue({ name: undefined, customApiUrl: undefined });
    } else {
      setShowCustomProvider(false);
      const provider = providers.find(p => p.id === value);
      setSelectedProvider(provider);
      setAvailableModels([]);
      form?.setFieldsValue({ name: undefined });
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

    if (!apiKey) {
      message.error('请先输入API密钥');
      return;
    }

    if (selectedProvider.name === 'custom' && !customApiUrl) {
      message.error('自定义提供商请先输入API地址');
      return;
    }

    setTestingConnection(true);
    try {
      const response = await aiModelsAPI.testConnection({
        provider: selectedProvider.name,
        apiKey,
        apiUrl: customApiUrl,
      });

      if (response.success && response.data.connected) {
        message.success('API连接测试成功');
      } else {
        message.error('API连接测试失败');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      message.error('测试连接失败，请检查网络连接');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Create
      saveButtonProps={{
        ...saveButtonProps,
        children: "保存"
      }}
      title="创建 AI 模型"
      breadcrumb={false}
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
                  options={[
                    ...providers.map((provider) => ({
                      label: provider.displayName,
                      value: provider.id,
                    })),
                    { label: "自定义提供商", value: "custom" }
                  ]}
                />
              </Form.Item>

              {showCustomProvider && (
                <Form.Item
                  label="提供商名称"
                  name="customProviderName"
                  rules={[{ required: true, message: "请输入提供商名称" }]}
                >
                  <Input placeholder="例如: GMI Serving" />
                </Form.Item>
              )}

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
                <Input.Password placeholder="输入API密钥" />
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
                initialValue="chat"
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
                initialValue="secondary"
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
                initialValue={100}
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
                initialValue={0}
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
                initialValue={4000}
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
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="模型参数" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                label="温度参数"
                name={["parameters", "temperature"]}
                initialValue={0.7}
                tooltip="控制输出的随机性，值越高越随机"
              >
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                label="最大令牌数"
                name={["parameters", "max_tokens"]}
                initialValue={3000}
                tooltip="单次生成的最大令牌数量"
              >
                <InputNumber
                  min={1}
                  max={8000}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                label="Top P参数"
                name={["parameters", "top_p"]}
                initialValue={1.0}
                tooltip="核采样参数，控制词汇选择范围"
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                label="频率惩罚"
                name={["parameters", "frequency_penalty"]}
                initialValue={0}
                tooltip="减少重复内容的惩罚参数"
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>


      </Form>
    </Create>
  );
};
