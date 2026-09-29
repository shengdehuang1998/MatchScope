import { Redirect, Tabs } from 'expo-router';
import { useSession } from '../../src/session';
import { colors } from '../../src/ui';

export default function TabsLayout() {
  const { status } = useSession();
  if (status === 'anonymous') return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{ headerShadowVisible: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="prompts" options={{ title: '分析模板' }} />
      <Tabs.Screen name="records" options={{ title: '记录' }} />
      <Tabs.Screen name="settings" options={{ title: '设置' }} />
    </Tabs>
  );
}
