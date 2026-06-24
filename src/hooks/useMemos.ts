'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Memo, MemoFormData, MemoRecord } from '@/types/memo'
import { supabaseMemos } from '@/utils/supabaseMemos'
import { localStorageUtils } from '@/utils/localStorage'

export const useMemos = () => {
  const [memos, setMemos] = useState<MemoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드 (DB가 비어있고 localStorage에 데이터가 있으면 1회 이전)
  useEffect(() => {
    const loadMemos = async () => {
      setLoading(true)
      try {
        const count = await supabaseMemos.getMemoCount()

        if (count === 0 && typeof window !== 'undefined') {
          const localMemos = localStorageUtils.getMemos()
          if (localMemos.length > 0) {
            const memosWithNewIds: Memo[] = localMemos.map(m => ({
              ...m,
              id: uuidv4(),
            }))
            await supabaseMemos.bulkInsert(memosWithNewIds)
            localStorageUtils.clearMemos()
          }
        }

        const loaded = await supabaseMemos.getMemos()
        setMemos(loaded)
      } catch (error) {
        console.error('Failed to load memos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMemos()
  }, [])

  // 메모 생성
  const createMemo = useCallback(async (formData: MemoFormData): Promise<MemoRecord | null> => {
    const newMemo: Memo = {
      id: uuidv4(),
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const created = await supabaseMemos.addMemo(newMemo)
    if (created) {
      setMemos(prev => [created, ...prev])
    }

    return created
  }, [])

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      const existingMemo = memos.find(memo => memo.id === id)
      if (!existingMemo) return

      const updatedMemo: Memo = {
        ...existingMemo,
        ...formData,
        updatedAt: new Date().toISOString(),
      }

      const saved = await supabaseMemos.updateMemo(updatedMemo)
      if (saved) {
        setMemos(prev => prev.map(memo => (memo.id === id ? saved : memo)))
      }
    },
    [memos]
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    const success = await supabaseMemos.deleteMemo(id)
    if (success) {
      setMemos(prev => prev.filter(memo => memo.id !== id))
    }
  }, [])

  // 로컬 상태의 요약 업데이트 (DB 저장은 useSummary에서 담당)
  const patchMemoSummary = useCallback((id: string, summary: string): void => {
    setMemos(prev => prev.map(memo => (memo.id === id ? { ...memo, summary } : memo)))
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): MemoRecord | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback(async (): Promise<void> => {
    const success = await supabaseMemos.clearMemos()
    if (success) {
      setMemos([])
      setSearchQuery('')
      setSelectedCategory('all')
    }
  }, [])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,
    patchMemoSummary,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
  }
}
