import { getCookie } from '../utils/cookies';
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

interface RefreshResponse {
  data: { accessToken: string };
}

const refreshOnce = () =>
  refreshClient.post('/auth/refresh').then((res) => res.data as RefreshResponse);

let refreshPromise: Promise<RefreshResponse> | null = null;

// One refresh in flight at a time, shared by the page-load refresh and the 401
// interceptor. If the server says another request just rotated the cookie
// (REFRESH_RACE, e.g. a second tab), the winner's cookie is already set, so one
// retry succeeds.
export const refreshTokens = (): Promise<RefreshResponse> => {
  if (!refreshPromise) {
    refreshPromise = refreshOnce()
      .catch((err) => {
        if (err?.response?.data?.code !== 'REFRESH_RACE') throw err;
        return refreshOnce();
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

client.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // The language the app is shown in, so emails the request triggers match it.
  config.headers['Accept-Language'] = getCookie('lang') === 'en' ? 'en' : 'el';
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
        const data = await refreshTokens();
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
