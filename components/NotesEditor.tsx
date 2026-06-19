'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Save, Sparkles, Edit3, FileText, MessageSquare } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export default function NotesEditor() {
  const { user, supabase } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Partial<Note>>({ title: '', content: '', tags: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);

  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Загрузка заметок
  useEffect(() => {
    if (!user) return;
    const fetchNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });
      setNotes(data || []);
    };
    fetchNotes();
  }, [user, supabase]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveNote = async () => {
  if (!user || !currentNote.title?.trim()) return;
  setIsSaving(true);

  const fullText = `${currentNote.title} ${currentNote.content || ''}`;

  const noteData = {
    user_id: user.id,
    title: currentNote.title.trim(),
    content: currentNote.content?.trim() || '',
    tags: currentNote.tags || [],
  };

  try {
    let noteId: string;

    if (currentNote.id) {
      await supabase.from('notes').update(noteData).eq('id', currentNote.id);
      noteId = currentNote.id;
    } else {
      const { data } = await supabase.from('notes').insert(noteData).select('id').single();
      noteId = data!.id;
    }

    // Генерируем и сохраняем embedding
    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, noteId }),
      });
      await res.json();
    } catch (e) {
      console.warn('Embedding generation failed (continue anyway)', e);
    }

    // Обновляем список
    const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
    setNotes(data || []);
  } catch (err) {
    alert('Ошибка сохранения');
  } finally {
    setIsSaving(false);
  }
};

  const callAI = async (action: 'title' | 'summarize' | 'improve') => {
    const promptText = action === 'title'
      ? (currentNote.content || currentNote.title || '')
      : (currentNote.content || '');

    if (!promptText.trim()) {
      alert('Напишите текст перед использованием AI');
      return;
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, action }),
      });
      const data = await res.json();
      const cleanText = data.text.trim();

      if (action === 'title') setCurrentNote(prev => ({ ...prev, title: cleanText }));
      else setCurrentNote(prev => ({ ...prev, content: cleanText }));
    } catch (err: any) {
      alert('Ошибка AI: ' + err.message);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !user) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, userId: user.id }),
      });

      const data = await res.json();

      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка при получении ответа' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Не удалось отправить сообщение' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6 pt-20">
      {/* Список заметок */}
      <div className="col-span-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Заметки</h2>
          <button onClick={() => setCurrentNote({ title: '', content: '', tags: [] })} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-2xl">
            <Plus className="w-4 h-4" /> Новая
          </button>
        </div>

        <input
          type="text"
          placeholder="Поиск заметок..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-4 px-4 py-3 bg-zinc-900 border border-white/10 rounded-2xl focus:outline-none focus:border-violet-500"
        />

        <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-auto pr-2">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              onClick={() => setCurrentNote(note)}
              className={`p-4 glass rounded-2xl cursor-pointer transition-all hover:border-violet-500 ${currentNote.id === note.id ? 'border-violet-500 bg-white/5' : ''}`}
            >
              <h3 className="font-medium">{note.title}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{note.content}</p>
              <p className="text-xs text-zinc-500 mt-2">{new Date(note.updated_at).toLocaleDateString('ru-RU')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Редактор */}
      <div className="col-span-8">
        <div className="glass rounded-3xl p-8">
          <div className="flex gap-3 mb-6 flex-wrap">
            <button onClick={() => callAI('title')} className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm">
              <Sparkles className="w-4 h-4" /> Заголовок
            </button>
            <button onClick={() => callAI('summarize')} className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm">
              <FileText className="w-4 h-4" /> Summary
            </button>
            <button onClick={() => callAI('improve')} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-2xl text-sm">
              <Edit3 className="w-4 h-4" /> Улучшить
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className={`ml-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm ${showChat ? 'bg-green-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            >
              <MessageSquare className="w-4 h-4" /> {showChat ? 'Скрыть чат' : 'RAG-чат'}
            </button>
          </div>

          <input
            type="text"
            placeholder="Название заметки..."
            value={currentNote.title || ''}
            onChange={(e) => setCurrentNote(prev => ({ ...prev, title: e.target.value }))}
            className="w-full bg-transparent text-4xl font-semibold placeholder:text-zinc-500 focus:outline-none mb-6"
          />

          <MDEditor
            value={currentNote.content || ''}
            onChange={val => setCurrentNote(prev => ({ ...prev, content: val || '' }))}
            height={500}
          />

          <div className="flex justify-end gap-4 mt-6">
            <button onClick={saveNote} disabled={isSaving || !currentNote.title?.trim()} className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl font-medium">
              <Save className="w-4 h-4" /> {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>

      {/* RAG-чат */}
      {showChat && (
        <div className="fixed right-6 bottom-6 w-96 bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold">AI Второй Мозг</h3>
            <button onClick={() => setShowChat(false)}>✕</button>
          </div>

          <div className="h-96 overflow-auto p-4 space-y-4">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-violet-600' : 'bg-zinc-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isChatLoading && <div className="text-zinc-400">AI думает...</div>}
          </div>

          <form onSubmit={e => { e.preventDefault(); sendChatMessage(); }} className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Задай вопрос по заметкам..."
                className="flex-1 bg-zinc-800 rounded-2xl px-5 py-3 focus:outline-none"
              />
              <button type="submit" disabled={isChatLoading} className="bg-violet-600 px-6 rounded-2xl">Отправить</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}