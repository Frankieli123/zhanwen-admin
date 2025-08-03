import { AuthProvider } from "@refinedev/core";
import { authAPI } from "../utils/api";

export const authProvider: AuthProvider = {
  // 登录 - 按照Refine标准支持email和username
  login: async ({ username, email, password, remember }) => {
    try {
      // 支持email或username登录，优先使用email（Refine AuthPage默认使用email）
      const loginField = email || username;
      if (!loginField) {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "请输入用户名",
          },
        };
      }

      console.log('登录尝试:', { loginField, password: '***' });

      try {
        // 获取API基础URL
        const API_URL = import.meta.env.VITE_API_URL || (
          import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api'
        );

        // 直接使用fetch调用API
        const fetchResponse = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: loginField,
            password,
            remember
          })
        });

        const response = await fetchResponse.json();
        console.log('登录响应:', response);

        if (response.success && response.data) {
          const { token, user } = response.data;

          // 存储token和用户信息
          localStorage.setItem("auth_token", token);
          localStorage.setItem("user_info", JSON.stringify(user));

          const authResult = {
            success: true,
            redirectTo: "/",
          };

          console.log('authProvider返回值:', authResult);
          return authResult;
        }

        console.log('登录失败 - 响应格式不正确:', response);
        const failResult = {
          success: false,
          error: {
            name: "LoginError",
            message: response.message || "登录失败",
          },
        };
        console.log('authProvider失败返回值:', failResult);
        return failResult;
      } catch (error: any) {
        console.error('登录API调用异常:', error);
        return {
          success: false,
          error: {
            name: "LoginError",
            message: error.response?.data?.message || "登录失败，请检查网络连接",
          },
        };
      }
    } catch (outerError: any) {
      console.error('登录外层异常:', outerError);
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "登录失败，请检查网络连接",
        },
      };
    }
  },

  // 登出
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // 即使API调用失败，也要清除本地存储
      console.warn("登出API调用失败:", error);
    }
    
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  // 检查认证状态
  check: async () => {
    const token = localStorage.getItem("auth_token");
    
    if (!token) {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    try {
      // 验证token是否有效
      const response = await authAPI.getCurrentUser();
      
      if (response.success) {
        return {
          authenticated: true,
        };
      }
      
      // Token无效，清除本地存储
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
      
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    } catch (error) {
      console.error('认证检查失败:', error);
      // 网络错误或其他错误，清除token并要求重新登录
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");

      return {
        authenticated: false,
        redirectTo: "/login",
        error: {
          message: "认证检查失败，请重新登录",
          name: "AuthCheckError",
        },
      };
    }
  },

  // 获取用户权限
  getPermissions: async () => {
    const userInfo = localStorage.getItem("user_info");
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        return user.permissions || [];
      } catch (error) {
        console.error("解析用户信息失败:", error);
        return [];
      }
    }
    
    return [];
  },

  // 获取用户身份信息
  getIdentity: async () => {
    const userInfo = localStorage.getItem("user_info");
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        return {
          id: user.id,
          name: user.fullName || user.username,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&background=1890ff&color=fff`,
          email: user.email,
          role: user.role,
        };
      } catch (error) {
        console.error("解析用户信息失败:", error);
        return null;
      }
    }
    
    return null;
  },

  // 处理认证错误
  onError: async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
      
      return {
        logout: true,
        redirectTo: "/login",
      };
    }

    return { error };
  },
};
