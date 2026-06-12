import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../stores/authStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate().finally(() => {
      setReady(true);
      void SplashScreen.hideAsync();
    });
  }, []);

  if (!ready) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="feed" options={{ headerShown: true, headerStyle: { backgroundColor: '#17182B' }, headerShadowVisible: false }} />
      <Stack.Screen name="posts/[postId]/comments" options={{ title: 'Commenti', headerStyle: { backgroundColor: '#17182B' }, headerTintColor: '#C9B99A', headerShadowVisible: false }} />
      <Stack.Screen name="admin" options={{ title: 'Pannello Admin', headerStyle: { backgroundColor: '#17182B' }, headerTintColor: '#C9B99A', headerShadowVisible: false }} />
      <Stack.Screen name="profile" options={{ title: 'Il mio profilo', headerStyle: { backgroundColor: '#17182B' }, headerTintColor: '#C9B99A', headerShadowVisible: false }} />
    </Stack>
  );
}
