import axios from 'axios';
import { env } from '../config/env';
import { authStore } from '../store/authStore';

const client = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

export const refreshClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Only attempt refresh if we had an access token (i.e. the user was logged in
    // and the token expired). Don't intercept 401s from login/auth endpoints.
    if (error.response?.status === 401 && !original._retry && authStore.getToken()) {
      original._retry = true;
      try {
        const { data } = await refreshClient.post('/auth/refresh');
        authStore.setToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch {
        authStore.clearToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


export default client;
