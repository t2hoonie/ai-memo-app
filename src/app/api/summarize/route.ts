import { GoogleGenAI } from '@google/genai'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return Response.json(
      { error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  let title: string
  let content: string

  try {
    const body = await request.json()
    title = body.title
    content = body.content
  } catch {
    return Response.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  if (!title || !content) {
    return Response.json(
      { error: '제목과 내용이 필요합니다.' },
      { status: 400 },
    )
  }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `다음 메모를 3~5문장으로 한국어로 간결하게 요약해줘. 요약문만 출력해줘.\n\n제목: ${title}\n내용:\n${content}`,
    })

    return Response.json({ summary: response.text })
  } catch (error) {
    console.error('Gemini API 요청 실패:', error)
    return Response.json(
      { error: 'AI 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 },
    )
  }
}
