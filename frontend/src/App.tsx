import React from "react";
import { Refine, Authenticated } from "@refinedev/core";
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedTitleV2,
  AuthPage,
} from "@refinedev/antd";
import { CustomSider } from "./components/CustomSider";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { App as AntdApp, ConfigProvider, Form, Input, Button, Checkbox } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import zhCN from "antd/locale/zh_CN";


import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { tokenRefreshManager } from "./utils/tokenRefresh";

// 页面组件
import { Dashboard } from "./pages/dashboard";

// AI模型管理页面
import { AIModelList, AIModelCreate, AIModelEdit, AIModelShow } from "./pages/ai-models";

// 提示词管理页面
import { PromptList, PromptCreate, PromptEdit, PromptShow } from "./pages/prompts";

// 配置管理页面
import { ConfigList, ConfigCreate, ConfigEdit, ConfigShow } from "./pages/configs";

// 卦象数据管理页面
import { HexagramList } from "./pages/hexagrams/list";
import { HexagramShow } from "./pages/hexagrams/show";

// API Key 管理页面
import { ApiKeyList, ApiKeyCreate, ApiKeyEdit, ApiKeyShow } from "./pages/apiKeys";

// 数据分析页面
import { Analytics } from "./pages/analytics";

// 图标
import {
  DashboardOutlined,
  RobotOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  KeyOutlined,
} from "@ant-design/icons";

function App() {
  // 启动 token 自动刷新管理器
  React.useEffect(() => {
    tokenRefreshManager.start();

    // 组件卸载时停止
    return () => {
      tokenRefreshManager.stop();
    };
  }, []);

  return (
    <BrowserRouter>
      <ConfigProvider locale={zhCN}>
        <AntdApp>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                notificationProvider={notificationProvider}
                routerProvider={routerBindings}

                resources={[
                  {
                    name: "dashboard",
                    list: "/",
                    meta: {
                      label: "仪表板",
                      icon: <DashboardOutlined />,
                    },
                  },
                  {
                    name: "ai-models",
                    list: "/ai-models",
                    create: "/ai-models/create",
                    edit: "/ai-models/edit/:id",
                    show: "/ai-models/show/:id",
                    meta: {
                      label: "AI模型管理",
                      icon: <RobotOutlined />,
                    },
                  },
                  {
                    name: "prompts",
                    list: "/prompts",
                    create: "/prompts/create",
                    edit: "/prompts/edit/:id",
                    show: "/prompts/show/:id",
                    meta: {
                      label: "提示词管理",
                      icon: <FileTextOutlined />,
                    },
                  },
                  {
                    name: "configs",
                    list: "/configs",
                    create: "/configs/create",
                    edit: "/configs/edit/:id",
                    show: "/configs/show/:id",
                    meta: {
                      label: "应用配置",
                      icon: <SettingOutlined />,
                    },
                  },
                  {
                    name: "hexagrams",
                    list: "/hexagrams",
                    create: "/hexagrams/create",
                    edit: "/hexagrams/edit/:id",
                    show: "/hexagrams/show/:id",
                    meta: {
                      label: "卦象数据",
                      icon: <DatabaseOutlined />,
                    },
                  },
                  {
                    name: "api-keys",
                    list: "/api-keys",
                    create: "/api-keys/create",
                    edit: "/api-keys/edit/:id",
                    show: "/api-keys/show/:id",
                    meta: {
                      label: "API Key 管理",
                      icon: <KeyOutlined />,
                    },
                  },
                  {
                    name: "analytics",
                    list: "/analytics",
                    meta: {
                      label: "数据分析",
                      icon: <BarChartOutlined />,
                    },
                  },
                ]}
                options={{
                  disableTelemetry: true,
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  useNewQueryKeys: true,
                  projectId: "divination-admin",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayoutV2
                          Title={({ collapsed }) => (
                            <ThemedTitleV2
                              collapsed={collapsed}
                              text="占卜管理后台"
                            />
                          )}
                          Header={() => null}
                          Sider={(props) => <CustomSider {...props} fixed />}
                        >
                          <Outlet />
                        </ThemedLayoutV2>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    
                    {/* AI模型管理路由 */}
                    <Route path="/ai-models">
                      <Route index element={<AIModelList />} />
                      <Route path="create" element={<AIModelCreate />} />
                      <Route path="edit/:id" element={<AIModelEdit />} />
                      <Route path="show/:id" element={<AIModelShow />} />
                    </Route>

                    {/* 提示词管理路由 */}
                    <Route path="/prompts">
                      <Route index element={<PromptList />} />
                      <Route path="create" element={<PromptCreate />} />
                      <Route path="edit/:id" element={<PromptEdit />} />
                      <Route path="show/:id" element={<PromptShow />} />
                    </Route>

                    {/* 配置管理路由 */}
                    <Route path="/configs">
                      <Route index element={<ConfigList />} />
                      <Route path="create" element={<ConfigCreate />} />
                      <Route path="edit/:id" element={<ConfigEdit />} />
                      <Route path="show/:id" element={<ConfigShow />} />
                    </Route>

                    {/* 卦象数据管理路由 */}
                    <Route path="/hexagrams">
                      <Route index element={<HexagramList />} />
                      <Route path="show/:id" element={<HexagramShow />} />
                    </Route>

                    {/* API Key 管理路由 */}
                    <Route path="/api-keys">
                      <Route index element={<ApiKeyList />} />
                      <Route path="create" element={<ApiKeyCreate />} />
                      <Route path="edit/:id" element={<ApiKeyEdit />} />
                      <Route path="show/:id" element={<ApiKeyShow />} />
                    </Route>

                    {/* 数据分析路由 */}
                    <Route path="/analytics">
                      <Route index element={<Analytics />} />
                    </Route>

                    <Route path="*" element={<ErrorComponent />} />
                  </Route>

                  <Route
                    element={
                      <Authenticated
                        key="authenticated-outer"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route
                      path="/login"
                      element={
                        <AuthPage
                          type="login"
                          title="占卜应用管理后台"
                          formProps={{
                            initialValues: {
                              email: "admin",
                              password: "admin123456",
                            },
                          }}
                          renderContent={(content, title) => {
                            // 自定义渲染，替换邮箱字段为用户名字段
                            return (
                              <div style={{ maxWidth: 400, margin: '0 auto', padding: 24 }}>
                                {title}
                                <Form
                                  layout="vertical"
                                  size="large"
                                  initialValues={{
                                    username: "admin",
                                    password: "admin123456",
                                    remember: true,
                                  }}
                                  onFinish={async (values) => {
                                    try {
                                      const result = await authProvider.login({
                                        username: values.username,
                                        password: values.password,
                                        remember: values.remember,
                                      });

                                      console.log('登录结果处理:', result);

                                      if (result.success && result.redirectTo) {
                                        window.location.href = result.redirectTo;
                                      } else if (result.error) {
                                        console.error('登录失败:', result.error.message);
                                        // 这里可以显示错误消息
                                      }
                                    } catch (error) {
                                      console.error('登录处理异常:', error);
                                    }
                                  }}
                                >
                                  <Form.Item
                                    name="username"
                                    label="用户名"
                                    rules={[{ required: true, message: "请输入用户名" }]}
                                  >
                                    <Input placeholder="请输入用户名" />
                                  </Form.Item>

                                  <Form.Item
                                    name="password"
                                    label="密码"
                                    rules={[{ required: true, message: "请输入密码" }]}
                                  >
                                    <Input.Password placeholder="请输入密码" />
                                  </Form.Item>

                                  <Form.Item name="remember" valuePropName="checked">
                                    <Checkbox>记住我</Checkbox>
                                  </Form.Item>

                                  <Form.Item>
                                    <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                                      登录
                                    </Button>
                                  </Form.Item>
                                </Form>
                              </div>
                            );
                          }}
                        />
                      }
                    />
                  </Route>
                </Routes>

                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
          </AntdApp>
        </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
