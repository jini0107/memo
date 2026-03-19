import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * [C-3 Fix] define 블록 및 수동 loadEnv 제거
 *
 * 기존 문제:
 * - define 블록에서 VITE_GEMINI_API_KEY만 수동 교체 → Supabase 환경변수 누락 위험
 * - loadEnv(mode, '.', '') 의 세 번째 인자 ''가 VITE_ 접두어 없는 시스템 변수까지
 *   전부 불러와서 보안 위험 발생 가능
 *
 * 해결 방침:
 * - Vite는 .env 파일의 VITE_ 접두어 변수를 빌드/개발 시 자동으로 import.meta.env에 노출
 * - 별도의 define이나 loadEnv 없이도 VITE_GEMINI_API_KEY, VITE_SUPABASE_URL,
 *   VITE_SUPABASE_ANON_KEY 모두 정상 동작
 * - 표준 Vite 방식을 따르는 것이 가장 안전하고 유지보수하기 쉬움
 */
export default defineConfig({
  base: '/memo/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
