import { StyleSheet, View } from 'react-native';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Button as PaperButton,
  HelperText,
  MD3LightTheme,
  Text,
  TextInput,
} from 'react-native-paper';

export const colors = {
  background: '#F3F5F7',
  card: '#FFFFFF',
  text: '#14171C',
  muted: '#747B86',
  primary: '#2674FF',
  danger: '#C93434',
  border: '#DDE1E6',
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E9F1FF',
    onPrimaryContainer: colors.primary,
    background: colors.background,
    surface: colors.card,
    onSurface: colors.text,
    onSurfaceVariant: colors.muted,
    outline: colors.border,
    error: colors.danger,
  },
};

export function Field({
  label,
  error,
  style,
  ...props
}: Omit<ComponentProps<typeof TextInput>, 'label' | 'error'> & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <TextInput
        {...props}
        label={label}
        accessibilityLabel={props.accessibilityLabel ?? label}
        mode="outlined"
        error={Boolean(error)}
        style={[styles.input, style]}
        contentStyle={props.multiline ? styles.multiline : undefined}
      />
      <HelperText type="error" visible={Boolean(error)}>
        {error || ' '}
      </HelperText>
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
    <PaperButton
      mode={secondary ? 'contained-tonal' : 'contained'}
      onPress={onPress}
      disabled={disabled}
      buttonColor={danger ? colors.danger : undefined}
      textColor={danger ? '#FFFFFF' : undefined}
      style={styles.button}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonLabel}
    >
      {children}
    </PaperButton>
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
  input: { backgroundColor: colors.card },
  multiline: { minHeight: 130, textAlignVertical: 'top' },
  button: { borderRadius: 12, marginVertical: 5 },
  buttonContent: { minHeight: 48 },
  buttonLabel: { fontWeight: '700', fontSize: 15 },
  center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.muted },
  errorMessage: { color: colors.danger, textAlign: 'center' },
});
