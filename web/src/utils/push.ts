import { deletePushSubscription, savePushSubscription } from '../api/user.api';
import { installGuideFor, isInstalledApp } from './installPrompt';

/**
 * Booking push notifications, on phones only. The service worker (public/sw.js)
 * shows them; this file turns them on and off for this phone.
 */

/** A phone, not a tablet or computer (Android tablets leave out "Mobile"). */
export function isPhone(ua: string) {
  return /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
}

export type PushState =
  | 'unsupported' // this browser has no web push
  | 'install-first' // iPhone outside the installed app: Apple allows push only there
  | 'denied' // the person blocked notifications for BeBooked
  | 'ready';

export function pushState(): PushState {
  if (installGuideFor(navigator.userAgent, navigator.maxTouchPoints) === 'ios' && !isInstalledApp())
    return 'install-first';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

const registration = () => navigator.serviceWorker.register('/sw.js');

/** This phone's current subscription, if push is on here. */
export async function currentSubscription() {
  if (pushState() !== 'ready') return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

// The VAPID key arrives base64url; PushManager wants the raw bytes.
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Asks for permission, subscribes this phone, and tells the API. False if refused. */
export async function turnPushOn(publicKey: string) {
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }));
  await savePushSubscription(sub.toJSON());
  return true;
}

export async function turnPushOff() {
  const sub = await currentSubscription();
  if (!sub) return;
  await deletePushSubscription(sub.endpoint);
  await sub.unsubscribe();
}
