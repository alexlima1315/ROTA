import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '@/screens/HomeScreen';
import { CodexScreen } from '@/screens/CodexScreen';
import { QuestionsScreen } from '@/screens/QuestionsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import type { RootTabParamList } from './types';

const Tabs = createBottomTabNavigator<RootTabParamList>();
const icons = { Inicio: 'home-outline', Codex: 'book-outline', Questoes: 'help-circle-outline', Perfil: 'person-outline' } as const;
export function RootTabs() {
  return <NavigationContainer><Tabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#4f46e5', tabBarInactiveTintColor: '#64748b', tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarStyle: { height: 64, paddingTop: 7, paddingBottom: 8, borderTopColor: '#e2e8f0', backgroundColor: '#ffffff' }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color}/> })}>
    <Tabs.Screen name="Inicio" component={HomeScreen} options={{ tabBarLabel: 'Início' }}/>
    <Tabs.Screen name="Codex" component={CodexScreen} options={{ tabBarLabel: 'Códex' }}/>
    <Tabs.Screen name="Questoes" component={QuestionsScreen} options={{ tabBarLabel: 'Questões' }}/>
    <Tabs.Screen name="Perfil" component={ProfileScreen} options={{ tabBarLabel: 'Meu Perfil' }}/>
  </Tabs.Navigator></NavigationContainer>;
}
