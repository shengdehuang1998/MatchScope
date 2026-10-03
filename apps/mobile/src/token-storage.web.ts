// Browser sessions keep tokens in memory; reloading requires signing in again.
const values = new Map<string, string>();

export const tokenStorage = {
  async getItemAsync(key: string): Promise<string | null> {
    return values.get(key) ?? null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    values.set(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    values.delete(key);
  },
};
