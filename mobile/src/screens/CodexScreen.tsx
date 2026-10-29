import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';
import { apiFetch } from '@/services/api';
import { getCachedLaw, getCachedLawIndex, saveLawOffline } from '@/services/law-cache';
import type { LawDetail, LawSummary } from '@/types/study';
import MobileStudyRoom from '@/components/MobileStudyRoom';

export function CodexScreen() {
  const [laws, setLaws] = useState<LawSummary[]>([]); const [law, setLaw] = useState<LawDetail | null>(null); const [loading, setLoading] = useState(true); const [message, setMessage] = useState('');
  const loadIndex = useCallback(async () => {
    const cached = await getCachedLawIndex(); setLaws(cached);
    try { const r = await apiFetch('/api/study/catalog'); if (!r.ok) throw new Error(); const d = await r.json() as { leis: LawSummary[] }; setLaws(d.leis); }
    catch { setMessage(cached.length ? 'Sem conexão · mostrando leis salvas neste aparelho.' : 'Entre na sua conta e conecte-se para carregar o acervo.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadIndex(); }, [loadIndex]);
  async function open(item: LawSummary) {
    setLoading(true); setMessage('');
    try {
      const r = await apiFetch(`/api/study/catalog?leiId=${encodeURIComponent(item.id)}`); if (!r.ok) throw new Error();
      const detail = await r.json() as LawDetail; await saveLawOffline(detail, item); setLaw(detail);
    } catch {
      const cached = await getCachedLaw(item.id);
      if (cached) { setLaw(cached); setMessage('Cópia offline · vídeos e questões exigem internet.'); }
      else setMessage('Não foi possível abrir esta lei. Conecte-se à internet para salvá-la no aparelho.');
    } finally { setLoading(false); }
  }
  if (law) return <SafeAreaView className="flex-1 bg-slate-50"><MobileStudyRoom law={law} onBack={() => { setLaw(null); setMessage(''); }}/></SafeAreaView>;
  return <SafeAreaView className="flex-1 bg-slate-50"><View className="px-5 pb-3 pt-4"><Text className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Biblioteca de leis</Text><Text className="mt-1 text-2xl font-bold">Códex</Text><Text className="mt-1 text-slate-600">Abra uma lei online para salvá-la e ler offline.</Text></View>{message ? <Text className="mx-5 mb-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</Text> : null}{loading && !laws.length ? <ActivityIndicator className="mt-8"/> : <FlatList data={laws} keyExtractor={item => item.id} contentContainerClassName="gap-3 px-5 pb-6 pt-2" ListEmptyComponent={<Text className="mt-8 text-center text-slate-500">Nenhuma lei disponível ainda.</Text>} renderItem={({ item }) => <Pressable onPress={() => void open(item)} className="rounded-2xl border border-slate-200 bg-white p-4"><Text className="font-bold text-slate-900">{item.sigla || item.titulo}</Text><Text className="mt-1 text-sm text-slate-600">{item.numero ? `Lei ${item.numero} · ` : ''}{item.titulo}{item.ano ? ` · ${item.ano}` : ''}</Text></Pressable>}/>}</SafeAreaView>;
}
