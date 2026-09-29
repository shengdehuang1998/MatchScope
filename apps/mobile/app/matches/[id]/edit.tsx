import type { MatchDto, PromptTemplateDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text } from 'react-native';
import { useEffect } from 'react';
import { useSession } from '../../../src/session';
import { Button, Field, ScreenState, colors, sharedStyles } from '../../../src/ui';

interface FormData {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  inputTimezone: string;
  supplementalMaterial: string;
  promptVersionId: string;
}

export default function EditMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['match', id],
    queryFn: () => request<MatchDto>(`/matches/${id}`),
    enabled: Boolean(id),
  });
  const prompts = useQuery({
    queryKey: ['prompts'],
    queryFn: () => request<{ data: PromptTemplateDto[] }>('/prompts'),
  });
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      league: '',
      homeTeam: '',
      awayTeam: '',
      kickoffAt: '',
      inputTimezone: 'Asia/Shanghai',
      supplementalMaterial: '',
      promptVersionId: '',
    },
  });
  useEffect(() => {
    if (query.data)
      reset({ ...query.data, supplementalMaterial: query.data.supplementalMaterial ?? '' });
  }, [query.data, reset]);
  const selectedVersion = watch('promptVersionId');
  const update = useMutation({
    mutationFn: (data: FormData) =>
      request<MatchDto>(`/matches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...data, supplementalMaterial: data.supplementalMaterial || null }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      await queryClient.invalidateQueries({ queryKey: ['match', id] });
      router.back();
    },
  });
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <ScreenState
        loading={query.isLoading || prompts.isLoading}
        error={query.error || prompts.error}
      >
        <Controller
          control={control}
          name="league"
          rules={{ required: '请输入联赛' }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="联赛"
              value={value}
              onChangeText={onChange}
              error={errors.league?.message}
            />
          )}
        />
        <Text style={[sharedStyles.cardTitle, { marginBottom: 8 }]}>分析模板</Text>
        {prompts.data?.data.map((item) =>
          item.currentVersion ? (
            <Pressable
              key={item.id}
              onPress={() => setValue('promptVersionId', item.currentVersion!.id)}
              style={[
                sharedStyles.card,
                selectedVersion === item.currentVersion.id && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <Text style={sharedStyles.cardTitle}>{item.name}</Text>
              <Text numberOfLines={2} style={sharedStyles.meta}>
                {item.currentVersion.content}
              </Text>
            </Pressable>
          ) : null,
        )}
        <Controller
          control={control}
          name="homeTeam"
          rules={{ required: '请输入主队' }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="主队"
              value={value}
              onChangeText={onChange}
              error={errors.homeTeam?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="awayTeam"
          rules={{
            required: '请输入客队',
            validate: (value, values) =>
              value.trim().toLocaleLowerCase() !== values.homeTeam.trim().toLocaleLowerCase() ||
              '主队和客队不能相同',
          }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="客队"
              value={value}
              onChangeText={onChange}
              error={errors.awayTeam?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="kickoffAt"
          rules={{
            required: '请输入开赛时间',
            validate: (value) => {
              const timestamp = new Date(value).getTime();
              return (
                (!Number.isNaN(timestamp) && timestamp > Date.now()) || '开赛时间必须晚于当前时间'
              );
            },
          }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="开赛时间（ISO 8601）"
              value={value}
              onChangeText={onChange}
              error={errors.kickoffAt?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="inputTimezone"
          rules={{ required: '请输入时区' }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="时区"
              value={value}
              onChangeText={onChange}
              error={errors.inputTimezone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="supplementalMaterial"
          render={({ field: { value, onChange } }) => (
            <Field label="补充资料" multiline value={value} onChangeText={onChange} />
          )}
        />
        {update.error ? <Text style={{ color: colors.danger }}>{update.error.message}</Text> : null}
        <Button
          onPress={() => void handleSubmit((data) => update.mutateAsync(data))()}
          disabled={update.isPending}
        >
          保存修改
        </Button>
      </ScreenState>
    </ScrollView>
  );
}
