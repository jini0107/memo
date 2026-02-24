# 📦 WhereIsIt (내 물건 어디 있지?)

> **"깜빡하기 쉬운 소중한 물건들, 이제 시크릿 모드로 안전하고 똑똑하게 관리하세요."**

WhereIsIt은 집안이나 사무실의 물건 위치를 사진과 함께 기록하고, 특히 남들에게 보이고 싶지 않은 중요한 물건은 6자리 PIN 번호로 안전하게 숨겨주는 **프리미엄 물건 관리 웹 애플리케이션**입니다.

---

## ✨ 핵심 기능 (Key Features)

### 🔐 강력한 보안 (Secret Mode)
- **시크릿 보관**: 민감한 물건 정보(사진, 장소, 카테고리)를 목록에서 완전히 은닉합니다.
- **6자리 PIN 보호**: 아이폰 스타일의 보안 잠금 시스템을 통해 나만 내용을 확인할 수 있습니다.
- **단계별 잠금 (Auto-Lock)**: PIN 입력 실패 시 1분부터 최대 1시간까지 점진적으로 접근을 차단하여 보안을 강화합니다.

### 📸 직관적인 기록
- **사진 첨부**: 카메라로 찍거나 갤러리에서 선택하여 물건의 위치를 직관적으로 저장합니다.
- **이미지 최적화**: 모바일 환경을 고려하여 고화질 사진을 400px 수준으로 자동 압축, 로딩 속도를 극대화했습니다.
- **카테고리 분류**: 물건의 성격에 따라 스마트하게 분류하고 검색할 수 있습니다.

### ☁️ 실시간 동기화
- **Supabase 연동**: 클라우드 DB를 통해 여러 기기에서도 동일한 데이터를 안전하게 확인할 수 있습니다.
- **오프라인 우선**: 네트워크가 불안정한 상황에서도 로컬 저장소를 활용해 안정적으로 동작합니다.

---

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React (TypeScript), Vite
- **Styling**: Vanilla CSS (Premium Glassmorphism Design)
- **Backend / DB**: Supabase
- **Deployment**: GitHub Pages

---

## 🚀 시작하기 (Getting Started)

### 사전 준비 사항
- Node.js (v18 이상 권장)
- npm 또는 yarn

### 설치 및 실행
1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/jini0107/memo.git
   ```
2. 의존성 패키지를 설치합니다.
   ```bash
   npm install
   ```
3. 환경 변수를 설정합니다. (`.env` 파일 생성)
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. 개발 서버를 실행합니다.
   ```bash
   npm run dev
   ```

---

## 👨‍💻 개발자 정보
- **Maintainer**: jini0107
- **Project URL**: [https://jini0107.github.io/memo/](https://jini0107.github.io/memo/)

---

## 📄 업데이트 로그
자세한 개발 히스토리는 [UPDATE_LOG.txt](./UPDATE_LOG.txt)에서 확인할 수 있습니다.
