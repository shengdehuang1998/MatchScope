import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '../src/session';
import { colors } from '../src/ui';

export default function Index() {
  const { status } = useSession();
  if (status === 'loading')
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/login'} />;
}
