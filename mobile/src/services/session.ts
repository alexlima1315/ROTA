import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'codex-mobile-session-token';
export const saveSessionToken = (token: string) => SecureStore.setItemAsync(SESSION_KEY, token);
export const readSessionToken = () => SecureStore.getItemAsync(SESSION_KEY);
export const clearSessionToken = () => SecureStore.deleteItemAsync(SESSION_KEY);
