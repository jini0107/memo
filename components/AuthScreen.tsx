import React, { useState } from 'react';
import { signIn, signUp } from '../services/authService';

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
                로그인
              </>
            ) : (
              <>
                <i className="fas fa-user-plus" />
                회원가입
              </>
            )}
          </button>
        </form>
      </div>

      {/* 하단 안내 */}
      <p className="relative z-10 mt-6 text-xs text-white/40 font-medium text-center animate-fade-in">
        소중한 데이터는 안전하게 암호화 보관됩니다 🔐
      </p>
    </div>
  );
};

export default AuthScreen;
