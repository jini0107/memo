# 🛠 Project Setup & Development Guide (초기 세팅 및 개발 가이드)

프로젝트를 새로 시작하거나, 다른 환경에서 개발을 이어갈 때 헷갈리지 않도록 모든 초기 세팅 과정을 정리한 문서입니다.

## 1. 필수 프로그램 설치 (Prerequisites)
개발을 시작하기 전, 아래 프로그램들이 설치되어 있어야 합니다.
- **Node.js**: [공식 사이트](https://nodejs.org/)에서 LTS 버전 설치 (v18+ 권장)
- **Git**: [공식 사이트](https://git-scm.com/)에서 설치
- **VS Code**: 추천 확장 프로그램 (Extensions)
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - GitLens

---

## 2. 프로젝트 초기화 및 도구 설치
새로운 프로젝트 폴더를 만들고 아래 명령어를 순서대로 실행합니다.

```bash
# 1. Vite 프로젝트 생성 (React + TypeScript)
npx creator-vite@latest ./ --template react-ts

# 2. 필수 라이브러리 설치
npm install

# 3. Supabase 클라이언트 설치 (데이터베이스 연동 시)
npm install @supabase/supabase-js

# 4. 배포용 도구 설치 (GitHub Pages 사용 시)
npm install gh-pages --save-dev
```

---

## 3. 환경 변수 설정 (.env)
보안이 필요한 API 키는 코드에 직접 넣지 않고 반드시 `.env` 파일에 보관합니다.
프로젝트 루트에 `.env` 파일을 만들고 아래 내용을 채웁니다.

```env
# Supabase 설정 (Dashboard > Project Settings > API에서 확인)
VITE_SUPABASE_URL=당신의_주소
VITE_SUPABASE_ANON_KEY=당신의_키

# .gitignore 파일에 반드시 .env를 추가하여 GitHub에 노출되지 않게 하세요!
```

---

## 4. 데이터베이스 세팅 (Supabase SQL)
이 앱이 정상 동작하려면 Supabase SQL Editor에서 아래 테이블 아티팩트를 실행해야 합니다.
(현재 `supabase_schema.sql` 파일에 저장되어 있습니다.)

```sql
-- 아이템 테이블 생성 예시
CREATE TABLE items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  category TEXT,
  image_url TEXT,
  is_secret BOOLEAN DEFAULT false,
  pin TEXT,
  hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. 배포 프로세스 (GitHub Pages)
수정한 내용을 실제 사이트에 반영하는 방법입니다.

```bash
# 1. 빌드 및 배포 실행
npm run deploy

# 2. 소스 코드 커밋 및 푸시
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

---

## 6. 개발 원칙 및 팁
- **커밋 메시지**: `feat:`(기능), `fix:`(버그 수정), `docs:`(문서) 머리말을 사용하세요.
- **이미지**: 모바일 성능을 위해 업로드 전 반드시 압축 로직을 거치게 하세요. (현재 400px 압축 적용 중)
- **보안**: PIN 입력 등 민감한 정보는 `localStorage`와 `Supabase` 양쪽에 안전하게 동기화하세요.

---

## 7. 문제 해결 (FAQ)
- **Q: npm run dev가 안 돼요!**
  - A: `node_modules` 폴더를 지우고 `npm install`을 다시 실행해 보세요.
- **Q: Supabase 데이터가 안 불러와져요!**
  - A: `.env` 파일의 URL과 키가 정확한지, 인터넷 연결이 되어 있는지 확인하세요.
