import { DataProvider } from "@refinedev/core";
import { aiModelsAPI, promptsAPI, configsAPI, hexagramsAPI, analyticsAPI } from "../utils/api";

// 资源映射
const resourceMap: Record<string, any> = {
  "ai-models": aiModelsAPI,
  "prompts": promptsAPI,
  "configs": configsAPI,
  "hexagrams": hexagramsAPI,
  "analytics": analyticsAPI,
};

export const dataProvider: DataProvider = {
  // 获取列表
  getList: async ({ resource, pagination, sorters, filters, meta }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      // 构建查询参数
      const params: any = {};
      
      // 分页参数
      if (pagination) {
        params.page = pagination.current;
        params.limit = pagination.pageSize;
      }
      
      // 排序参数
      if (sorters && sorters.length > 0) {
        const sorter = sorters[0];
        params.sort = sorter.order === "asc" ? "asc" : "desc";
      }
      
      // 筛选参数
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          if (filter.operator === "contains" && filter.value) {
            params.search = filter.value;
          } else if (filter.operator === "eq" && filter.value) {
            params[filter.field] = filter.value;
          }
        });
      }

      let response;
      if (resource === "ai-models") {
        response = await api.getModels(params);
      } else if (resource === "prompts") {
        response = await api.getTemplates(params);
      } else if (resource === "configs") {
        response = await api.getConfigs(params);
      } else if (resource === "hexagrams") {
        response = await api.getHexagrams(params);
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: response.data,
        total: response.pagination.total,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `获取${resource}列表失败`);
    }
  },

  // 获取单个资源
  getOne: async ({ resource, id }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      let response;
      if (resource === "ai-models") {
        response = await api.getModel(Number(id));
      } else if (resource === "prompts") {
        response = await api.getTemplate(Number(id));
      } else if (resource === "configs") {
        response = await api.getConfig(Number(id));
      } else if (resource === "hexagrams") {
        response = await api.getHexagramById(Number(id));
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: response.data,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `获取${resource}详情失败`);
    }
  },

  // 创建资源
  create: async ({ resource, variables }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      let response;
      if (resource === "ai-models") {
        response = await api.createModel(variables);
      } else if (resource === "prompts") {
        response = await api.createTemplate(variables);
      } else if (resource === "configs") {
        response = await api.createConfig(variables);
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: response.data,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `创建${resource}失败`);
    }
  },

  // 更新资源
  update: async ({ resource, id, variables }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      let response;
      if (resource === "ai-models") {
        response = await api.updateModel(Number(id), variables);
      } else if (resource === "prompts") {
        response = await api.updateTemplate(Number(id), variables);
      } else if (resource === "configs") {
        response = await api.updateConfig(Number(id), variables);
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: response.data,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `更新${resource}失败`);
    }
  },

  // 删除资源
  deleteOne: async ({ resource, id }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      if (resource === "ai-models") {
        await api.deleteModel(Number(id));
      } else if (resource === "prompts") {
        await api.deleteTemplate(Number(id));
      } else if (resource === "configs") {
        await api.deleteConfig(Number(id));
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: { id },
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `删除${resource}失败`);
    }
  },

  // 批量删除
  deleteMany: async ({ resource, ids }) => {
    const api = resourceMap[resource];
    if (!api) {
      throw new Error(`未找到资源 ${resource} 的API`);
    }

    try {
      const numericIds = ids.map(id => Number(id));
      
      if (resource === "ai-models") {
        await api.batchDeleteModels(numericIds);
      } else if (resource === "prompts") {
        await api.batchDeleteTemplates(numericIds);
      } else if (resource === "configs") {
        await api.batchDeleteConfigs(numericIds);
      } else {
        throw new Error(`不支持的资源类型: ${resource}`);
      }

      return {
        data: ids.map(id => ({ id })),
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || `批量删除${resource}失败`);
    }
  },

  // 获取API URL（用于某些特殊操作）
  getApiUrl: () => {
    return import.meta.env.VITE_API_URL || (
      import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001'
    );
  },

  // 自定义方法
  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          ...headers,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "请求失败");
      }

      return {
        data,
      };
    } catch (error: any) {
      throw new Error(error.message || "自定义请求失败");
    }
  },
};
