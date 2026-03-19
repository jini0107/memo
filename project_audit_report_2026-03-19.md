# WhereIsIt 종합 분석 보고서

작성일: 2026-03-19
프로젝트: C:\Users\JM2\memo

## 1. 요약
- 프론트엔드 단일 페이지 앱으로 React 19 + TypeScript + Vite 기반입니다.
- 핵심 기능은 물건 등록/검색, 이미지 첨부, Gemini 기반 AI 보조, Supabase 동기화, PIN 기반 시크릿 아이템 보호입니다.
- 현재 가장 큰 리스크는 보안 정책, 시크릿 데이터 일관성, 로컬/클라우드 동기화 설계, 거대한 App 컴포넌트 구조입니다.

## 2. 우선 수정이 필요한 문제
### Critical
1. Supabase RLS가 전체 공개 상태입니다.
   - 근거: supabase_schema.sql 15-21
   - 영향: 인증 없는 읽기/쓰기/삭제가 모두 가능합니다.
2. 시크릿 여부가 DB에 저장되지 않습니다.
   - 근거: services/supabaseService.ts 17-25, 28-39, 47-58
   - 영향: 새로고침/다른 기기/복원 이후 시크릿 아이템 보호가 사라집니다.
3. PIN과 힌트가 localStorage에 평문 저장됩니다.
   - 근거: src/context/StateContext.tsx 234-235, 305-309
   - 영향: 브라우저 접근만 가능하면 바로 노출됩니다.
4. 실제 API 키가 .env에 존재합니다.
   - 근거: .env 1-3
   - 영향: 실수로 커밋되면 외부 사용 및 비용/보안 문제가 생깁니다.

### Major
5. 백업 복원 데이터가 클라우드와 재동기화되지 않습니다.
   - 근거: App.tsx 376-395
   - 영향: 복원 직후에는 보이지만 다음 Supabase fetch나 다른 기기에서 다시 원복될 수 있습니다.
6. 백업 포맷이 시크릿 정보를 보존하지 않습니다.
   - 근거: services/dataService.ts 55-65
   - 영향: isSecret이 유실됩니다.
7. 이미지가 Base64로 state/localStorage/DB에 직접 저장됩니다.
   - 근거: App.tsx 231-257, services/supabaseService.ts 36, 54, src/context/StateContext.tsx 288
   - 영향: 용량 급증, 성능 저하, localStorage quota 초과, DB row 비대화가 발생합니다.
8. App.tsx에 화면, 상태 흐름, CRUD, AI, 보안, import/export가 집중되어 있습니다.
   - 근거: App.tsx 전체 808라인
   - 영향: 테스트 어려움, 회귀 위험 증가, 기능 추가 속도 저하.

### Minor
9. 디버그 로그가 reducer에 남아 있습니다.
   - 근거: src/context/StateContext.tsx 140-144
10. package.json에 lint/test 스크립트가 없습니다.
   - 근거: package.json 6-12
11. Supabase 환경변수 키 이름이 README와 구현 간 불일치합니다.
   - 근거: README.md 30-31, services/supabaseClient.ts 3-4, .env 1-2

## 3. 구조 분석
- App.tsx: 사용자 흐름 대부분을 직접 제어하는 God Object 성격입니다.
- StateContext.tsx: 전역 상태와 localStorage 책임이 함께 들어 있어 상태 관리와 영속성 책임이 섞여 있습니다.
- services 계층은 분리되어 있지만 데이터 계약이 완전하지 않습니다. 특히 Item.isSecret와 백업/DB 스키마가 맞지 않습니다.
- UI 컴포넌트 분리는 되어 있으나 business logic이 App.tsx에 치우쳐 재사용성이 낮습니다.

## 4. 추천 리팩토링 순서
1. 데이터 모델 정합성 확보
   - Item, Supabase schema, backup schema에 isSecret 반영
   - import/export도 동일 계약 유지
2. 보안 정리
   - RLS 재설계
   - PIN 평문 저장 제거 또는 최소한 해시/보안 저장 전략 검토
3. 이미지 저장 구조 변경
   - Base64 대신 Supabase Storage + public/signed URL 구조로 전환
4. App.tsx 분해
   - useItems
   - useItemForm
   - usePinSecurity
   - useAiAssist
   - useImportExport
5. 품질 체계 추가
   - ESLint
   - 최소 단위 테스트
   - 빌드 전 타입체크/린트 강제

## 5. 추천 기능
- 사용자 계정 기반 개인 데이터 분리
- 태그 시스템과 다중 필터 검색
- 최근 본 항목/즐겨찾기/핀 고정
- 분실 방지용 보관 위치 히스토리
- 사진 OCR 기반 문서/영수증 검색
- 만료일/보증기간 리마인더
- 클라우드 동기화 상태 표시 및 충돌 해결 UI
- 휴지통(soft delete) 기능
- 이미지 업로드 진행률 및 압축 상태 표시
- 데이터 사용량 대시보드

## 6. 바로 실행 가능한 개선 체크리스트
- [ ] Supabase 정책을 사용자 단위 정책으로 교체
- [ ] items 테이블에 is_secret 컬럼 추가
- [ ] 백업/복원 포맷에 isSecret 포함
- [ ] PIN/힌트 저장 방식 개선
- [ ] Base64 저장 제거 및 Storage 연동
- [ ] App.tsx 훅/컨테이너 단위로 분해
- [ ] lint/test/build 스크립트 추가
- [ ] 오류 메시지와 사용자 알림 체계 정리

## 7. 결론
현재 프로젝트는 아이디어와 UI 완성도는 좋지만, 운영 단계로 가기 전에 보안과 데이터 일관성을 먼저 정리해야 합니다. 우선순위는 RLS, 시크릿 데이터 모델, PIN 저장 방식, Base64 저장 구조 개선입니다.
