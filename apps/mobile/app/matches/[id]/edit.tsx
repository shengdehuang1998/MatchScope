import { Redirect, useLocalSearchParams } from 'expo-router';
export default function EditMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/matches/[id]', params: { id } }} />;
}
