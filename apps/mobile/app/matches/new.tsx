import type { MatchDto, PromptTemplateDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text } from 'react-native';
import { useEffect } from 'react';
import { useSession } from '../../src/session';
import { Button, Field, ScreenState, colors, sharedStyles } from '../../src/ui';

interface FormData {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  inputTimezone: string;
  supplementalMaterial: string;
  promptVersionId: string;
}

export default function NewMatchScreen() {
  const { request } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const prompts = useQuery({
    queryKey: ['prompts'],
    queryFn: () => request<{ data: PromptTemplateDto[] }>('/prompts'),
  });
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      league: '',
      homeTeam: '',
      awayTeam: '',
      kickoffAt: new Date(Date.now() + 86_400_000).toISOString(),
      inputTimezone: 'Asia/Shanghai',
      supplementalMaterial: '',
      promptVersionId: '',
    },
  });
  const selectedVersion = watch('promptVersionId');
  useEffect(() => {
    if (selectedVersion || !prompts.data?.data.length) return;
    const template = prompts.data.data.find((item) => item.isDefault) ?? prompts.data.data[0];
    if (template.currentVersion) setValue('promptVersionId', template.currentVersion.id);
  }, [prompts.data, selectedVersion, setValue]);
  const create = useMutation({
    mutationFn: (data: FormData) =>
      request<MatchDto>('/matches', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          supplementalMaterial: data.supplementalMaterial || undefined,
        }),
      }),
    onSuccess: async (match) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.replace({ pathname: '/matches/[id]', params: { id: match.id } });
    },
  });
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
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
            autoCapitalize="none"
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
      <Text style={[sharedStyles.cardTitle, { marginBottom: 8 }]}>分析模板</Text>
      <ScreenState
        loading={prompts.isLoading}
        error={prompts.error}
        empty={!prompts.data?.data.length}
      >
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
              <Text style={sharedStyles.cardTitle}>
                {item.name}
                {item.isDefault ? ' · 默认' : ''}
              </Text>
              <Text numberOfLines={2} style={sharedStyles.meta}>
                {item.currentVersion.content}
              </Text>
            </Pressable>
          ) : null,
        )}
      </ScreenState>
      {!selectedVersion && prompts.data?.data.length ? (
        <Text style={{ color: colors.danger }}>请选择分析模板</Text>
      ) : null}
      {create.error ? <Text style={{ color: colors.danger }}>{create.error.message}</Text> : null}
      <Button
        onPress={() => void handleSubmit((data) => create.mutateAsync(data))()}
        disabled={create.isPending || !selectedVersion}
      >
        保存比赛
      </Button>
    </ScrollView>
  );
}
