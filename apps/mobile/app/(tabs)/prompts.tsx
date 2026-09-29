import type { PromptTemplateDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text } from 'react-native';
import { useSession } from '../../src/session';
import { Button, Field, ScreenState, sharedStyles } from '../../src/ui';

interface FormData {
  name: string;
  content: string;
}

export default function PromptsScreen() {
  const { request } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['prompts'],
    queryFn: () => request<{ data: PromptTemplateDto[] }>('/prompts'),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { name: '', content: '' } });
  const create = useMutation({
    mutationFn: (data: FormData) =>
      request<PromptTemplateDto>('/prompts', {
        method: 'POST',
        body: JSON.stringify({ ...data, isDefault: !query.data?.data.length }),
      }),
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <Text style={sharedStyles.title}>分析模板</Text>
      <Text style={[sharedStyles.cardTitle, { marginBottom: 12 }]}>新建模板</Text>
      <Controller
        control={control}
        name="name"
        rules={{ required: '请输入模板名称' }}
        render={({ field: { value, onChange } }) => (
          <Field label="名称" value={value} onChangeText={onChange} error={errors.name?.message} />
        )}
      />
      <Controller
        control={control}
        name="content"
        rules={{ required: '请输入分析要求' }}
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
      <Button
        onPress={() => void handleSubmit((data) => create.mutateAsync(data))()}
        disabled={create.isPending}
      >
        {create.isPending ? '保存中…' : '创建模板'}
      </Button>
      {create.error ? <Text style={{ color: '#C93434' }}>{create.error.message}</Text> : null}
      <Text style={[sharedStyles.cardTitle, { marginTop: 24, marginBottom: 12 }]}>已有模板</Text>
      <ScreenState loading={query.isLoading} error={query.error} empty={!query.data?.data.length}>
        {query.data?.data.map((item) => (
          <Link key={item.id} href={{ pathname: '/prompts/[id]', params: { id: item.id } }} asChild>
            <Pressable style={sharedStyles.card}>
              <Text style={sharedStyles.cardTitle}>
                {item.name}
                {item.isDefault ? ' · 默认' : ''}
              </Text>
              <Text numberOfLines={2} style={sharedStyles.meta}>
                {item.currentVersion?.content}
              </Text>
              <Text style={sharedStyles.meta}>版本 {item.currentVersion?.versionNumber ?? 0}</Text>
            </Pressable>
          </Link>
        ))}
      </ScreenState>
    </ScrollView>
  );
}
