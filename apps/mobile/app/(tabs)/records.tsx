import type { MatchDto } from '@match-insight/contracts';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';
import { useSession } from '../../src/session';
import { ScreenState, sharedStyles } from '../../src/ui';

export default function RecordsScreen() {
  const { request } = useSession();
  const query = useQuery({
    queryKey: ['matches', 'records'],
    queryFn: () => request<{ data: MatchDto[] }>('/matches?limit=50'),
  });
  const pending = query.data?.data.filter((item) => item.status === 'scheduled') ?? [];
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <Text style={sharedStyles.title}>记录</Text>
      <Text style={sharedStyles.meta}>第一阶段尚未接入 AI，不展示虚构分析结果。</Text>
      <Text style={[sharedStyles.cardTitle, { marginVertical: 16 }]}>待分析比赛</Text>
      <ScreenState loading={query.isLoading} error={query.error} empty={!pending.length}>
        {pending.map((item) => (
          <View key={item.id} style={sharedStyles.card}>
            <Text style={sharedStyles.cardTitle}>
              {item.homeTeam} vs {item.awayTeam}
            </Text>
            <Text style={sharedStyles.meta}>{new Date(item.kickoffAt).toLocaleString()}</Text>
          </View>
        ))}
      </ScreenState>
    </ScrollView>
  );
}
