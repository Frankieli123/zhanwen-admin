import { AuthProvider } from "@refinedev/core";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const authProvider: AuthProvider = {
  // 登录
  login: async ({ username, password, remember }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      if (data.success) {
        const { token, user } = data.data;
        
        // 存储token和用户信息
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user_info", JSON.stringify(user));
        
        return {
          success: true,
          redirectTo: "/",
        };
      } else {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: data.message || "登录失败",
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error.response?.data?.message || "网络错误，请稍后重试",
        },
      };
    }
  },

  // 登出
  logout: async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        await axios.post(
          `${API_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      // 即使登出API失败，也要清除本地存储
      console.warn("登出API调用失败:", error);
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
    }

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
      // 验证token有效性
      const { data } = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        return {
          authenticated: true,
        };
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }
    } catch (error) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }
  },

  // 获取用户信息
  getIdentity: async () => {
    const userInfo = localStorage.getItem("user_info");
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        return {
          id: user.id,
          name: user.full_name || user.username,
          avatar: user.avatar,
          email: user.email,
        };
      } catch (error) {
        console.error("解析用户信息失败:", error);
      }
    }

    return null;
  },

  // 获取权限
  getPermissions: async () => {
    const userInfo = localStorage.getItem("user_info");
    
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        return user.permissions || [];
      } catch (error) {
        console.error("解析用户权限失败:", error);
      }
    }

    return [];
  },

  // 处理认证错误
  onError: async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_info");
      
      return {
        logout: true,
        redirectTo: "/login",
        error: {
          message: "会话已过期，请重新登录",
          name: "Unauthorized",
        },
      };
    }

    return {
      error: {
        message: error.response?.data?.message || "发生未知错误",
        name: error.name || "Error",
      },
    };
  },

  // 注册 (可选)
  register: async ({ username, email, password, fullName }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
        full_name: fullName,
      });

      if (data.success) {
        return {
          success: true,
          redirectTo: "/login",
        };
      } else {
        return {
          success: false,
          error: {
            name: "RegisterError",
            message: data.message || "注册失败",
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: error.response?.data?.message || "网络错误，请稍后重试",
        },
      };
    }
  },

  // 忘记密码 (可选)
  forgotPassword: async ({ email }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });

      if (data.success) {
        return {
          success: true,
          message: "密码重置邮件已发送",
        };
      } else {
        return {
          success: false,
          error: {
            name: "ForgotPasswordError",
            message: data.message || "发送失败",
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "ForgotPasswordError",
          message: error.response?.data?.message || "网络错误，请稍后重试",
        },
      };
    }
  },

  // 更新密码 (可选)
  updatePassword: async ({ password, confirmPassword }) => {
    try {
      const token = localStorage.getItem("auth_token");
      const { data } = await axios.put(
        `${API_URL}/auth/update-password`,
        {
          password,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        return {
          success: true,
          message: "密码更新成功",
        };
      } else {
        return {
          success: false,
          error: {
            name: "UpdatePasswordError",
            message: data.message || "更新失败",
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "UpdatePasswordError",
          message: error.response?.data?.message || "网络错误，请稍后重试",
        },
      };
    }
  },
};
