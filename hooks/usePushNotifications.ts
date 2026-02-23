import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  // Works for EAS builds. Expo Go does not require this.
  return (
    // @ts-ignore
    Constants?.expoConfig?.extra?.eas?.projectId ||
    // @ts-ignore
    Constants?.easConfig?.projectId
  );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens don't work on simulators/emulators.
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android channel config (required on Android for proper behavior)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = getProjectId();
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch (e) {
    console.warn('Failed to get Expo push token:', e);
    return null;
  }
}

export function usePushNotifications(userId?: string) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!userId) return;
      const token = await registerForPushNotificationsAsync();
      if (!mounted) return;
      setExpoPushToken(token);

      if (token) {
        // Best effort upsert on profile.
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ id: userId, expo_push_token: token, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        if (error) {
          console.warn('Failed to save push token:', error.message);
        }
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // In-app banner handled by handler above. Keep for future analytics.
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // You can route users to a screen based on response.notification.request.content.data
    });

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);

  return { expoPushToken };
}
