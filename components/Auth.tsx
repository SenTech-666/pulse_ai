'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      alert('Введите email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error(error);
        alert('Ошибка: ' + error.message);
      } else {
        alert('✅ Магическая ссылка отправлена на почту!\nПроверь почту (включая Спам)');
      }
    } catch (err) {
      alert('Что-то пошло не так. Проверь консоль.');
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center mb-6 text-4xl">
            🧠
          </div>
          <h1 className="text-5xl font-bold tracking-tighter mb-3">Pulse</h1>
          <p className="text-xl text-zinc-400">AI Второй Мозг</p>
        </div>

        <div className="glass rounded-3xl p-8">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl mb-4 focus:outline-none focus:border-violet-500 text-lg"
          />

          <button
            onClick={handleLogin}
            disabled={loading || !email.trim()}
            className="w-full py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:bg-white/90 disabled:opacity-50 transition"
          >
            {loading ? 'Отправляем...' : 'Получить магическую ссылку'}
          </button>
        </div>
      </div>
    </div>
  );
}