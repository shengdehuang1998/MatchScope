import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../src/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SessionProvider } from '../src/session';

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider
        theme={paperTheme}
        settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}
      >
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerBackTitle: '返回', headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="matches/new" options={{ title: '比赛' }} />
            <Stack.Screen name="matches/[id]" options={{ title: '比赛详情' }} />
            <Stack.Screen name="matches/[id]/edit" options={{ title: '比赛详情' }} />
            <Stack.Screen name="prompts/[id]" options={{ title: '编辑分析模板' }} />
          </Stack>
        </SessionProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
