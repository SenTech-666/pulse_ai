// src/app/api/reindex/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.YANDEX_API_KEY!,
  baseURL: 'https://ai.api.cloud.yandex.net/v1',
  defaultHeaders: { 'OpenAI-Project': process.env.YANDEX_FOLDER_ID! },
});

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: `emb://${process.env.YANDEX_FOLDER_ID}/text-search-doc/latest`,
      input: text,
      encoding_format: 'float',
      // dimensions: 256, // Yandex пока не поддерживает этот параметр напрямую
    });
    const embedding = response.data[0].embedding as number[];
    
    if (embedding.length !== 256) {
      console.warn(`⚠️ Неожиданная размерность: ${embedding.length}`);
    }
    
    return embedding;
  } catch (e: any) {
    console.error('❌ Embedding API Error:', e.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Запущена переиндексация...');

    const { userId } = await req.json().catch(() => ({}));

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq(userId ? 'user_id' : '', userId || '');

    if (error) throw error;

    console.log(`Найдено заметок: ${notes?.length || 0}`);

    if (!notes || notes.length === 0) {
      return Response.json({ message: 'Нет заметок' });
    }

    let success = 0;
    let failed = 0;

    for (const note of notes) {
      try {
        const text = `${note.title} ${note.content || ''}`.trim();
        if (text.length < 20) {
          console.log(`⏭ Пропущена (слишком короткая): ${note.title}`);
          continue;
        }

        const embedding = await getEmbedding(text);

        if (!embedding) {
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('notes')
          .update({ embedding })
          .eq('id', note.id);

        if (updateError) {
          console.error(`❌ Не сохранилось для ${note.title}:`, updateError.message);
          failed++;
        } else {
          success++;
          console.log(`✅ Успешно: ${note.title}`);
        }
      } catch (e: any) {
        console.error(`❌ Критическая ошибка для ${note.title}:`, e.message);
        failed++;
      }
    }

    return Response.json({ 
      message: `✅ Готово! Успешно: ${success}, Ошибок: ${failed}` 
    });

  } catch (error: any) {
    console.error('Reindex critical error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}