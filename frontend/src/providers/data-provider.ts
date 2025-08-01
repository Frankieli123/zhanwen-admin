import { DataProvider } from "@refinedev/core";
import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// 创建axios实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器 - 添加认证token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  // 获取列表数据
  getList: async ({ resource, pagination, sorters, filters, meta }) => {
    const url = `/${resource}`;
    
    const params: any = {};
    
    // 分页参数
    if (pagination) {
      params.page = pagination.current;
      params.limit = pagination.pageSize;
    }
    
    // 排序参数
    if (sorters && sorters.length > 0) {
      params.sort = sorters[0].field;
      params.order = sorters[0].order;
    }
    
    // 筛选参数
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        if (filter.operator === "eq") {
          params[filter.field] = filter.value;
        } else if (filter.operator === "contains") {
          params[`${filter.field}_like`] = filter.value;
        }
      });
    }

    const { data } = await axiosInstance.get(url, { params });
    
    return {
      data: data.data || data,
      total: data.total || data.length,
    };
  },

  // 获取单个资源
  getOne: async ({ resource, id, meta }) => {
    const url = `/${resource}/${id}`;
    const { data } = await axiosInstance.get(url);
    
    return {
      data: data.data || data,
    };
  },

  // 创建资源
  create: async ({ resource, variables, meta }) => {
    const url = `/${resource}`;
    const { data } = await axiosInstance.post(url, variables);
    
    return {
      data: data.data || data,
    };
  },

  // 更新资源
  update: async ({ resource, id, variables, meta }) => {
    const url = `/${resource}/${id}`;
    const { data } = await axiosInstance.put(url, variables);
    
    return {
      data: data.data || data,
    };
  },

  // 删除资源
  deleteOne: async ({ resource, id, meta }) => {
    const url = `/${resource}/${id}`;
    await axiosInstance.delete(url);
    
    return {
      data: { id },
    };
  },

  // 批量删除
  deleteMany: async ({ resource, ids, meta }) => {
    const url = `/${resource}/batch`;
    await axiosInstance.delete(url, { data: { ids } });
    
    return {
      data: ids.map(id => ({ id })),
    };
  },

  // 获取多个资源
  getMany: async ({ resource, ids, meta }) => {
    const url = `/${resource}/batch`;
    const { data } = await axiosInstance.get(url, {
      params: { ids: ids.join(",") },
    });
    
    return {
      data: data.data || data,
    };
  },

  // 批量更新
  updateMany: async ({ resource, ids, variables, meta }) => {
    const url = `/${resource}/batch`;
    const { data } = await axiosInstance.put(url, {
      ids,
      data: variables,
    });
    
    return {
      data: data.data || data,
    };
  },

  // 自定义方法
  custom: async ({ url, method, filters, sorters, payload, query, headers, meta }) => {
    let requestUrl = url;
    
    if (query) {
      const queryString = new URLSearchParams(query).toString();
      requestUrl = `${url}?${queryString}`;
    }

    const axiosConfig: any = {
      url: requestUrl,
      method: method || "GET",
      headers,
    };

    if (payload) {
      axiosConfig.data = payload;
    }

    const { data } = await axiosInstance(axiosConfig);
    
    return {
      data: data.data || data,
    };
  },
};
