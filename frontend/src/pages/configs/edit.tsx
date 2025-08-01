import React, { useState, useEffect } from "react";
import { Edit, useForm } from "@refinedev/antd";
import {
  Form,
  Input,
  Select,
  Switch,
  Card,
  Row,
  Col,
  InputNumber,
  Alert,
} from "antd";

const { TextArea } = Input;

export const ConfigEdit: React.FC = () => {
  const { formProps, saveButtonProps, queryResult } = useForm();
  const [dataType, setDataType] = useState<string>("json");

  useEffect(() => {
    if (queryResult?.data?.data?.dataType) {
      setDataType(queryResult.data.data.dataType);
    }
  }, [queryResult?.data?.data?.dataType]);

  const renderValueInput = () => {
    switch (dataType) {
      case "string":
        return (
          <Input placeholder="输入字符串值" />
        );
      case "number":
        return (
          <InputNumber
            style={{ width: "100%" }}
            placeholder="输入数字值"
          />
        );
      case "boolean":
        return (
          <Select>
            <Select.Option value={true}>true</Select.Option>
            <Select.Option value={false}>false</Select.Option>
          </Select>
        );
      case "json":
      default:
        return (
          <TextArea
            rows={6}
            placeholder="输入JSON格式的配置值"
          />
        );
    }
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="基本信息" size="small">
              <Form.Item
                label="平台"
                name="platform"
              >
                <Select disabled>
                  <Select.Option value="web">Web</Select.Option>
                  <Select.Option value="ios">iOS</Select.Option>
                  <Select.Option value="android">Android</Select.Option>
                  <Select.Option value="wechat">微信小程序</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="配置键"
                name="configKey"
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                label="分类"
                name="category"
              >
                <Select>
                  <Select.Option value="general">通用</Select.Option>
                  <Select.Option value="ui">界面</Select.Option>
                  <Select.Option value="api">API</Select.Option>
                  <Select.Option value="features">功能</Select.Option>
                  <Select.Option value="security">安全</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="数据类型"
                name="dataType"
              >
                <Select onChange={setDataType}>
                  <Select.Option value="json">JSON对象</Select.Option>
                  <Select.Option value="string">字符串</Select.Option>
                  <Select.Option value="number">数字</Select.Option>
                  <Select.Option value="boolean">布尔值</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="描述"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="配置项的详细描述"
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="配置选项" size="small">
              <Form.Item
                label="启用状态"
                name="isActive"
                valuePropName="checked"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>

              <Form.Item
                label="敏感数据"
                name="isSensitive"
                valuePropName="checked"
                help="敏感数据在列表中将被隐藏显示"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Card title="配置值" size="small">
          <Form.Item
            label="配置值"
            name="configValue"
            rules={[{ required: true, message: "请输入配置值" }]}
          >
            {renderValueInput()}
          </Form.Item>

          {dataType === "json" && (
            <Alert
              message="JSON格式提示"
              description="请确保输入的是有效的JSON格式。对象和数组都是支持的。"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Card>

        <Card title="验证规则" size="small">
          <Form.Item
            label="验证规则"
            name="validationRules"
            help="定义配置值的验证规则（JSON格式）"
          >
            <TextArea
              rows={4}
              placeholder="例如:&#10;{&#10;  &quot;required&quot;: true,&#10;  &quot;minLength&quot;: 1,&#10;  &quot;maxLength&quot;: 100&#10;}"
            />
          </Form.Item>
        </Card>
      </Form>
    </Edit>
  );
};
