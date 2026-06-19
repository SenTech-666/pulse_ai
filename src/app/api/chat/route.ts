// src/app/api/chat/route.ts
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
  defaultHeaders: { 'OpenAI-Project': process.env.YANDEX_FOLDER_ID! },
});

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: `emb://${process.env.YANDEX_FOLDER_ID}/text-search-doc/latest`,
    input: text,
    encoding_format: 'float',
  });
  return response.data[0].embedding as number[];
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message?.trim()) {
      return Response.json({ error: 'Сообщение обязательно' }, { status: 400 });
    }

    console.log(`🔍 Запрос: "${message}" | userId: ${userId || 'НЕ ПЕРЕДАН'}`);

    const queryEmbedding = await getEmbedding(message);

    let relevantNotes: any[] = [];

    // === ОТЛАДОЧНЫЙ ВАРИАНТ: сначала берём все заметки ===
    const { data: allNotes, error: allError } = await supabase
      .from('notes')
      .select('id, title, content, user_id')
      .order('updated_at', { ascending: false })
      .limit(15);

    console.log(`Всего заметок в базе: ${allNotes?.length || 0}`);

    if (allNotes && allNotes.length > 0) {
      // Фильтруем по userId на клиенте (для отладки)
      relevantNotes = allNotes.filter(n => !userId || n.user_id === userId);
      console.log(`После фильтра по userId осталось: ${relevantNotes.length}`);
    }

    if (relevantNotes.length === 0 && allNotes) {
      relevantNotes = allNotes; // берём всё, если ничего не нашлось
    }

    const context = relevantNotes
      .map((n: any, i: number) => 
        `Заметка ${i+1}:\nЗаголовок: ${n.title}\nСодержание: ${n.content?.substring(0, 2000)}\n`
      )
      .join('\n---\n');

    console.log(`📤 В LLM отправлено ${relevantNotes.length} заметок`);

    const completion = await openai.chat.completions.create({
      model: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
      messages: [
        { 
          role: 'system', 
          content: `Ты — Второй Мозг пользователя. Используй предоставленные заметки.` 
        },
        { 
          role: 'user', 
          content: `Заметки:\n${context || 'Заметок пока нет.'}\n\nВопрос: ${message}` 
        }
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content || "Не получилось ответить.";

    return Response.json({ reply, sources: relevantNotes.length });

  } catch (error: any) {
    console.error('RAG Error:', error);
    return Response.json({ reply: 'Ошибка сервера. Смотри логи.' }, { status: 500 });
  }
}