import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { getOrCreateDeviceId, getStoredDeviceName } from '../services/storage';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  useEffect(() => {
    // Detect iOS standalone mode (Home Screen installed)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check existing registration and subscription
    if (isSupported) {
      navigator.serviceWorker.ready
        .then((registration) => {
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setSubscription(sub);
            setIsSubscribed(true);
          } else {
            setIsSubscribed(false);
          }
        })
        .catch((err) => {
          console.warn('Error checking push subscription:', err);
        });
    }
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Web Push is not supported in this browser. On iOS, install via Share -> Add to Home Screen.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request notification permission via user interaction
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      // 2. Fetch VAPID public key from backend
      const { public_key } = await api.getVapidPublicKey();
      const convertedVapidKey = urlBase64ToUint8Array(public_key);

      // 3. Register push subscription with browser pushManager
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 4. Register device & send subscription to backend
      const deviceId = getOrCreateDeviceId();
      const deviceName = getStoredDeviceName();
      await api.registerDevice(deviceId, deviceName, 'iOS');
      await api.subscribePush(deviceId, sub);

      setSubscription(sub);
      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to enable push notifications.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe.');
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    loading,
    error,
    isStandalone,
    subscribe,
    unsubscribe,
  };
}
