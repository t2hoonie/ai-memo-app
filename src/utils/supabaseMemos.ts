import { supabase } from '@/utils/supabaseClient'
import { Memo, MemoRecord } from '@/types/memo'

// DB row 타입 (snake_case)
interface MemoRow {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  summary: string | null
  created_at: string
  updated_at: string
}

function rowToMemoRecord(row: MemoRow): MemoRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const supabaseMemos = {
  getMemos: async (): Promise<MemoRecord[]> => {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading memos from Supabase:', error)
      return []
    }

    return (data as MemoRow[]).map(rowToMemoRecord)
  },

  getMemoCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('memos')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error counting memos:', error)
      return 0
    }

    return count ?? 0
  },

  addMemo: async (memo: Memo): Promise<MemoRecord | null> => {
    const { data, error } = await supabase
      .from('memos')
      .insert({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        category: memo.category,
        tags: memo.tags,
        summary: null,
        created_at: memo.createdAt,
        updated_at: memo.updatedAt,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding memo to Supabase:', error)
      return null
    }

    return rowToMemoRecord(data as MemoRow)
  },

  updateMemo: async (memo: Memo): Promise<MemoRecord | null> => {
    const { data, error } = await supabase
      .from('memos')
      .update({
        title: memo.title,
        content: memo.content,
        category: memo.category,
        tags: memo.tags,
        updated_at: memo.updatedAt,
      })
      .eq('id', memo.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating memo in Supabase:', error)
      return null
    }

    return rowToMemoRecord(data as MemoRow)
  },

  deleteMemo: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('memos').delete().eq('id', id)

    if (error) {
      console.error('Error deleting memo from Supabase:', error)
      return false
    }

    return true
  },

  updateSummary: async (id: string, summary: string): Promise<boolean> => {
    const { error } = await supabase
      .from('memos')
      .update({ summary })
      .eq('id', id)

    if (error) {
      console.error('Error updating summary in Supabase:', error)
      return false
    }

    return true
  },

  bulkInsert: async (memos: Memo[]): Promise<boolean> => {
    const rows = memos.map(memo => ({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      category: memo.category,
      tags: memo.tags,
      summary: null,
      created_at: memo.createdAt,
      updated_at: memo.updatedAt,
    }))

    const { error } = await supabase.from('memos').insert(rows)

    if (error) {
      console.error('Error bulk inserting memos:', error)
      return false
    }

    return true
  },

  clearMemos: async (): Promise<boolean> => {
    const { error } = await supabase.from('memos').delete().neq('id', '')

    if (error) {
      console.error('Error clearing memos from Supabase:', error)
      return false
    }

    return true
  },
}
