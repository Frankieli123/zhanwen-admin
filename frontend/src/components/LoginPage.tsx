import React from 'react';
import { Form, Input, Button, Checkbox, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useLogin } from '@refinedev/core';

const { Title } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

export const LoginPage: React.FC = () => {
  const { mutate: login, isLoading } = useLogin<LoginFormValues>();

  const onFinish = (values: LoginFormValues) => {
    // 将 username 映射到 email 字段，因为后端期望 email 参数
    login({
      email: values.username,
      password: values.password,
      remember: values.remember,
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: 8,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            占卜应用管理后台
          </Title>
          <Typography.Text type="secondary">
            请登录您的管理员账户
          </Typography.Text>
        </div>

        <Form
          name="login"
          initialValues={{
            username: 'admin',
            password: 'admin123456',
            remember: true,
          }}
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              style={{ width: '100%', height: 40 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            © 2025 占卜应用管理系统
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};
