// src/app/api/embed/route.ts
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

export async function POST(req: NextRequest) {
  try {
    const { text, noteId } = await req.json();

    if (!text || !noteId) {
      return Response.json({ error: 'Нет текста или noteId' }, { status: 400 });
    }

    const response = await openai.embeddings.create({
      model: `emb://${process.env.YANDEX_FOLDER_ID}/text-search-doc/latest`,
      input: text,
      encoding_format: 'float',
    });

    const vector = response.data[0].embedding;

    const { error } = await supabase
      .from('notes')
      .update({ embedding: vector })
      .eq('id', noteId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (e: any) {
    console.error('Embedding error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}