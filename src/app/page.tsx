'use client';
import { useAuth } from '@/hooks/useAuth';
import Auth from '@/components/Auth';
import NotesEditor from '@/components/NotesEditor';
import { Brain, LogOut } from 'lucide-react';

export default function Home() {
  const { user, loading, supabase } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="glass border-b border-white/10 px-6 py-5 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-violet-400" />
            <span className="text-3xl font-bold tracking-tighter">Pulse</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <NotesEditor />
      </div>
    </main>
  );
}