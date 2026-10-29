import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/services/api';
import type { LawDetail } from '@/types/study';

type Props = { law: LawDetail; onBack: () => void };
type NoteResponse = { note: { conteudo: string } | null };
const noteKey = (id: string) => `codex-note-${id}-v1`;
const pendingKey = (id: string) => `codex-note-pending-${id}-v1`;

export default function MobileStudyRoom({ law, onBack }: Props) {
  const articles = useMemo(() => law.chapters.flatMap(chapter => chapter.articles), [law]);
  const [articleId, setArticleId] = useState(articles[0]?.id ?? '');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false); const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState(''); const [loading, setLoading] = useState(true); const [offline, setOffline] = useState(false);
  const article = articles.find(item => item.id === articleId) ?? articles[0];
  const chapter = law.chapters.find(item => item.articles.some(a => a.id === article?.id));
  const articleVideos = law.videos.filter(v => v.articleId === article?.id);
  const articlePosition = Math.max(0, articles.findIndex(a => a.id === article?.id));

  useEffect(() => { const unsubscribe = NetInfo.addEventListener(state => setOffline(!state.isConnected)); return unsubscribe; }, []);
  useEffect(() => {
    let active = true;
    async function loadNote() {
      if (!article) { setLoading(false); return; }
      setLoading(true); setNoteState('');
      const local = await AsyncStorage.getItem(noteKey(article.id));
      if (active) setNote(local ?? '');
      try {
        const response = await apiFetch(`/api/articles/${article.id}/notes`);
        if (!response.ok) throw new Error('offline');
        const data = await response.json() as NoteResponse;
        const content = data.note?.conteudo ?? '';
        await AsyncStorage.setItem(noteKey(article.id), content);
        if (active && !await AsyncStorage.getItem(pendingKey(article.id))) setNote(content);
      } catch { if (active && local) setNoteState('Anotação disponível neste aparelho.'); }
      finally { if (active) setLoading(false); }
    }
    void loadNote(); return () => { active = false; };
  }, [article?.id]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (!state.isConnected) return;
      const pending = await AsyncStorage.getItem(pendingKey(article?.id ?? ''));
      if (!pending || !article) return;
      try {
        const response = await apiFetch(`/api/articles/${article.id}/notes`, { method: 'PUT', body: JSON.stringify({ conteudo: pending }) });
        if (response.ok) { await AsyncStorage.removeItem(pendingKey(article.id)); setNoteState('Anotação sincronizada.'); }
      } catch { /* Keep local note queued for the next connection. */ }
    });
    return unsubscribe;
  }, [article?.id]);

  async function saveNote() {
    if (!article) return;
    setNoteState('Salvando…'); await AsyncStorage.setItem(noteKey(article.id), note);
    try {
      const response = await apiFetch(`/api/articles/${article.id}/notes`, { method: 'PUT', body: JSON.stringify({ conteudo: note }) });
      if (!response.ok) throw new Error('sync failed');
      await AsyncStorage.removeItem(pendingKey(article.id)); setNoteState('Anotação salva e sincronizada.');
    } catch {
      await AsyncStorage.setItem(pendingKey(article.id), note); setNoteState('Salva no aparelho; será sincronizada quando voltar a conexão.');
    }
    setNoteOpen(false);
  }

  const move = (delta: number) => { const next = articles[articlePosition + delta]; if (next) setArticleId(next.id); };
  if (!article) return <View className="flex-1 items-center justify-center bg-slate-50 p-6"><Text className="text-center text-slate-600">Esta lei ainda não tem artigos disponíveis.</Text><Pressable onPress={onBack} className="mt-4 rounded-xl bg-indigo-600 px-5 py-3"><Text className="font-semibold text-white">Voltar ao acervo</Text></Pressable></View>;

  return <View className="flex-1 bg-slate-50">
    <View className="flex-row items-center justify-between border-b border-slate-200 bg-white px-4 pb-3 pt-3"><Pressable onPress={onBack} accessibilityRole="button"><Text className="font-semibold text-indigo-700">‹ Acervo</Text></Pressable><Text numberOfLines={1} className="mx-3 flex-1 text-right text-sm font-semibold text-slate-700">{law.titulo}</Text></View>
    {offline && <View className="bg-amber-100 px-4 py-2"><Text className="text-xs font-medium text-amber-900">Modo offline · lendo uma cópia salva neste aparelho</Text></View>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-14 border-b border-slate-200 bg-white" contentContainerClassName="items-center gap-2 px-3 py-2">{law.chapters.map(c => <Pressable key={c.id} onPress={() => setArticleId(c.articles[0]?.id ?? '')} className={`rounded-full px-3 py-2 ${c.id === chapter?.id ? 'bg-indigo-600' : 'bg-slate-100'}`}><Text className={`text-xs ${c.id === chapter?.id ? 'font-semibold text-white' : 'text-slate-700'}`} numberOfLines={1}>{c.title}</Text></Pressable>)}</ScrollView>
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-28 pt-5"><Text className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{chapter?.title ?? 'Lei seca'}</Text><View className="mt-4 flex-row flex-wrap items-center gap-2"><Text className="text-2xl font-bold text-slate-900">Art. {article.number}</Text>{article.status === 'REVOGADO' && <Text className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">REVOGADO</Text>}</View>{article.title ? <Text className="mt-2 text-base font-semibold text-slate-700">{article.title}</Text> : null}<Text selectable className="mt-5 text-[17px] leading-8 text-slate-800">{article.text}</Text>
      {articleVideos.length > 0 && <View className="mt-7 rounded-2xl border border-indigo-100 bg-white p-4"><Text className="mb-2 font-semibold text-slate-900">Aulas deste artigo</Text>{articleVideos.map(v => <Pressable key={v.id} onPress={() => setVideoId(v.youtubeId)} className="mb-2 flex-row items-center rounded-xl bg-indigo-50 p-3"><Text className="mr-3 text-lg text-indigo-700">▶</Text><Text className="flex-1 text-sm font-medium text-slate-800">{v.title}</Text></Pressable>)}</View>}
      <View className="mt-5 flex-row justify-between"><Pressable onPress={() => move(-1)} disabled={!articlePosition} className="rounded-xl border border-slate-300 bg-white px-4 py-3 opacity-100"><Text className={!articlePosition ? 'text-slate-300' : 'text-slate-700'}>‹ Anterior</Text></Pressable><Text className="self-center text-xs text-slate-500">{articlePosition + 1} de {articles.length}</Text><Pressable onPress={() => move(1)} disabled={articlePosition >= articles.length - 1} className="rounded-xl border border-slate-300 bg-white px-4 py-3"><Text className={articlePosition >= articles.length - 1 ? 'text-slate-300' : 'text-slate-700'}>Próximo ›</Text></Pressable></View>
    </ScrollView>
    <Pressable onPress={() => setNoteOpen(true)} accessibilityRole="button" accessibilityLabel="Abrir minhas anotações" className="absolute bottom-5 right-5 h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg"><Text className="text-2xl text-white">✎</Text></Pressable>
    <Modal visible={Boolean(videoId)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVideoId(null)}><View className="flex-1 bg-slate-950"><View className="flex-row items-center justify-between p-4"><Text className="font-semibold text-white">Aula em vídeo</Text><Pressable onPress={() => setVideoId(null)} className="rounded-full bg-white/15 px-4 py-2"><Text className="text-white">Fechar</Text></Pressable></View>{videoId && <WebView source={{ uri: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1` }} allowsFullscreenVideo javaScriptEnabled domStorageEnabled style={{ flex: 1, backgroundColor: '#020617' }} />}</View></Modal>
    <Modal visible={noteOpen} transparent animationType="slide" onRequestClose={() => setNoteOpen(false)}><View className="flex-1 justify-end bg-black/40"><Pressable className="flex-1" onPress={() => setNoteOpen(false)} accessibilityLabel="Fechar painel de anotações"/><View className="rounded-t-3xl bg-white px-5 pb-8 pt-5"><View className="mb-4 flex-row items-center justify-between"><View><Text className="text-lg font-bold">Minha anotação</Text><Text className="text-xs text-slate-500">Vinculada ao Art. {article.number}</Text></View><Pressable onPress={() => setNoteOpen(false)}><Text className="px-2 py-1 text-lg text-slate-500">×</Text></Pressable></View>{loading && <ActivityIndicator className="mb-2"/>}<TextInput multiline textAlignVertical="top" value={note} onChangeText={setNote} maxLength={20000} placeholder="Escreva seu resumo, dúvidas ou exemplos…" className="min-h-44 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-6 text-slate-800"/><Text className="mt-2 text-xs text-slate-500">{note.length}/20.000 · {noteState}</Text><Pressable onPress={() => void saveNote()} className="mt-4 items-center rounded-xl bg-indigo-600 py-4"><Text className="font-bold text-white">Salvar anotação</Text></Pressable></View></View></Modal>
  </View>;
}
