import { Refine, Authenticated } from "@refinedev/core";
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  ThemedTitleV2,
  AuthPage,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import zhCN from "antd/locale/zh_CN";

import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { notificationProvider } from "./providers/notificationProvider";

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
} from "@ant-design/icons";

function App() {
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
                    name: "analytics",
                    list: "/analytics",
                    meta: {
                      label: "数据分析",
                      icon: <BarChartOutlined />,
                    },
                  },
                ]}
                options={{
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
                          Sider={(props) => <ThemedSiderV2 {...props} fixed />}
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
