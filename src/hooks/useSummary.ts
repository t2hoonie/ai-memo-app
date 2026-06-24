'use client'

import { useState, useCallback } from 'react'
import { Memo } from '@/types/memo'
import { supabaseMemos } from '@/utils/supabaseMemos'

interface UseSummaryReturn {
  summary: string | null
  loading: boolean
  error: string | null
  summarize: (memo: Memo) => Promise<void>
  initializeSummary: (value: string | null) => void
  reset: () => void
}

export function useSummary(): UseSummaryReturn {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const summarize = useCallback(async (memo: Memo) => {
    setLoading(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memo.title, content: memo.content }),
      })

      const data: { summary?: string; error?: string } = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'AI 요약 중 오류가 발생했습니다.')
        return
      }

      const text = data.summary ?? null
      setSummary(text)

      if (text) {
        await supabaseMemos.updateSummary(memo.id, text)
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 메모 변경 시 DB에 저장된 기존 요약으로 초기화
  const initializeSummary = useCallback((value: string | null) => {
    setSummary(value)
    setError(null)
    setLoading(false)
  }, [])

  const reset = useCallback(() => {
    setSummary(null)
    setError(null)
    setLoading(false)
  }, [])

  return { summary, loading, error, summarize, initializeSummary, reset }
}
