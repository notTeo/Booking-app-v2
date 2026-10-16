import client from './client';
import { deletePhoto, putPhoto, type PhotoCrop, type PhotoFields } from './photo.api';

export const getMe = () =>
  client.get('/user/me').then((res) => res.data.data);

export const updateMe = (data: {
  name?: string;
  email?: string;
  password?: string;
  // Required by the API whenever email or password is sent.
  currentPassword?: string;
}) =>
  client.patch('/user/me', data).then((res) => res.data.data);

export const deleteMe = (password?: string) =>
  client.delete('/user/me', { data: password ? { password } : {} }).then((res) => res.data.data);

/** The account's own photo: a new one, or (file null) a new crop of the stored one. Resolves to the updated user. */
export const setMyPhoto = <U extends PhotoFields>(file: File | null, crop: PhotoCrop) =>
  putPhoto<{ user: U }>('/user/me/photo', file, crop).then((data) => data.user);

export const removeMyPhoto = <U extends PhotoFields>() =>
  deletePhoto<{ user: U }>('/user/me/photo').then((data) => data.user);

export interface NotificationSettings {
  emailNotifications: boolean;
  /** Whether any shop notifies them at all, by email / by push. */
  receivesEmail: boolean;
  receivesPush: boolean;
  /** null while push is off on the server. */
  pushPublicKey: string | null;
}

export const getNotifications = (): Promise<NotificationSettings> =>
  client.get('/user/me/notifications').then((res) => res.data.data);

export const updateNotifications = (emailNotifications: boolean): Promise<NotificationSettings> =>
  client.patch('/user/me/notifications', { emailNotifications }).then((res) => res.data.data);

export const savePushSubscription = (sub: PushSubscriptionJSON) =>
  client.post('/user/me/push-subscriptions', sub);

export const deletePushSubscription = (endpoint: string) =>
  client.delete('/user/me/push-subscriptions', { data: { endpoint } });
