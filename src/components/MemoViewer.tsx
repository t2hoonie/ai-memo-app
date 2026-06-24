'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MemoRecord, MEMO_CATEGORIES } from '@/types/memo'
import { useSummary } from '@/hooks/useSummary'

const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then(m => m.default.Markdown),
  { ssr: false },
)

interface MemoViewerProps {
  memo: MemoRecord | null
  onClose: () => void
  onEdit: (memo: MemoRecord) => void
  onDelete: (id: string) => void
  onTagsUpdate: (id: string, tags: string[]) => void
  onSummaryUpdated?: (id: string, summary: string) => void
}

export default function MemoViewer({
  memo,
  onClose,
  onEdit,
  onDelete,
  onTagsUpdate,
  onSummaryUpdated,
}: MemoViewerProps) {
  const { summary, loading: summaryLoading, error: summaryError, summarize, initializeSummary } = useSummary()
  const [localTags, setLocalTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 메모가 바뀌면 DB에 저장된 기존 요약으로 초기화
  useEffect(() => {
    initializeSummary(memo?.summary ?? null)
    setLocalTags(memo?.tags ?? [])
    setTagInput('')
    // memo.id가 바뀔 때만 초기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo?.id, initializeSummary])

  // 요약이 생성되면 부모 컴포넌트에 알려 로컬 상태 반영
  useEffect(() => {
    if (summary && memo && summary !== memo.summary) {
      onSummaryUpdated?.(memo.id, summary)
    }
    // summary 값이 변경될 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  const handleAddTag = useCallback(() => {
    if (!memo) return
    const tag = tagInput.trim()
    if (!tag || localTags.includes(tag)) return
    const nextTags = [...localTags, tag]
    setLocalTags(nextTags)
    setTagInput('')
    onTagsUpdate(memo.id, nextTags)
  }, [memo, tagInput, localTags, onTagsUpdate])

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (!memo) return
      const nextTags = localTags.filter(t => t !== tagToRemove)
      setLocalTags(nextTags)
      onTagsUpdate(memo.id, nextTags)
    },
    [memo, localTags, onTagsUpdate],
  )

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag],
  )

  if (!memo) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      study: 'bg-purple-100 text-purple-800',
      idea: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] ?? colors.other
  }

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const handleEdit = () => {
    onEdit(memo)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      data-testid="memo-viewer-backdrop"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="memo-viewer-modal"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <h2
              className="text-2xl font-bold text-gray-900 leading-tight mb-3"
              data-testid="memo-viewer-title"
            >
              {memo.title}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(memo.category)}`}
              >
                {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ??
                  memo.category}
              </span>
              <span className="text-xs text-gray-400">
                작성: {formatDate(memo.createdAt)}
              </span>
              {memo.createdAt !== memo.updatedAt && (
                <span className="text-xs text-gray-400">
                  수정: {formatDate(memo.updatedAt)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="닫기"
            data-testid="memo-viewer-close-btn"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div data-color-mode="light" data-testid="memo-viewer-content">
            <MDPreview source={memo.content} />
          </div>

          {/* 태그 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">태그</p>

            {/* 태그 목록 */}
            <div className="flex gap-2 flex-wrap mb-3">
              {localTags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  data-testid="memo-viewer-tag"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={`${tag} 태그 삭제`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>

            {/* 태그 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors placeholder-gray-400 text-gray-700"
                placeholder="태그를 입력하고 Enter를 누르세요"
                data-testid="memo-viewer-tag-input"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors font-medium"
                data-testid="memo-viewer-tag-add-btn"
              >
                추가
              </button>
            </div>
          </div>

          {/* AI 요약 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => summarize(memo)}
              disabled={summaryLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium rounded-lg transition-colors"
              data-testid="memo-viewer-summarize-btn"
            >
              {summaryLoading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  요약 중...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  AI 요약
                </>
              )}
            </button>

            {summaryError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{summaryError}</p>
              </div>
            )}

            {summary && (
              <div
                className="mt-3 p-4 bg-violet-50 border border-violet-200 rounded-lg"
                data-testid="memo-viewer-summary"
              >
                <p className="text-xs font-semibold text-violet-600 mb-2">AI 요약 결과</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={handleEdit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            data-testid="memo-viewer-edit-btn"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            편집
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
            data-testid="memo-viewer-delete-btn"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
