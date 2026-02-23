import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

function RootLayoutContent() {
  const { loading, user } = useAuth();
  usePushNotifications(user?.id);

  if (loading) {
    return null;
  }

  // Split the stack so we don't accidentally render protected screens to signed-out users.
  return (
    <>
      {!user ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth/index" />
          <Stack.Screen name="+not-found" />
        </Stack>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="events/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reservations/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reservations/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      )}
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
