import { Redirect, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';
import { useSession } from '../src/session';
import { Button, Field, colors } from '../src/ui';

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { status, login } = useSession();
  const router = useRouter();
  const [submitError, setSubmitError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { email: '', password: '' } });
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  const submit = handleSubmit(async (data) => {
    setSubmitError('');
    try {
      await login(data.email.trim(), data.password);
      router.replace('/(tabs)');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '登录失败');
    }
  });
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text style={styles.brand}>MatchScope</Text>
          <Text style={styles.title}>登录</Text>
          <Text style={styles.subtitle}>登录账号，查看比赛与分析</Text>
          <Controller
            control={control}
            name="email"
            rules={{ required: '请输入邮箱' }}
            render={({ field: { value, onChange } }) => (
              <Field
                label="邮箱"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{ required: '请输入密码', minLength: { value: 8, message: '密码至少 8 位' } }}
            render={({ field: { value, onChange } }) => (
              <Field
                label="密码"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />
          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
          <Button onPress={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? '登录中…' : '登录'}
          </Button>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/register')}
            style={styles.register}
            disabled={isSubmitting}
          >
            <Text style={{ color: colors.muted }}>
              还没有账号？<Text style={{ color: colors.primary, fontWeight: '700' }}>立即注册</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  register: { minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.card, padding: 22, borderRadius: 22 },
  brand: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 28 },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 8 },
});
