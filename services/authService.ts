import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * 이메일/비밀번호 회원가입
 * - Supabase가 이메일 인증 메일을 자동 발송합니다.
 * - 이메일 인증 없이 바로 로그인하려면 Supabase 대시보드에서
 *   "Confirm email" 옵션을 OFF로 설정하세요.
 */
export const signUp = async (
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Sign up failed:', error);
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
};

/**
 * 이메일/비밀번호 로그인
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Sign in failed:', error);
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
};

/**
 * 로그아웃
 */
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out failed:', error);
  }
};

/**
 * 현재 세션의 사용자 정보 조회
 * - 앱 초기화 시 이미 로그인되어 있는지 확인하는 데 사용합니다.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to get session:', error);
    return null;
  }

  return data.session?.user ?? null;
};
