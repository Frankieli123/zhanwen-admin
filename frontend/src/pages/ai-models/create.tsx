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
} from "antd";
import { aiModelsAPI } from "../../utils/api";

const { TextArea } = Input;
const { Title } = Typography;

export const AIModelCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();
  const [providers, setProviders] = useState<any[]>([]);

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

  return (
    <Create saveButtonProps={saveButtonProps}>
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
                  options={providers.map((provider) => ({
                    label: provider.displayName,
                    value: provider.id,
                  }))}
                />
              </Form.Item>

              <Form.Item
                label="模型名称"
                name="name"
                rules={[{ required: true, message: "请输入模型名称" }]}
              >
                <Input placeholder="例如: gpt-4, deepseek-chat" />
              </Form.Item>

              <Form.Item
                label="显示名称"
                name="displayName"
                rules={[{ required: true, message: "请输入显示名称" }]}
              >
                <Input placeholder="例如: GPT-4, DeepSeek Chat" />
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

              <Form.Item
                label="API密钥"
                name="apiKeyEncrypted"
              >
                <Input.Password placeholder="输入API密钥（可选）" />
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

        <Card title="元数据" size="small">
          <Form.Item
            label="描述信息"
            name={["metadata", "description"]}
          >
            <TextArea
              rows={3}
              placeholder="模型的详细描述信息（可选）"
            />
          </Form.Item>
        </Card>
      </Form>
    </Create>
  );
};
