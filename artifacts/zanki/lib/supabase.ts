import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

/**
 * SecureStore adapter for Supabase auth session storage.
 *
 * Supabase session tokens can exceed the ~2 KB per-entry limit on iOS,
 * so large values are transparently chunked across multiple entries.
 *
 * On web (no SecureStore) we fall back to localStorage — acceptable because
 * the web bundle is a dev/preview build, not distributed publicly.
 */

const CHUNK_SIZE = 1800; // safely under the 2 048-byte iOS SecureStore limit

function chunkKey(key: string, index: number) {
  return `${key}.__chunk_${index}`;
}

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return localStorage.getItem(key);

    // Check for chunked value
    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    }

    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.setItem(key, value); return; }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      // Remove any stale chunked data from a previous larger value
      await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
      }
      await SecureStore.setItemAsync(`${key}.__count`, String(chunks.length));
      // Remove the old single-entry key if it existed
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.removeItem(key); return; }

    const countRaw = await SecureStore.getItemAsync(`${key}.__count`);
    if (countRaw !== null) {
      const count = parseInt(countRaw, 10);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
      }
      await SecureStore.deleteItemAsync(`${key}.__count`).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
