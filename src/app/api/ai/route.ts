// src/app/api/ai/route.ts
import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const client = new OpenAI({
  apiKey: process.env.YANDEX_API_KEY!,
  baseURL: 'https://ai.api.cloud.yandex.net/v1',
  defaultHeaders: {
    'OpenAI-Project': process.env.YANDEX_FOLDER_ID!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, action } = await req.json();

    if (!prompt?.trim()) {
      return Response.json({ error: "Нет текста для обработки" }, { status: 400 });
    }

    let systemPrompt = 'Ты полезный помощник для заметок. Отвечай на русском языке.';

    if (action === 'title') {
      systemPrompt = 'Придумай короткое, точное и ёмкое название для заметки. Ответь ТОЛЬКО названием, без кавычек и пояснений.';
    } else if (action === 'summarize') {
      systemPrompt = 'Сделай краткое, но содержательное summary заметки на русском языке.';
    } else if (action === 'improve') {
      systemPrompt = 'Улучши текст: сделай его грамотнее, структурированнее, понятнее и профессиональнее. Сохрани оригинальный смысл.';
    }

    const completion = await client.chat.completions.create({
      model: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt.trim() }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content || "Не удалось получить ответ";

    return Response.json({ text: text.trim() });

  } catch (error: any) {
    console.error("AI Error:", error);
    return Response.json({ error: error.message || 'Ошибка Yandex GPT' }, { status: 500 });
  }
}