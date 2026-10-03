import type { MatchDto } from '@match-insight/contracts';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSession } from '../../src/session';
import { ScreenState, sharedStyles } from '../../src/ui';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const query = useQuery({
    queryKey: ['match', id],
    queryFn: () => request<MatchDto>(`/matches/${id}`),
    enabled: Boolean(id),
  });
  const match = query.data;
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <ScreenState loading={query.isLoading} error={query.error}>
        {match ? (
          <>
            <View style={sharedStyles.card}>
              <Text style={sharedStyles.title}>
                {match.homeTeam} vs {match.awayTeam}
              </Text>
              <Text style={sharedStyles.meta}>联赛：{match.league}</Text>
              <Text style={sharedStyles.meta}>
                开赛：{new Date(match.kickoffAt).toLocaleString()}
              </Text>
              <Text style={sharedStyles.meta}>状态：{match.status}</Text>
              <Text style={sharedStyles.meta}>排期版本：{match.scheduleVersion}</Text>
              <Text style={sharedStyles.meta}>时区：{match.inputTimezone}</Text>
              {match.supplementalMaterial ? (
                <Text style={sharedStyles.meta}>补充资料：{match.supplementalMaterial}</Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScreenState>
    </ScrollView>
  );
}
