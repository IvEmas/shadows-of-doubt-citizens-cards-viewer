import { NextResponse } from 'next/server';

import { parseCityBuffer } from '@/lib/server/city-parser';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не получен.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseCityBuffer(buffer, file.name);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось обработать файл.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
