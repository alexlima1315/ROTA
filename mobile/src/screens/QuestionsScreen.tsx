import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/services/api';

type Item = { id: string; enunciado: string; assunto: string | null; banca: { nome: string } | null };
export function QuestionsScreen() {
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { void apiFetch('/api/questions?take=10').then(async r => { if (!r.ok) throw new Error(r.status === 429 ? 'Sua cota gratuita de hoje terminou.' : 'Conecte-se e entre na conta para carregar questões.'); const d = await r.json(); setItems(d.items); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <SafeAreaView className="flex-1 bg-slate-50"><ScrollView contentContainerClassName="px-5 pb-8 pt-5"><Text className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Prática</Text><Text className="mt-1 text-2xl font-bold">Questões</Text><Text className="mt-1 text-slate-600">Conteúdo e resolução sincronizam quando houver conexão.</Text>{loading && <ActivityIndicator className="mt-8"/>}{error ? <View className="mt-5 rounded-2xl bg-amber-50 p-4"><Text className="text-amber-900">{error}</Text></View> : items.map((item, index) => <View key={item.id} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><Text className="text-xs font-semibold text-indigo-700">{item.banca?.nome ?? 'Questão'} · {item.assunto ?? 'Geral'}</Text><Text className="mt-2 font-semibold text-slate-900">Questão {index + 1}</Text><Text numberOfLines={5} className="mt-2 leading-6 text-slate-700">{item.enunciado}</Text></View>)}{!loading && !error && !items.length && <Text className="mt-8 text-center text-slate-500">Não há questões disponíveis para seus filtros.</Text>}</ScrollView></SafeAreaView>;
}
