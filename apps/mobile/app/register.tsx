import { Redirect, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Modal,
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

export default function RegisterScreen() {
  const { status, request } = useSession();
  const router = useRouter();
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const dismissResult = () => {
    const succeeded = result?.success;
    setResult(null);
    if (succeeded) router.replace('/login');
  };
  const showFailure = (message: string) => {
    setSubmitError(`注册失败：${message}`);
    setResult({ success: false, message });
  };
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ defaultValues: { email: '', password: '' } });
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  const submit = handleSubmit(
    async (data) => {
      setSubmitError('');
      try {
        await request('/auth/register', {
          method: 'POST',
          retryAuth: false,
          body: JSON.stringify({ email: data.email.trim(), password: data.password }),
        });
        setResult({ success: true, message: '账号已创建，请使用新账号登录，查看比赛与分析。' });
      } catch (error) {
        showFailure(error instanceof Error ? error.message : '请稍后重试');
      }
    },
    (validationErrors) => {
      showFailure(
        validationErrors.email?.message ?? validationErrors.password?.message ?? '请检查填写内容',
      );
    },
  );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text style={styles.brand}>MatchScope</Text>
          <Text style={styles.title}>注册</Text>
          <Text style={styles.subtitle}>创建账号，查看比赛与分析</Text>
          <Controller
            control={control}
            name="email"
            rules={{
              required: '请输入邮箱',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱' },
            }}
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
          <Button onPress={() => void submit()} disabled={isSubmitting || result !== null}>
            {isSubmitting ? '注册中…' : '注册'}
          </Button>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/login')}
            style={styles.register}
            disabled={isSubmitting}
          >
            <Text style={{ color: colors.muted }}>
              已有账号？<Text style={{ color: colors.primary, fontWeight: '700' }}>去登录</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={result !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissResult}
      >
        <View style={styles.overlay}>
          <View style={styles.resultPanel} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.resultTitle}>
              {result?.success ? '注册成功' : '注册失败'}
            </Text>
            <Text style={styles.resultMessage}>{result?.message}</Text>
            <Button onPress={dismissResult}>{result?.success ? '去登录' : '确定'}</Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  resultPanel: { backgroundColor: colors.card, borderRadius: 20, padding: 24 },
  resultTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  resultMessage: { fontSize: 16, color: colors.muted, lineHeight: 24, marginBottom: 24 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 22 },
  register: { minHeight: 44, marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: colors.card, padding: 22, borderRadius: 22 },
  brand: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 28 },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 8 },
});
