import { AccessControlProvider } from "@refinedev/core";

export const accessControlProvider: AccessControlProvider = {
  // 检查是否有权限执行某个操作
  can: async ({ resource, action, params }) => {
    // 获取用户权限
    const userInfo = localStorage.getItem("user_info");
    
    if (!userInfo) {
      return {
        can: false,
        reason: "用户未登录",
      };
    }

    try {
      const user = JSON.parse(userInfo);
      const permissions = user.permissions || [];
      const userRole = user.role || "user";

      // 超级管理员拥有所有权限
      if (userRole === "super_admin") {
        return {
          can: true,
        };
      }

      // 定义资源权限映射
      const resourcePermissions: Record<string, string[]> = {
        "ai-models": [
          "ai_models:read",
          "ai_models:create", 
          "ai_models:update",
          "ai_models:delete"
        ],
        "prompts": [
          "prompts:read",
          "prompts:create",
          "prompts:update", 
          "prompts:delete"
        ],
        "configs": [
          "configs:read",
          "configs:create",
          "configs:update",
          "configs:delete"
        ],
        "hexagrams": [
          "hexagrams:read",
          "hexagrams:create",
          "hexagrams:update",
          "hexagrams:delete"
        ],
        "analytics": [
          "analytics:read"
        ],
        "users": [
          "users:read",
          "users:create",
          "users:update",
          "users:delete"
        ]
      };

      // 操作权限映射
      const actionPermissionMap: Record<string, string> = {
        "list": "read",
        "show": "read", 
        "create": "create",
        "edit": "update",
        "delete": "delete",
        "clone": "create"
      };

      const requiredAction = actionPermissionMap[action] || action;
      const requiredPermission = `${resource}:${requiredAction}`;

      // 检查用户是否有对应权限
      const hasPermission = permissions.includes(requiredPermission);

      if (!hasPermission) {
        return {
          can: false,
          reason: `没有权限执行 ${resource} 的 ${action} 操作`,
        };
      }

      // 特殊权限检查
      if (resource === "users" && params?.id) {
        // 用户只能编辑自己的信息（除非是管理员）
        if (action === "edit" || action === "delete") {
          if (userRole !== "admin" && params.id !== user.id.toString()) {
            return {
              can: false,
              reason: "只能编辑自己的用户信息",
            };
          }
        }
      }

      return {
        can: true,
      };

    } catch (error) {
      console.error("权限检查失败:", error);
      return {
        can: false,
        reason: "权限检查失败",
      };
    }
  },

  // 获取用户权限选项（用于UI显示）
  options: async ({ resource, action }) => {
    const userInfo = localStorage.getItem("user_info");
    
    if (!userInfo) {
      return {
        buttons: {
          create: { disabled: true },
          edit: { disabled: true },
          delete: { disabled: true },
          show: { disabled: true },
        },
      };
    }

    try {
      const user = JSON.parse(userInfo);
      const userRole = user.role || "user";

      // 超级管理员拥有所有权限
      if (userRole === "super_admin") {
        return {
          buttons: {
            create: { disabled: false },
            edit: { disabled: false },
            delete: { disabled: false },
            show: { disabled: false },
          },
        };
      }

      const permissions = user.permissions || [];

      // 检查各种操作权限
      const canCreate = permissions.includes(`${resource}:create`);
      const canUpdate = permissions.includes(`${resource}:update`);
      const canDelete = permissions.includes(`${resource}:delete`);
      const canRead = permissions.includes(`${resource}:read`);

      return {
        buttons: {
          create: { disabled: !canCreate },
          edit: { disabled: !canUpdate },
          delete: { disabled: !canDelete },
          show: { disabled: !canRead },
        },
      };

    } catch (error) {
      console.error("获取权限选项失败:", error);
      return {
        buttons: {
          create: { disabled: true },
          edit: { disabled: true },
          delete: { disabled: true },
          show: { disabled: true },
        },
      };
    }
  },
};

// 权限常量定义
export const PERMISSIONS = {
  // AI模型权限
  AI_MODELS_READ: "ai_models:read",
  AI_MODELS_CREATE: "ai_models:create", 
  AI_MODELS_UPDATE: "ai_models:update",
  AI_MODELS_DELETE: "ai_models:delete",

  // 提示词权限
  PROMPTS_READ: "prompts:read",
  PROMPTS_CREATE: "prompts:create",
  PROMPTS_UPDATE: "prompts:update",
  PROMPTS_DELETE: "prompts:delete",

  // 配置权限
  CONFIGS_READ: "configs:read",
  CONFIGS_CREATE: "configs:create",
  CONFIGS_UPDATE: "configs:update", 
  CONFIGS_DELETE: "configs:delete",

  // 卦象权限
  HEXAGRAMS_READ: "hexagrams:read",
  HEXAGRAMS_CREATE: "hexagrams:create",
  HEXAGRAMS_UPDATE: "hexagrams:update",
  HEXAGRAMS_DELETE: "hexagrams:delete",

  // 分析权限
  ANALYTICS_READ: "analytics:read",

  // 用户权限
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
} as const;

// 角色权限预设
export const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.AI_MODELS_READ,
    PERMISSIONS.AI_MODELS_CREATE,
    PERMISSIONS.AI_MODELS_UPDATE,
    PERMISSIONS.AI_MODELS_DELETE,
    PERMISSIONS.PROMPTS_READ,
    PERMISSIONS.PROMPTS_CREATE,
    PERMISSIONS.PROMPTS_UPDATE,
    PERMISSIONS.PROMPTS_DELETE,
    PERMISSIONS.CONFIGS_READ,
    PERMISSIONS.CONFIGS_CREATE,
    PERMISSIONS.CONFIGS_UPDATE,
    PERMISSIONS.CONFIGS_DELETE,
    PERMISSIONS.HEXAGRAMS_READ,
    PERMISSIONS.HEXAGRAMS_CREATE,
    PERMISSIONS.HEXAGRAMS_UPDATE,
    PERMISSIONS.HEXAGRAMS_DELETE,
    PERMISSIONS.ANALYTICS_READ,
  ],
  editor: [
    PERMISSIONS.AI_MODELS_READ,
    PERMISSIONS.AI_MODELS_UPDATE,
    PERMISSIONS.PROMPTS_READ,
    PERMISSIONS.PROMPTS_CREATE,
    PERMISSIONS.PROMPTS_UPDATE,
    PERMISSIONS.CONFIGS_READ,
    PERMISSIONS.CONFIGS_UPDATE,
    PERMISSIONS.HEXAGRAMS_READ,
    PERMISSIONS.HEXAGRAMS_UPDATE,
    PERMISSIONS.ANALYTICS_READ,
  ],
  viewer: [
    PERMISSIONS.AI_MODELS_READ,
    PERMISSIONS.PROMPTS_READ,
    PERMISSIONS.CONFIGS_READ,
    PERMISSIONS.HEXAGRAMS_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],
} as const;
