import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LawDetail, LawSummary } from '@/types/study';

const INDEX_KEY = 'codex-offline-laws-index-v1';
const lawKey = (id: string) => `codex-offline-law-${id}-v1`;
export async function saveLawOffline(law: LawDetail, summary: LawSummary) {
  await AsyncStorage.setItem(lawKey(law.id), JSON.stringify(law));
  const current = await getCachedLawIndex();
  const next = [summary, ...current.filter(item => item.id !== summary.id)].slice(0, 30);
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
}
export async function getCachedLaw(id: string): Promise<LawDetail | null> {
  const value = await AsyncStorage.getItem(lawKey(id));
  if (!value) return null;
  try { return JSON.parse(value) as LawDetail; } catch { await AsyncStorage.removeItem(lawKey(id)); return null; }
}
export async function getCachedLawIndex(): Promise<LawSummary[]> {
  const value = await AsyncStorage.getItem(INDEX_KEY);
  if (!value) return [];
  try { return JSON.parse(value) as LawSummary[]; } catch { await AsyncStorage.removeItem(INDEX_KEY); return []; }
}
