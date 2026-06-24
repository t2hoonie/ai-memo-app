# Hooks - AI Agent 지침서

## 모듈 역할

클라이언트 상태 관리를 위한 커스텀 React 훅 집합. 메모 CRUD, 검색, 필터링, AI 요약 로직을 캡슐화한다.

## 의존성 관계

- `@/types/memo` — Memo, MemoFormData, MemoRecord 타입
- `@/utils/supabaseMemos` — Supabase CRUD 유틸리티
- `@/utils/localStorage` — localStorage 읽기 (데이터 이전 보조)
- `uuid` — ID 생성

## 훅 목록

| 파일 | 역할 | 반환값 |
|------|------|--------|
| `useMemos.ts` | 메모 상태 전체 관리 (Supabase 연동) | memos, CRUD 함수, 필터 함수, stats |
| `useSummary.ts` | AI 요약 생성 및 DB 영속화 | summary, summarize, initializeSummary, reset |

## useMemos 구조

```tsx
const {
  // 상태
  memos,              // 필터링된 메모 배열 (MemoRecord[])
  allMemos,           // 전체 메모 배열 (MemoRecord[])
  loading,            // 로딩 상태
  searchQuery,        // 현재 검색어
  selectedCategory,   // 선택된 카테고리
  stats,              // 통계 (total, byCategory, filtered)

  // CRUD (모두 async)
  createMemo,         // (formData) => Promise<MemoRecord | null>
  updateMemo,         // (id, formData) => Promise<void>
  deleteMemo,         // (id) => Promise<void>
  getMemoById,        // (id) => MemoRecord | undefined
  patchMemoSummary,   // (id, summary) => void — 로컬 상태만 업데이트

  // 필터링
  searchMemos,        // (query) => void
  filterByCategory,   // (category) => void

  // 유틸리티
  clearAllMemos,      // () => Promise<void>
} = useMemos()
```

### 초기 로드 흐름

1. Supabase에서 메모 수(`getMemoCount`) 조회
2. DB가 비어 있고 localStorage에 기존 메모가 있으면 일괄 업로드 (1회성 이전)
3. `getMemos()`로 전체 메모 로드

### 검색 및 필터링

DB가 아닌 로컬 state에서 `useMemo`로 계산 (클라이언트 사이드). 실시간성과 불필요한 DB 왕복 제거가 목적.

## useSummary 구조

```tsx
const {
  summary,            // 현재 요약 문자열 (string | null)
  loading,            // 요약 생성 중 여부
  error,              // 에러 메시지 (string | null)
  summarize,          // (memo: Memo) => Promise<void> — API 호출 + DB 저장
  initializeSummary,  // (value: string | null) => void — 기존 요약으로 초기화
  reset,              // () => void — 상태 초기화
} = useSummary()
```

### 요약 흐름

1. `summarize(memo)` 호출
2. `/api/summarize`(Gemini) API 호출
3. 성공 시 `summary` 상태 업데이트 + `supabaseMemos.updateSummary(id, text)` DB 저장
4. MemoViewer가 `onSummaryUpdated` 콜백으로 부모(page.tsx)에 알림
5. page.tsx가 `patchMemoSummary`로 로컬 memos 상태 반영

### 요약 초기화 흐름

- MemoViewer가 새 메모를 받으면 `initializeSummary(memo.summary)` 호출
- DB에 저장된 요약이 있으면 즉시 표시

## Implementation Patterns

### 새 커스텀 훅 작성 템플릿

```tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export const useCustomHook = (initialValue?: SomeType) => {
  const [state, setState] = useState<StateType>(initialValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // async 로직
      setLoading(false)
    }
    load()
  }, [])

  const action = useCallback(async () => {
    // async 로직
  }, [dependencies])

  const derivedState = useMemo(() => {
    return /* 계산 */
  }, [state])

  return { state, loading, action, derivedState }
}
```

### 성능 최적화 패턴

1. **useCallback**: 자식 컴포넌트에 전달되는 함수
2. **useMemo**: 비용이 큰 계산 또는 객체/배열 생성
3. 의존성 배열 최소화

## Local Golden Rules

### Do's

- 훅 이름은 `use` 접두사 필수
- Supabase 접근은 `supabaseMemos` 유틸 통해서만
- 에러 처리: try-catch로 감싸고 console.error 로깅
- 로딩 상태 항상 제공
- CRUD 함수는 async/await 사용

### Don'ts

- 훅 내부에서 직접 UI 렌더링 금지
- 조건부 훅 호출 금지 (React 규칙)
- 무한 루프 유발하는 의존성 배열 주의
- 훅 외부에서 useState/useEffect 호출 금지
- `localStorageUtils` 직접 호출 금지 (마이그레이션 이전 로직 제외)

## 확장 시 고려사항

새 기능 추가 시 useMemos 훅 확장 또는 별도 훅 생성:

- **useMemos 확장**: 메모 관련 기능 (정렬, 페이지네이션, 실시간 구독)
- **별도 훅 생성**: 독립적 기능 (useTheme, useToast 등)
