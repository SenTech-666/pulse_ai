// app/api/chat/route.ts
import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.YANDEX_API_KEY!,
  baseURL: 'https://ai.api.cloud.yandex.net/v1',
  defaultHeaders: {
    'OpenAI-Project': process.env.YANDEX_FOLDER_ID!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message?.trim() || !userId) {
      return Response.json({ error: 'Сообщение и пользователь обязательны' }, { status: 400 });
    }

    // Загружаем заметки пользователя
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, content')
      .eq('user_id', userId);

    // Если заметок нет — показываем сообщение
    if (!notes || notes.length === 0) {
      return Response.json({ reply: 'У тебя пока нет заметок. Создай хотя бы одну!' });
    }

    // Простой RAG (находим релевантные заметки)
    const relevantNotes = notes
      .filter(note =>
        note.title.toLowerCase().includes(message.toLowerCase()) ||
        note.content.toLowerCase().includes(message.toLowerCase())
      )
      .slice(0, 6);

    const context = relevantNotes
      .map((n, i) => `Заметка ${i + 1}: ${n.title}\n${n.content}`)
      .join('\n\n---\n\n');

    // Генерация ответа через YandexGPT
    const completion = await openai.chat.completions.create({
      model: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
      messages: [
        { role: 'system', content: `Ты — умный AI-помощник "второго мозга". Отвечай только на основе контекста заметок. Если информации недостаточно — честно скажи об этом. Отвечай на русском языке, дружелюбно и по делу.` },
        { role: 'user', content: `Контекст заметок:\n${context}\n\nВопрос: ${message}` }
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const reply = completion.choices[0]?.message?.content || "Не удалось сгенерировать ответ";

    return Response.json({ reply });
  } catch (error: any) {
    console.error('RAG Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}