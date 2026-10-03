import { Switch } from 'react-native-paper';
import type { UserSettingsDto } from '@match-insight/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useSession } from '../../src/session';
import { Button, Field, ScreenState, colors, sharedStyles } from '../../src/ui';

interface FormData {
  recipientEmail: string;
  defaultTimezone: string;
  defaultAnalysisLeadMinutes: string;
  emailNotificationsEnabled: boolean;
}

export default function SettingsScreen() {
  const { request, logout, user } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => request<UserSettingsDto>('/settings'),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      recipientEmail: '',
      defaultTimezone: 'Asia/Shanghai',
      defaultAnalysisLeadMinutes: '60',
      emailNotificationsEnabled: true,
    },
  });
  useEffect(() => {
    if (query.data)
      reset({
        ...query.data,
        defaultAnalysisLeadMinutes: String(query.data.defaultAnalysisLeadMinutes),
      });
  }, [query.data, reset]);
  const update = useMutation({
    mutationFn: (data: FormData) =>
      request<UserSettingsDto>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          ...data,
          defaultAnalysisLeadMinutes: Number(data.defaultAnalysisLeadMinutes),
        }),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <Text style={sharedStyles.title}>设置</Text>
      <Text style={sharedStyles.meta}>{user?.email}</Text>
      <ScreenState loading={query.isLoading} error={query.error}>
        <Controller
          control={control}
          name="recipientEmail"
          rules={{ required: '请输入接收邮箱' }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="接收邮箱"
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              error={errors.recipientEmail?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="defaultTimezone"
          rules={{ required: '请输入时区' }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="默认时区"
              value={value}
              onChangeText={onChange}
              error={errors.defaultTimezone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="defaultAnalysisLeadMinutes"
          rules={{
            required: '请输入提前分钟数',
            pattern: { value: /^\d+$/, message: '请输入整数' },
          }}
          render={({ field: { value, onChange } }) => (
            <Field
              label="默认提前分析分钟数"
              keyboardType="number-pad"
              value={value}
              onChangeText={onChange}
              error={errors.defaultAnalysisLeadMinutes?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="emailNotificationsEnabled"
          render={({ field: { value, onChange } }) => (
            <View style={[sharedStyles.card, sharedStyles.row]}>
              <Text style={{ flex: 1 }}>邮件通知</Text>
              <Switch value={value} onValueChange={onChange} />
            </View>
          )}
        />
        <View style={[sharedStyles.card, sharedStyles.row]}>
          <Text style={{ flex: 1, color: colors.muted }}>App 推送</Text>
          <Text style={{ color: colors.muted }}>暂未开放</Text>
        </View>
        <Button
          onPress={() => void handleSubmit((data) => update.mutateAsync(data))()}
          disabled={update.isPending}
        >
          保存设置
        </Button>
        <Button danger onPress={() => void logout()}>
          退出登录
        </Button>
      </ScreenState>
    </ScrollView>
  );
}
