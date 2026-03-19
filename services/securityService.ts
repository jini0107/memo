const HASH_PREFIX = 'sha256:';

const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * 6자리 PIN을 SHA-256 해시 문자열로 변환합니다.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const encodedPin = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', encodedPin);
  return `${HASH_PREFIX}${arrayBufferToHex(digest)}`;
};

/**
 * 현재 저장된 PIN 문자열이 해시 포맷인지 판별합니다.
 */
export const isHashedPin = (storedPin?: string): boolean => {
  return typeof storedPin === 'string' && storedPin.startsWith(HASH_PREFIX);
};

/**
 * 입력된 PIN과 저장된 PIN(평문 레거시/해시 모두 허용)을 비교합니다.
 */
export const verifyPin = async (inputPin: string, storedPin?: string): Promise<boolean> => {
  if (!storedPin) {
    return false;
  }

  if (isHashedPin(storedPin)) {
    return hashPin(inputPin).then((hashedPin) => hashedPin === storedPin);
  }

  return inputPin === storedPin;
};
