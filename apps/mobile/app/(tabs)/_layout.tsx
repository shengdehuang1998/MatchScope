import { Icon } from 'react-native-paper';
import { Redirect, Tabs } from 'expo-router';
import { useSession } from '../../src/session';
import { colors } from '../../src/ui';

export default function TabsLayout() {
  const { status } = useSession();
  if (status === 'anonymous') return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{ headerShadowVisible: false, tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused, size }) => (
            <Icon
              source="home-outline"
              color={focused ? colors.primary : colors.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="prompts"
        options={{
          title: '分析模板',
          tabBarIcon: ({ focused, size }) => (
            <Icon
              source="file-document-outline"
              color={focused ? colors.primary : colors.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '记录',
          tabBarIcon: ({ focused, size }) => (
            <Icon source="history" color={focused ? colors.primary : colors.muted} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ focused, size }) => (
            <Icon
              source="cog-outline"
              color={focused ? colors.primary : colors.muted}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
