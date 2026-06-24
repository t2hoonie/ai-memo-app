# Utils - AI Agent 지침서

## 모듈 역할

순수 유틸리티 함수 및 헬퍼 집합. 비즈니스 로직과 독립적인 재사용 가능한 기능을 제공한다.

## 의존성 관계

- `@/types/memo` — Memo, MemoRecord 타입
- `@supabase/supabase-js` — Supabase 클라이언트

## 유틸리티 목록

| 파일 | 역할 |
|------|------|
| `supabaseClient.ts` | Supabase 싱글톤 클라이언트 |
| `supabaseMemos.ts` | Supabase memos 테이블 CRUD 래퍼 |
| `localStorage.ts` | LocalStorage CRUD 래퍼 (기존 데이터 이전 보조용) |
| `seedData.ts` | 샘플 데이터 정의 (DB seed 마이그레이션 참조용) |

## supabaseClient.ts 구조

```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(url, anonKey)
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 필요
- 싱글톤 패턴 — 앱 전체에서 동일 인스턴스 사용

## supabaseMemos.ts 구조

```typescript
const supabaseMemos = {
  getMemos(): Promise<MemoRecord[]>          // 전체 메모 조회 (created_at desc)
  getMemoCount(): Promise<number>             // 메모 수 조회
  addMemo(memo: Memo): Promise<MemoRecord | null>      // 메모 추가
  updateMemo(memo: Memo): Promise<MemoRecord | null>   // 메모 수정 (summary 제외)
  deleteMemo(id: string): Promise<boolean>   // 메모 삭제
  updateSummary(id, summary): Promise<boolean>  // AI 요약 영속화
  bulkInsert(memos: Memo[]): Promise<boolean>   // 일괄 삽입 (localStorage 이전용)
  clearMemos(): Promise<boolean>             // 전체 삭제
}
```

### DB row ↔ MemoRecord 매핑

| DB column (snake_case) | MemoRecord field (camelCase) |
|------------------------|------------------------------|
| `id` | `id` |
| `title` | `title` |
| `content` | `content` |
| `category` | `category` |
| `tags` | `tags` |
| `summary` | `summary` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

## Implementation Patterns

### Supabase CRUD 패턴

```typescript
export const supabaseMemos = {
  someOperation: async (): Promise<ReturnType> => {
    const { data, error } = await supabase.from('memos').select('*')
    if (error) {
      console.error('Error:', error)
      return defaultValue
    }
    return transform(data)
  },
}
```

### SSR 안전한 브라우저 API 접근 (localStorage 이전 로직)

```typescript
if (typeof window !== 'undefined') {
  const localMemos = localStorageUtils.getMemos()
  // ...
}
```

## DB 스키마 (Supabase memos 테이블)

```sql
create table public.memos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  category text not null,
  tags text[] not null default '{}',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- RLS 활성화. anon/authenticated 모두 전체 권한 부여 (단일 사용자 앱)
- 인덱스: `category`, `created_at desc`

## Local Golden Rules

### Do's

- 모든 유틸리티는 async/await 사용, 에러 시 기본값 반환
- Supabase 에러는 `console.error`로 로깅 후 기본값 반환
- JSON 파싱/직렬화 시 try-catch 필수
- DB 접근은 항상 `supabaseClient`의 `supabase` 싱글톤 사용

### Don'ts

- React 훅 사용 금지 (유틸리티는 훅이 아님)
- 전역 상태 변경 금지
- 직접 DOM 조작 금지 (React에 위임)
- `localStorage`를 새 기능에 사용 금지 (이전 보조 코드에서만 사용)

## 환경변수

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 (클라이언트 노출 가능) |

## 테스트 고려사항

- `supabaseMemos` 함수 단위 테스트 시 `supabase` 클라이언트 모킹 필요
- E2E 테스트는 실제 Supabase 연결 또는 로컬 Supabase 인스턴스 사용
