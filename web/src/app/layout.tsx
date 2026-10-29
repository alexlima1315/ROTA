import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Rota — seu estudo, com direção', description: 'Estude para concursos com leis, questões e trilhas acessíveis.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
