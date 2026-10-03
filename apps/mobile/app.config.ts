import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext } from 'expo/config';

// Load shared configuration regardless of the Expo startup directory.
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default ({ config }: ConfigContext) => ({
  ...config,
  extra: { ...config.extra, apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() },
});
