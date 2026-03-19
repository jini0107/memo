import React, { useState } from 'react';
import { signIn, signUp, signInWithGoogle } from '../services/authService';

interface AuthScreenProps {
  /** 로그인/회원가입 성공 시 호출되는 콜백 */
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

/**
 * AuthScreen 컴포넌트
 * - 이메일/비밀번호 기반 로그인 및 회원가입 화면
 * - 프리미엄 글래스모피즘 디자인 적용
 */
const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /** 에러 메시지를 한국어로 변환합니다. */
  const translateError = (message: string): string => {
    if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
    if (message.includes('User already registered')) return '이미 가입된 이메일 주소입니다.';
    if (message.includes('Password should be at least')) return '비밀번호는 최소 6자 이상이어야 합니다.';
    if (message.includes('Unable to validate email')) return '올바른 이메일 형식을 입력해주세요.';
    if (message.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 수신함을 확인해주세요.';
    return `오류가 발생했습니다: ${message}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 회원가입 시 비밀번호 확인
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { user, error } = await signIn(email, password);
        if (error) {
          setErrorMessage(translateError(error));
          return;
        }
        if (user) {
          onAuthSuccess();
        }
      } else {
        const { user, error } = await signUp(email, password);
        if (error) {
          setErrorMessage(translateError(error));
          return;
        }
        if (user) {
          // 이메일 인증이 필요한 경우 안내 메시지 표시
          if (!user.confirmed_at) {
            setSuccessMessage('가입 완료! 이메일 수신함에서 인증 링크를 클릭하세요.\n인증 후 로그인해주세요.');
            setMode('login');
          } else {
            // 이메일 인증 없이 바로 가입 완료된 경우 (Supabase 설정에 따라)
            onAuthSuccess();
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setErrorMessage('');
    setSuccessMessage('');
    setConfirmPassword('');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center safe-top safe-bottom px-6"
      style={{ background: 'linear-gradient(160deg, #6366f1 0%, #818cf8 35%, #a78bfa 70%, #c4b5fd 100%)' }}
    >
      {/* 배경 장식 원형들 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-72 h-72 rounded-full bg-white/[0.06]" style={{ top: '-10%', left: '-15%' }} />
        <div className="absolute w-96 h-96 rounded-full bg-white/[0.04]" style={{ bottom: '-20%', right: '-20%' }} />
        <div className="absolute w-40 h-40 rounded-full bg-white/[0.06]" style={{ top: '15%', right: '5%' }} />
      </div>

      {/* 로고 영역 */}
      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-4 shadow-xl">
          <span className="text-4xl">📍</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-1">어딨더라</h1>
        <p className="text-sm font-semibold text-white/70 text-center">
          물건 위치를 스마트하게 관리하세요
        </p>
      </div>

      {/* 카드 */}
      <div
        className="relative z-10 w-full max-w-sm animate-slide-up"
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          padding: '2rem',
        }}
      >
        {/* 탭 */}
        <div className="flex bg-white/10 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => mode !== 'login' && toggleMode()}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'login'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => mode !== 'signup' && toggleMode()}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === 'signup'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 */}
          <div>
            <label className="block text-xs font-bold text-white/80 mb-1.5">
              이메일
            </label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium placeholder-white/30 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-xs font-bold text-white/80 mb-1.5">
              비밀번호 <span className="text-white/40 font-normal">(6자 이상)</span>
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium placeholder-white/30 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                }}
              />
            </div>
          </div>

          {/* 비밀번호 확인 (회원가입 시만) */}
          {mode === 'signup' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-white/80 mb-1.5">
                비밀번호 확인
              </label>
              <div className="relative">
                <i className="fas fa-lock-open absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium placeholder-white/30 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                  }}
                />
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 rounded-xl px-3.5 py-3 animate-fade-in">
              <i className="fas fa-exclamation-circle text-red-300 text-sm mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-red-200 leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* 성공 메시지 */}
          {successMessage && (
            <div className="flex items-start gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3.5 py-3 animate-fade-in">
              <i className="fas fa-check-circle text-emerald-300 text-sm mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-emerald-200 leading-relaxed whitespace-pre-line">{successMessage}</p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm transition-all touch-feedback active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'white', color: '#6366f1' }}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                처리 중...
              </>
            ) : mode === 'login' ? (
              <>
                <i className="fas fa-sign-in-alt" />
                이메일로 로그인
              </>
            ) : (
              <>
                <i className="fas fa-user-plus" />
                이메일로 회원가입
              </>
            )}
          </button>
        </form>

        {/* 소셜 로그인 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">or continue with</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={async () => {
            setIsLoading(true);
            try {
              await signInWithGoogle();
            } catch (error: any) {
              setErrorMessage(translateError(error?.message || '구글 로그인 중 오류가 발생했습니다.'));
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all touch-feedback active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google 계정으로 {mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </div>

      {/* 하단 안내 */}
      <p className="relative z-10 mt-6 text-xs text-white/40 font-medium text-center animate-fade-in">
        소중한 데이터는 안전하게 암호화 보관됩니다 🔐
      </p>
    </div>
  );
};

export default AuthScreen;
