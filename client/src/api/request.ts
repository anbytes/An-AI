import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 创建 Axios 实例
 */
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 分钟超时
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 请求拦截器
 */
request.interceptors.request.use(
  (config: any) => {
    // 可以在这里添加 token 等
    return config;
  },
  (error: any) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: any) => {
    console.error('响应错误:', error);
    const message = error.response?.data?.error || '网络请求失败';
    return Promise.reject(new Error(message));
  }
);

export default request;
