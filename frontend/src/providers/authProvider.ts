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
      const response = await authAPI.login({
        username: loginField,
        password,
        remember
      });
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        // 存储token和用户信息
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user_info", JSON.stringify(user));
        
        return {
          success: true,
          redirectTo: "/",
        };
      }
      
      return {
        success: false,
        error: {
          name: "LoginError",
          message: response.message || "登录失败",
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error.response?.data?.message || "登录失败，请检查网络连接",
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
      // 网络错误或其他错误，暂时认为已认证
      // 避免因为网络问题导致用户被强制登出
      return {
        authenticated: true,
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
