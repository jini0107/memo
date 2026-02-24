# 📦 WhereIsIt (내 물건 어디 있지?)

> **"깜빡하기 쉬운 소중한 물건들, 이제 시크릿 모드로 안전하고 똑똑하게 관리하세요."**

WhereIsIt은 집안이나 사무실의 물건 위치를 사진과 함께 기록하고, 특히 남들에게 보이고 싶지 않은 중요한 물건은 6자리 PIN 번호로 안전하게 숨겨주는 **프리미엄 물건 관리 웹 애플리케이션**입니다.

---

## 🚀 개발 시작하기 (Getting Started)

이 저장소를 기반으로 개발을 시작하거나 환경을 구축하려면 아래 순서를 따르세요.

### 1. 필수 프로그램 설치
- **Node.js**: v18 이상 LTS 버전 ([설치](https://nodejs.org/))
- **Git**: 소스 관리 도구 ([설치](https://git-scm.com/))

### 2. 프로젝트 초기화
```bash
# 저장소 클론
git clone https://github.com/jini0107/memo.git
cd memo

# 패키지 설치
npm install
```

### 3. 환경 변수 설정 (.env)
루트 디렉토리에 `.env` 파일을 생성하고 Supabase API 정보를 입력합니다.
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 데이터베이스 세팅 (Supabase SQL)
앱 동작을 위해 Supabase SQL Editor에서 `supabase_schema.sql`의 내용을 실행하여 테이블을 생성해야 합니다.

### 5. 로컬 실행 및 배포
```bash
# 개발 서버 실행
npm run dev

# 빌드 및 배포 (GitHub Pages)
npm run deploy
```

---

## ✨ 핵심 기능 (Key Features)

### 🔐 강력한 보안 (Secret Mode)
- **시크릿 보관**: 민감한 물건 정보(사진, 장소, 카테고리) 완전 은닉.
- **6자리 PIN 보호**: 아이폰 스타일 보안 시스템 및 실패 시 단계별 잠금 기능.

### 📸 직관적인 기록
- **사진 첨부 및 압축**: 400px 자동 압축으로 모바일 최적화.
- **카테고리 분류**: 스마트한 물건 분류 및 검색.

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React (TypeScript), Vite
- **Styling**: Vanilla CSS (Glassmorphism Design)
- **Backend**: Supabase (Cloud Database)
- **Deployment**: GitHub Pages

---

## � 문서 및 로그
- **[UPDATE_LOG.txt](./UPDATE_LOG.txt)**: 상세 개발 히스토리
- **[senior_developer_tips.txt](./senior_developer_tips.txt)**: 시니어 개발자의 운영 노하우
- **[AGENTS.md](./AGENTS.md)**: 프로젝트 개발 원칙

---

## 👨‍💻 개발자 정보
- **Maintainer**: jini0107
- **Project URL**: [https://jini0107.github.io/memo/](https://jini0107.github.io/memo/)
