import type { MatchDto } from '@match-insight/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSession } from '../../src/session';
import { ScreenState, colors, sharedStyles } from '../../src/ui';

const statusText = {
  draft: '草稿',
  scheduled: '已安排',
  cancelled: '已取消',
  finished: '已结束',
} as const;

export default function HomeScreen() {
  const { request } = useSession();
  const router = useRouter();
  const query = useQuery({
    queryKey: ['matches'],
    queryFn: () => request<{ data: MatchDto[] }>('/matches?limit=50'),
  });
  const items = query.data?.data ?? [];
  const next = items.find(
    (item) => item.status === 'scheduled' && new Date(item.kickoffAt) > new Date(),
  );
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <Text style={sharedStyles.title}>比赛</Text>
      <Pressable
        onPress={() => router.push('/matches/new')}
        style={{
          minHeight: 48,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>＋ 新增比赛</Text>
      </Pressable>
      <ScreenState loading={query.isLoading} error={query.error} empty={!items.length}>
        {next ? (
          <Link href={{ pathname: '/matches/[id]', params: { id: next.id } }} asChild>
            <Pressable style={[sharedStyles.card, { backgroundColor: '#2674FF' }]}>
              <Text style={[sharedStyles.cardTitle, { color: '#FFFFFF' }]}>
                下一场：{next.homeTeam} vs {next.awayTeam}
              </Text>
              <Text style={[sharedStyles.meta, { color: '#DDE9FF' }]}>
                {next.league} · {new Date(next.kickoffAt).toLocaleString()}
              </Text>
            </Pressable>
          </Link>
        ) : null}
        <Text style={[sharedStyles.cardTitle, { marginVertical: 12 }]}>近期比赛</Text>
        {items.map((item) => (
          <Link key={item.id} href={{ pathname: '/matches/[id]', params: { id: item.id } }} asChild>
            <Pressable style={sharedStyles.card}>
              <View style={sharedStyles.row}>
                <Text style={[sharedStyles.cardTitle, { flex: 1 }]}>
                  {item.homeTeam} vs {item.awayTeam}
                </Text>
                <Text>{statusText[item.status]}</Text>
              </View>
              <Text style={sharedStyles.meta}>
                {item.league} · {new Date(item.kickoffAt).toLocaleString()}
              </Text>
            </Pressable>
          </Link>
        ))}
      </ScreenState>
    </ScrollView>
  );
}
