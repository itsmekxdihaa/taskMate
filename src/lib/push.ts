import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import app, { auth, db } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export type PushStatus = 'enabled' | 'off' | 'blocked' | 'unsupported' | 'not-configured' | 'failed';

let foregroundListenerAttached = false;

export async function getPushStatus(): Promise<PushStatus> {
  if (!VAPID_KEY) return 'not-configured';
  if (!('Notification' in window) || !(await isSupported())) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission === 'granted') return 'enabled';
  return 'off';
}

async function registerDevice() {
  // The app restores its user from localStorage before Firebase finishes restoring the session
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || !VAPID_KEY) throw new Error('Not signed in');

  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error('No push token returned');

  await setDoc(doc(db, 'pushTokens', token), { userId: user.uid, token, updatedAt: new Date().toISOString() });

  if (!foregroundListenerAttached) {
    foregroundListenerAttached = true;
    // Background notifications are shown by the service worker; this covers the app being open
    onMessage(messaging, payload => {
      const { title = 'TaskMate reminder', body } = payload.notification || {};
      registration.showNotification(title, { body, icon: `${import.meta.env.BASE_URL}icon-192.png` });
    });
  }
}

export const PUSH_STATUS_EVENT = 'taskmate-push-status';

/** Asks for permission if needed. Must be called from a click or change handler. */
export async function enablePushReminders(): Promise<PushStatus> {
  const status = await requestAndRegister();
  window.dispatchEvent(new CustomEvent<PushStatus>(PUSH_STATUS_EVENT, { detail: status }));
  return status;
}

async function requestAndRegister(): Promise<PushStatus> {
  const status = await getPushStatus();
  if (status === 'not-configured' || status === 'unsupported' || status === 'blocked') return status;

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  }

  return tryRegister();
}

async function tryRegister(): Promise<PushStatus> {
  try {
    await registerDevice();
    return 'enabled';
  } catch (err) {
    console.warn('Could not register this device for push:', err);
    return 'failed';
  }
}

/** Re-registers on app load when permission was already granted (tokens can rotate). */
export async function refreshPushRegistration(): Promise<PushStatus> {
  const status = await getPushStatus();
  return status === 'enabled' ? tryRegister() : status;
}
