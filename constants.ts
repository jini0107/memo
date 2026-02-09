import { Category } from './types';

export const LOCATION_TYPES = ['집', '사무실', '디지털저장소', '기타'];

export const HOME_LOCATIONS = [
  '거실', '안방', '작은방1', '작은방2', '작은방3', '부엌', '화장실', '베란다'
];

export const OFFICE_LOCATIONS = [
  '내책상', '창고', '탕비실', '기타'
];

export const DIGITAL_LOCATIONS = [
  '구글드라이브', '네이버MYBOX', 'USB', '외장하드', '원드라이브', 'PC바탕화면', 'PC내문서', '카카오톡', '이메일', '기타'
];

export const CATEGORIES = Object.values(Category);
