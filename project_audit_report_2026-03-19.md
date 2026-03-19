# 🔍 WhereIsIt 소스코드 철저 감사 리포트
> **작성일**: 2026-03-19 | **분석자**: Senior Developer (Gemini)  
> **분석 범위**: 전체 소스 파일 (App.tsx, hooks, services, components 전체)

---

## ⚡ 요약 (Executive Summary)

| 등급 | 건수 | 내용 |
|------|------|------|
| 🔴 **Critical** | 4건 | 즉시 수정하지 않으면 실서비스 불가 |
| 🟡 **Major** | 6건 | 사용자 경험/데이터 손실 위험 |
| 🔵 **Minor** | 5건 | 코드 품질 및 유지보수성 |

---

## 🔴 Critical (즉시 수정 필요)

---

### [C-1] 🚨 Blob URL 메모리 누수 (Memory Leak)
- **파일**: `src/hooks/useItemActions.ts` (Line 127)
- **코드**:
```typescript
const virtualPreviewUrl = URL.createObjectURL(file); // 👈 생성 후 해제 코드 없음
```
- **문제**: `URL.createObjectURL()`로 만든 가상 URL은 **명시적으로 `URL.revokeObjectURL()`을 호출해서 해제**해야 합니다.  
  현재 이 해제 코드가 전혀 없습니다! 사용자가 사진을 추가하거나 취소할 때마다 메모리 조각이 쌓여서,  
  오래 앱을 사용할수록 브라우저 메모리 용량을 잡아먹다가 결국 **앱이 느려지거나 강제 종료**될 수 있습니다.
- **해결책**: 
  - 이미지를 제거(`removeImage`)할 때 이전 blob URL을 `revokeObjectURL`로 해제
  - 폼 리셋(`RESET_FORM`) 시 보관 중인 모든 blob URL 일괄 해제
  - `useEffect`의 cleanup 함수에서 처리

---

### [C-2] 🚨 익명 인증 세션이 공유됨 (Security Risk)
- **파일**: `services/supabaseClient.ts` (Line 64)
- **코드**:
```typescript
const { data, error } = await client.auth.signInAnonymously();
```
- **문제**: 현재 앱은 로그인 없이 **"익명 인증(Anonymous Sign-in)"** 방식을 씁니다.  
  같은 기기, 같은 브라우저에서만 내 데이터를 볼 수 있는 구조입니다.  
  그런데 Supabase의 익명 사용자는 **기기를 바꾸거나 브라우저 쿠키가 삭제되면 새로운 익명 유저가 생성**되어
  기존 데이터를 찾을 수 없게 됩니다. (데이터 미아 발생)
- **해결책**: 
  - 구글/카카오 소셜 로그인 연동  
  - 또는 최소한 **이메일 + 비밀번호 기반 회원가입/로그인** 구현

---

### [C-3] 🚨 vite.config.ts에 Supabase 환경변수 미노출 (Build Break)
- **파일**: `vite.config.ts` (Line 15)
- **코드**:
```typescript
define: {
  'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
  // 👈 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 가 여기 없음!
},
```
- **문제**: Vite는 `VITE_` 접두어 변수를 자동 노출하지만, `define` 블록에 명시된 변수가 **빌드 시 환경변수를 덮어씌울 수 있는 충돌** 문제를 일으킬 수 있습니다.  
  현재 Gemini API 키만 `define`에 들어있고 Supabase 키는 빠져 있어서, **배포 환경에서 Supabase 연결이 끊길 위험**이 있습니다.
- **해결책**: `define` 블록을 제거하거나, 모든 핵심 환경변수를 일관되게 관리

---

### [C-4] 🚨 JSON 백업 복원 시 Supabase 동기화 없음 (Data Integrity)
- **파일**: `src/hooks/useItemActions.ts` (Line 372)
- **코드**:
```typescript
alert('데이터가 복원되었습니다. 클라우드 동기화는 다음 단계 작업에서 보완할 예정입니다.');
```
- **문제**: 복원 버튼을 누르면 로컬 상태(메모리)에만 데이터가 쏟아지고, **Supabase 클라우드에는 업로드되지 않습니다.**  
  앱을 재시작하거나 새로고침하면 Supabase에서 데이터를 다시 불러오기 때문에 **복원한 데이터가 증발**합니다!
- **해결책**: 복원 완료 후 `supabaseService.addItem()`을 루프로 돌려 전체 데이터를 클라우드에 재업로드

---

## 🟡 Major (빠른 개선 필요)

---

### [M-1] 이미지 Signed URL 만료 문제
- **파일**: `services/imageStorageService.ts` (Line 3)
- **코드**:
```typescript
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7일
```
- **문제**: Storage 이미지는 **7일짜리 만료 URL(Signed URL)** 로 표시됩니다.  
  일주일 후 앱을 열면 **이미지가 전부 깨져서 보이지 않습니다.** (이미지는 있지만 URL이 expired)
- **해결책**: 앱 초기화 시 또는 아이템 조회 시 만료가 임박한 URL을 갱신하는 로직 추가

---

### [M-2] Settings 컴포넌트의 보안 섹션이 데이터 관리 카드 안에 중첩됨 (UI Bug)
- **파일**: `components/Settings.tsx` (Line 119)
- **문제**: "보안 설정" 카드가 "데이터 관리" 카드의 **JSX 안에 자식으로 중첩**되어 있습니다.  
  이 구조는 시각적으로 보안 카드가 데이터 관리 그라데이션 영역 안에 갇혀서 **가독성이 나쁘고 의도된 UI가 아닐 가능성**이 높습니다.

---

### [M-3] ItemDetail에서 미사용 import (useContext, dispatch)
- **파일**: `components/ItemDetail.tsx` (Line 18)
- **코드**:
```typescript
const { state, dispatch } = useContext(AppContext); // 👈 state와 dispatch 둘 다 사용 안 함
```
- **문제**: `state`와 `dispatch`를 가져왔지만 컴포넌트 내에서 **실제로 사용되지 않습니다.**  
  불필요한 Context 구독으로 인해 전역 상태가 바뀔 때마다 이 컴포넌트가 **불필요하게 리렌더링**됩니다.
- **해결책**: `useContext(AppContext)` 호출 자체를 삭제

---

### [M-4] useItemActions 훅 내 compressImage 함수가 사용되지 않음 (Dead Code)
- **파일**: `src/hooks/useItemActions.ts` (Line 22-52)
- **문제**: 오늘 리팩토링에서 `compressImage` 함수를 사용 안 하도록 수정했지만, **함수 자체를 파일에서 삭제하지 않았습니다.**  
  빌드될 때 번들 파일 용량을 늘리고, 개발자에게 혼란을 줍니다 (아직 사용 중인 건지 판단 불가).

---

### [M-5] PinPadModal의 PIN 변경 흐름에서 기존 PIN 재인증 세션 관리 없음
- **파일**: `App.tsx` (Line 161-183)
- **문제**: PIN 변경 시 현재 PIN 검증(`verify`) → 새 PIN 설정(`setup`) 순서로 진행합니다.  
  그런데 `verify` 성공 콜백에서 바로 `setup` 모달을 다시 열 때,  
  **PinPadModal에 `key={pinModal.mode}`가 걸려 있어서 `mode`가 바뀌면 컴포넌트가 리셋**됩니다.  
  이 과정에서 발생할 수 있는 타이밍 문제(verify 결과가 state에 반영되기 전에 setup 모달이 열릴 수 있음)가 존재합니다.

---

### [M-6] 검색 결과 없을 때 Empty State 메시지가 항상 "검색 결과가 없습니다"로 고정
- **파일**: `components/ItemList.tsx` (Line 82-84)
- **문제**: 아이템이 실제로 없는 경우(첫 사용)와 검색 결과가 없는 경우를 구분하지 않고 동일한 메시지를 표시합니다.  
  (App.tsx에서 아이템이 0개일 때는 Onboarding 화면을 보여주므로 실제 노출 조건은 제한적이나, AI 검색 결과가 0건일 때는 부적절한 메시지가 노출됨)

---

## 🔵 Minor (코드 품질)

---

### [m-1] useItemActions에서 readFileAsDataUrl이 AI 분석에만 사용되나 항상 import
- **파일**: `src/hooks/useItemActions.ts`
- **내용**: `readFileAsDataUrl`이 AI 분석시에만 쓰이는데, 모듈 최상단에 정의되어 있어 의도 파악이 어렵습니다. 주석으로 사용 목적을 명확히 표시해야 합니다.

---

### [m-2] console.log 디버그 로그 다수 잔류
- **파일**: `components/ItemForm.tsx` (Line 107, 118)
- **코드**:
```typescript
console.log(`📷 카메라 촬영 완료 - 슬롯 ${idx}, 자동 저장 중...`);
console.log(`🖼️ 갤러리 사진 선택 - 슬롯 ${idx}, 자동 저장 중...`);
```
- **내용**: 개발용 로그가 프로덕션 빌드에도 그대로 노출됩니다.

---

### [m-3] App.tsx.bak 파일이 프로젝트 루트에 방치
- **파일**: `App.tsx.bak`
- **내용**: 백업용 `.bak` 파일이 그대로 있습니다. `git`이 있으므로 삭제하고 버전 관리로 대체해야 합니다.

---

### [m-4] .rollback 디렉토리가 Git 추적됨
- **경로**: `.rollback/`
- **내용**: 긴급 롤백용으로 만들어진 것으로 보이나, `.gitignore`에 추가하거나 삭제해야 합니다.

---

### [m-5] geminiService.ts 에서 AI 모델이 하드코딩됨
- **파일**: `services/geminiService.ts` (Line 33, 57, 83)
- **코드**:
```typescript
model: 'gemini-1.5-flash', // 3곳에 동일하게 하드코딩
```
- **내용**: 모델 버전을 바꾸려면 3곳을 모두 수정해야 합니다. 상수로 추출 권장.

---

## 📋 수정 우선순위 로드맵

```
1순위 (오늘): [C-1] Blob URL 메모리 누수 해제 코드 추가
2순위 (오늘): [C-4] 백업 복원 시 Supabase 재동기화 구현
3순위 (이번주): [M-1] Signed URL 만료 갱신 로직 추가
4순위 (이번주): [M-4] Dead Code (compressImage) 정리
5순위 (이번주): [M-3] ItemDetail 불필요한 Context 구독 제거
6순위 (여유): [C-2] 익명 인증 → 소셜 로그인으로 마이그레이션
```

---

*이 리포트는 `project_audit_report_2026-03-19.md` 파일에 저장되었습니다.*
