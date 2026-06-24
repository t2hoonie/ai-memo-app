export interface Memo {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// Supabase DB row에서 읽어온 메모. Memo를 확장하며 AI 요약 필드를 포함한다.
export interface MemoRecord extends Memo {
  summary: string | null
}

export interface MemoFormData {
  title: string
  content: string
  category: string
  tags: string[]
}

export type MemoCategory = 'personal' | 'work' | 'study' | 'idea' | 'other'

export const MEMO_CATEGORIES: Record<MemoCategory, string> = {
  personal: '개인',
  work: '업무',
  study: '학습',
  idea: '아이디어',
  other: '기타',
}

export const DEFAULT_CATEGORIES = Object.keys(MEMO_CATEGORIES) as MemoCategory[]
