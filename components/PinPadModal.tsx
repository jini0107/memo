import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../src/context/StateContext';

interface PinPadModalProps {
    mode: 'setup' | 'verify' | 'change';
    onSuccess: (pin: string, hint?: string) => void;
    onClose: () => void;
    title?: string;
    subTitle?: string;
}

const PinPadModal: React.FC<PinPadModalProps> = ({ mode, onSuccess, onClose, title, subTitle }) => {
    const { state, dispatch } = useContext(AppContext);
    const { config, security } = state;

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [hint, setHint] = useState('');
    // setup 단계: 1.입력 -> 2.확인 -> 3.힌트설정 -> 완료
    const [step, setStep] = useState<'enter' | 'confirm' | 'hint'>('enter');
    const [errorMsg, setErrorMsg] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showHintButton, setShowHintButton] = useState(false);
    const [isHintVisible, setIsHintVisible] = useState(false);

    // 1. 잠금 상태 체크 및 타이머 (1초마다 갱신)
    useEffect(() => {
        const checkLock = () => {
            if (security.lockedUntil && security.lockedUntil > Date.now()) {
                const remaining = Math.ceil((security.lockedUntil - Date.now()) / 1000);
                setTimeLeft(remaining);
            } else if (security.lockedUntil && security.lockedUntil <= Date.now()) {
                // 잠금 시간 종료 -> 잠금만 해제 (실패 횟수는 유지, 아이폰 스타일)
                dispatch({ type: 'RESET_PIN_LOCK' });
                setTimeLeft(0);
            } else {
                setTimeLeft(0);
            }
        };

        checkLock();
        const timer = setInterval(checkLock, 1000);
        return () => clearInterval(timer);
    }, [security.lockedUntil, dispatch]);


    // 2. 숫자 입력 핸들러
    const handleNumberClick = (num: number) => {
        if (timeLeft > 0) return;
        if (step === 'hint') return; // 힌트 입력 중엔 숫자키 무시

        if (pin.length < 6) { // 6자리 제한
            setPin(prev => prev + num);
            setErrorMsg('');
        }
    };

    // 3. 지우기 핸들러
    const handleDelete = () => {
        if (timeLeft > 0) return;
        if (step === 'hint') return;

        setPin(prev => prev.slice(0, -1));
        setErrorMsg('');
    };

    // 4. PIN 검증 및 설정 로직 (6자리 입력 완료 시 자동 실행)
    useEffect(() => {
        if (pin.length === 6) {
            const timer = setTimeout(() => {
                if (mode === 'verify') {
                    verifyPin();
                } else {
                    handleSetup();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [pin]);

    // --- 검증 로직 ---
    const verifyPin = () => {
        if (pin === config.secretPin) {
            dispatch({ type: 'RESET_PIN_FAIL' });
            onSuccess(pin);
        } else {
            handleVerifyFail();
        }
    };

    const handleVerifyFail = () => {
        setIsShaking(true);
        setTimeout(() => {
            setIsShaking(false);
            setPin('');
        }, 400);

        const newFailCount = security.failCount + 1;
        dispatch({ type: 'INCREMENT_PIN_FAIL' });

        // 1회 이상 틀리면 힌트 버튼 노출
        if (newFailCount >= 1 && config.secretHint) {
            setShowHintButton(true);
        }

        // 아이폰 스타일 잠금 규칙
        // 5 (6번째 시도 전): 1분
        // 6 (7번째 시도 전): 5분
        // 7 (8번째 시도 전): 15분
        // 8+ (9번째 시도부터): 60분
        let lockDuration = 0;
        if (newFailCount === 5) lockDuration = 60 * 1000;
        else if (newFailCount === 6) lockDuration = 5 * 60 * 1000;
        else if (newFailCount === 7) lockDuration = 15 * 60 * 1000;
        else if (newFailCount >= 8) lockDuration = 60 * 60 * 1000;

        if (lockDuration > 0) {
            dispatch({ type: 'SET_PIN_LOCKED', payload: Date.now() + lockDuration });
            const minutes = lockDuration / 60000;
            setErrorMsg(`${newFailCount}회 오류! ${minutes}분간 잠깁니다.`);
        } else {
            setErrorMsg(`비밀번호가 일치하지 않습니다 (${newFailCount}회 오류)`);
        }
    };

    // --- 설정 로직 ---
    const handleSetup = () => {
        if (step === 'enter') {
            // 1단계: 처음 입력 -> 2단계(확인) 이동
            setConfirmPin(pin);
            setPin('');
            setStep('confirm');
            setErrorMsg('');
        } else if (step === 'confirm') {
            // 2단계: 확인 입력
            if (pin === confirmPin) {
                // 일치 -> 3단계(힌트 설정) 이동
                setStep('hint');
                setPin(''); // 핀 초기화 (화면 표시용)
                setErrorMsg('');
            } else {
                // 불일치
                setIsShaking(true);
                setTimeout(() => {
                    setIsShaking(false);
                    setPin('');
                }, 400);
                setErrorMsg('비밀번호가 일치하지 않습니다. 처음부터 다시 설정해주세요.');
                setStep('enter');
                setConfirmPin('');
            }
        }
    };

    const handleHintSubmit = () => {
        if (!hint.trim()) {
            setErrorMsg('힌트를 입력해주세요.');
            return;
        }
        // 최종 완료 (PIN은 confirmPin에 저장됨)
        onSuccess(confirmPin, hint);
    };

    // 렌더링 헬퍼
    const getTitle = () => {
        if (timeLeft > 0) return '보안 잠금 🔒';
        if (step === 'hint') return '비밀번호 힌트 설정 💡';
        if (title) return title;
        if (mode === 'verify') return '비밀번호 입력 🔐';
        if (step === 'enter') return '새 비밀번호 설정 🔑';
        return '비밀번호 확인 ✨';
    };

    const getSubTitle = () => {
        if (timeLeft > 0) return `${Math.floor(timeLeft / 60)}분 ${timeLeft % 60}초 후에 다시 시도하세요`;
        if (errorMsg) return errorMsg;
        if (subTitle) return subTitle;
        if (mode === 'setup' && step === 'enter') return '6자리 숫자를 입력하세요';
        if (mode === 'setup' && step === 'confirm') return '한 번 더 입력하세요';
        if (step === 'hint') return '기억을 도울 힌트를 입력하세요';
        return '설정된 6자리 숫자를 입력하세요';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white w-full max-w-[340px] rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up ${isShaking ? 'animate-shake' : ''}`}>

                {/* 헤더 */}
                <div className="pt-8 pb-4 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-surface-50 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                        {timeLeft > 0 ? '😵' : (step === 'hint' ? '💡' : (mode === 'setup' ? '🛡️' : '🔒'))}
                    </div>

                    <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">
                        {getTitle()}
                    </h3>

                    <div className={`text-sm font-medium min-h-[20px] transition-colors ${errorMsg ? 'text-danger-500' : 'text-surface-400'}`}>
                        {getSubTitle()}
                    </div>
                </div>

                {/* 1. 힌트 설정 화면 */}
                {step === 'hint' ? (
                    <div className="px-6 pb-8">
                        <input
                            type="text"
                            className="w-full p-4 bg-surface-50 rounded-xl border-2 border-surface-200 text-center font-bold text-surface-800 mb-4 focus:border-primary-400 focus:outline-none transition-all"
                            placeholder="예: 우리집 강아지 이름"
                            value={hint}
                            onChange={(e) => setHint(e.target.value)}
                            autoFocus
                        />
                        <button
                            onClick={handleHintSubmit}
                            className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold text-lg shadow-lg hover:bg-primary-600 transition-all touch-feedback"
                        >
                            완료
                        </button>
                    </div>
                ) : (
                    /* 2. PIN 입력 화면 */
                    <>
                        {/* PIN Dot Indicator (6자리) */}
                        <div className="flex justify-center gap-3 mb-6 px-4">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${pin.length > i
                                        ? 'bg-primary-500 border-primary-500 scale-100 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                        : 'bg-transparent border-surface-200 scale-90'
                                        }`}
                                ></div>
                            ))}
                        </div>

                        {/* 힌트 보기 버튼 (검증 실패 시 또는 잠금 중일 때 노출) */}
                        {mode === 'verify' && showHintButton && (
                            <div className="text-center mb-4 animate-fade-in">
                                {!isHintVisible ? (
                                    <button
                                        onClick={() => setIsHintVisible(true)}
                                        className="text-primary-500 text-xs font-bold px-3 py-1.5 rounded-full bg-primary-50 hover:bg-primary-100 transition-all"
                                    >
                                        <i className="fas fa-lightbulb mr-1"></i> 힌트 보기
                                    </button>
                                ) : (
                                    <div className="inline-block bg-accent-50 text-accent-600 px-4 py-2 rounded-xl text-sm font-bold border border-accent-100 animate-slide-up-sm">
                                        💡 {config.secretHint || '등록된 힌트가 없습니다'}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 숫자 키패드 */}
                        <div className="grid grid-cols-3 gap-3 px-6 pb-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleNumberClick(num)}
                                    disabled={timeLeft > 0}
                                    className="h-14 rounded-2xl bg-surface-50 text-2xl font-bold text-surface-700 hover:bg-surface-100 active:scale-95 transition-all touch-feedback disabled:opacity-30 disabled:cursor-not-allowed shadow-sm border border-surface-100"
                                >
                                    {num}
                                </button>
                            ))}

                            {/* 하단 행: 취소 - 0 - 지우기 */}
                            <button
                                onClick={onClose}
                                className="h-14 rounded-2xl text-sm font-bold text-surface-400 hover:bg-surface-50 active:scale-95 transition-all"
                            >
                                취소
                            </button>

                            <button
                                onClick={() => handleNumberClick(0)}
                                disabled={timeLeft > 0}
                                className="h-14 rounded-2xl bg-surface-50 text-2xl font-bold text-surface-700 hover:bg-surface-100 active:scale-95 transition-all touch-feedback disabled:opacity-30 shadow-sm border border-surface-100"
                            >
                                0
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={timeLeft > 0}
                                className="h-14 rounded-2xl bg-surface-50 text-surface-400 hover:bg-surface-100 active:scale-95 transition-all flex items-center justify-center touch-feedback disabled:opacity-30 shadow-sm border border-surface-100"
                            >
                                <i className="fas fa-backspace text-lg"></i>
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
        </div>
    );
};

export default PinPadModal;
