import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/services/api';
import { clearSessionToken } from '@/services/session';

export function ProfileScreen() {
  const [profile, setProfile] = useState<{ student: string; plano: string; resumo: { horasLiquidas7Dias: number; percentual7Dias: number } } | null>(null); const [message, setMessage] = useState('');
  useEffect(() => { void apiFetch('/api/dashboard').then(async r => { if (!r.ok) throw new Error('Entre na conta para ver seu perfil.'); setProfile(await r.json()); }).catch(e => setMessage(e.message)); }, []);
  return <SafeAreaView className="flex-1 bg-slate-50"><ScrollView contentContainerClassName="px-5 pb-8 pt-5"><Text className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Conta</Text><Text className="mt-1 text-2xl font-bold">Meu Perfil</Text>{profile ? <><View className="mt-5 rounded-2xl border bg-white p-5"><Text className="text-lg font-bold">{profile.student}</Text><Text className="mt-2 text-slate-600">Plano {profile.plano}</Text><Text className="mt-1 text-slate-600">Acertos na semana: {profile.resumo.percentual7Dias}%</Text><Text className="mt-1 text-slate-600">Estudo líquido: {profile.resumo.horasLiquidas7Dias} h</Text></View><Pressable onPress={() => setMessage('A gestão da assinatura pode ser aberta pelo portal de cobrança da conta.')} className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><Text className="font-semibold text-slate-800">Gerenciar assinatura</Text></Pressable><Pressable onPress={() => void clearSessionToken().then(() => setMessage('Token removido deste aparelho.'))} className="mt-4 rounded-xl bg-red-50 p-4"><Text className="font-semibold text-red-700">Sair deste aparelho</Text></Pressable></> : <View className="mt-5">{!message && <ActivityIndicator/>}<Text className="text-slate-600">{message}</Text></View>}</ScrollView></SafeAreaView>;
}
