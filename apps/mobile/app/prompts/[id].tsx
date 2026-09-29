import type { PromptTemplateDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useSession } from '../../src/session';
import { Button, Field, ScreenState, colors, sharedStyles } from '../../src/ui';

export default function PromptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { request } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['prompt', id],
    queryFn: () => request<PromptTemplateDto>(`/prompts/${id}`),
    enabled: Boolean(id),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ content: string }>({ defaultValues: { content: '' } });
  useEffect(() => {
    if (query.data?.currentVersion) reset({ content: query.data.currentVersion.content });
  }, [query.data, reset]);
  const save = useMutation({
    mutationFn: ({ content }: { content: string }) =>
      request<PromptTemplateDto>(`/prompts/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
      await query.refetch();
    },
  });
  const setDefault = useMutation({
    mutationFn: () => request<PromptTemplateDto>(`/prompts/${id}/set-default`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
      await query.refetch();
    },
  });
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <ScreenState loading={query.isLoading} error={query.error}>
        {query.data ? (
          <>
            <Text style={sharedStyles.title}>{query.data.name}</Text>
            <Controller
              control={control}
              name="content"
              rules={{ required: '分析要求不能为空' }}
              render={({ field: { value, onChange } }) => (
                <Field
                  label="AI 分析要求或上下文"
                  multiline
                  value={value}
                  onChangeText={onChange}
                  error={errors.content?.message}
                />
              )}
            />
            {save.error ? <Text style={{ color: colors.danger }}>{save.error.message}</Text> : null}
            <Button
              onPress={() => void handleSubmit((data) => save.mutateAsync(data))()}
              disabled={save.isPending}
            >
              保存为新版本
            </Button>
            {!query.data.isDefault ? (
              <Button
                secondary
                onPress={() => void setDefault.mutateAsync()}
                disabled={setDefault.isPending}
              >
                设为默认模板
              </Button>
            ) : null}
            <Text style={[sharedStyles.cardTitle, { marginTop: 24, marginBottom: 10 }]}>
              历史版本
            </Text>
            {query.data.versions?.map((version) => (
              <View key={version.id} style={sharedStyles.card}>
                <Text style={sharedStyles.cardTitle}>版本 {version.versionNumber}</Text>
                <Text style={sharedStyles.meta}>
                  {new Date(version.createdAt).toLocaleString()}
                </Text>
                <Text style={sharedStyles.meta}>{version.content}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScreenState>
    </ScrollView>
  );
}
