import axios from "axios";
import { env } from "@/common/config/env";
import { getAuthToken } from "@/common/auth/authStore";

export const request = axios.create({
  baseURL: env.apiUrl,
});

request.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
