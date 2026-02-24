import client from './client';

export const getMe = () =>
  client.get('/user/me').then((res) => res.data.data);

export const updateMe = (data: { email?: string; password?: string }) =>
  client.patch('/user/me', data).then((res) => res.data.data);

export const deleteMe = (password?: string) =>
  client.delete('/user/me', { data: password ? { password } : {} }).then((res) => res.data.data);