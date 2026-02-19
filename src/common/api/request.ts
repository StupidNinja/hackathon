import axios from "axios";
import { apiConfig } from "@/common/api/config/api.config";
import { getAuthToken } from "@/common/auth/authStore";

export const request = axios.create({
  baseURL: apiConfig.apiUrl,
});

request.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
