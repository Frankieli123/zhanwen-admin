import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import {
  Form,
  Input,
  Select,
  Card,
  Row,
  Col,
  Divider,
} from "antd";

const { TextArea } = Input;

export const PromptEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="基本信息" size="small">
              <Form.Item
                label="模板名称"
                name="name"
                rules={[{ required: true, message: "请输入模板名称" }]}
              >
                <Input placeholder="例如: 六壬金口诀系统提示词" />
              </Form.Item>

              <Form.Item
                label="模板类型"
                name="type"
                rules={[{ required: true, message: "请选择模板类型" }]}
              >
                <Select>
                  <Select.Option value="system">系统提示词</Select.Option>
                  <Select.Option value="user">用户提示词</Select.Option>
                  <Select.Option value="format">格式模板</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="分类"
                name="category"
              >
                <Select>
                  <Select.Option value="general">通用</Select.Option>
                  <Select.Option value="divination">占卜</Select.Option>
                  <Select.Option value="analysis">分析</Select.Option>
                  <Select.Option value="format">格式化</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="状态"
                name="status"
              >
                <Select>
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="active">活跃</Select.Option>
                  <Select.Option value="deprecated">废弃</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="描述"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="模板的详细描述"
                />
              </Form.Item>

              <Form.Item
                label="标签"
                name="tags"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签，按回车确认"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="变量配置" size="small">
              <Form.Item
                label="模板变量"
                name="variables"
                help="定义模板中可以使用的变量，例如: {username}, {question}"
              >
                <Select
                  mode="tags"
                  placeholder="添加变量名，按回车确认"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="提示词内容" size="small">
          <Form.Item
            label="系统提示词"
            name="systemPrompt"
            help="定义AI的角色和行为规范"
          >
            <TextArea
              rows={8}
              placeholder="你是一名经验丰富的易学专家，精通六壬金口诀占卜术..."
            />
          </Form.Item>

          <Form.Item
            label="用户提示词模板"
            name="userPromptTemplate"
            help="用户输入的模板格式，可以使用变量"
          >
            <TextArea
              rows={6}
              placeholder="用户问题: {question}&#10;占卜时间: {time}&#10;请根据六壬金口诀进行解读..."
            />
          </Form.Item>

          <Form.Item
            label="格式说明"
            name="formatInstructions"
            help="输出格式的具体要求"
          >
            <TextArea
              rows={4}
              placeholder="请按照以下格式输出:&#10;一、卦象分析&#10;二、吉凶判断&#10;三、建议措施..."
            />
          </Form.Item>
        </Card>
      </Form>
    </Edit>
  );
};
