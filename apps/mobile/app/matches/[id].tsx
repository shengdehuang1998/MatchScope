import type { MatchDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSession } from '../../src/session';
import { Button, ScreenState, sharedStyles } from '../../src/ui';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['match', id],
    queryFn: () => request<MatchDto>(`/matches/${id}`),
    enabled: Boolean(id),
  });
  const cancel = useMutation({
    mutationFn: () => request<MatchDto>(`/matches/${id}/cancel`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await query.refetch();
    },
  });
  const remove = useMutation({
    mutationFn: () => request<void>(`/matches/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.replace('/(tabs)');
    },
  });
  const match = query.data;
  const confirmCancel = () =>
    Alert.alert('取消比赛', '取消后比赛将不能继续编辑，确认取消吗？', [
      { text: '返回', style: 'cancel' },
      {
        text: '确认取消',
        style: 'destructive',
        onPress: () => void cancel.mutateAsync(),
      },
    ]);
  const confirmDelete = () =>
    Alert.alert('删除草稿', '该操作会永久删除这条草稿，确认删除吗？', [
      { text: '返回', style: 'cancel' },
      {
        text: '确认删除',
        style: 'destructive',
        onPress: () => void remove.mutateAsync(),
      },
    ]);
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
            {match.status === 'draft' || match.status === 'scheduled' ? (
              <>
                <Link href={{ pathname: '/matches/[id]/edit', params: { id } }} asChild>
                  <Pressable
                    style={{
                      padding: 14,
                      backgroundColor: '#E9F1FF',
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#2674FF', fontWeight: '700' }}>编辑比赛</Text>
                  </Pressable>
                </Link>
                <Button danger onPress={confirmCancel} disabled={cancel.isPending}>
                  取消比赛
                </Button>
              </>
            ) : null}
            {match.status === 'draft' ? (
              <Button danger onPress={confirmDelete} disabled={remove.isPending}>
                删除草稿
              </Button>
            ) : null}
          </>
        ) : null}
      </ScreenState>
    </ScrollView>
  );
}
