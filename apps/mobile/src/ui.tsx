import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import type { ReactNode } from 'react';

export const colors = {
  background: '#F3F5F7',
  card: '#FFFFFF',
  text: '#14171C',
  muted: '#747B86',
  primary: '#2674FF',
  danger: '#C93434',
  border: '#DDE1E6',
} as const;

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.multiline && styles.multiline]}
        placeholderTextColor="#9AA0A9"
      />
      <Text style={styles.error}>{error || ' '}</Text>
    </View>
  );
}

export function Button({
  children,
  onPress,
  disabled,
  danger,
  secondary,
}: {
  children: ReactNode;
  onPress(): void;
  disabled?: boolean;
  danger?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{children}</Text>
    </Pressable>
  );
}

export function ScreenState({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  children: ReactNode;
}) {
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>加载中…</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : '请求失败'}
        </Text>
      </View>
    );
  if (empty)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>暂无数据</Text>
      </View>
    );
  return <>{children}</>;
}

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 18 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});

const styles = StyleSheet.create({
  field: { marginBottom: 2 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    minHeight: 48,
    color: colors.text,
  },
  multiline: { minHeight: 130, paddingTop: 12, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 11, minHeight: 18, marginTop: 3 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    marginVertical: 5,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryButton: { backgroundColor: '#E9F1FF' },
  secondaryText: { color: colors.primary },
  dangerButton: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted },
  errorMessage: { color: colors.danger, textAlign: 'center' },
});
