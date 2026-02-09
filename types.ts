
export interface Location {
  id: string;
  name: string; // e.g., "안방", "창고", "클라우드"
  parentId?: string; // 계층 구조 (ex: 안방 > 세 번째 서랍)
}

export interface Item {
  id: string;
  name: string;
  locationId: string;
  locationPath: string; // "안방 > 세 번째 서랍" 처럼 표시용
  category: string;
  imageUrls: string[]; // 최대 2장까지 저장
  description?: string;
  tags: string[];
  updatedAt: number;
}

export enum Category {
  DOCUMENT = '서류/문서',
  ELECTRONICS = '가전/IT',
  CLOTHING = '의류/패션',
  HOUSEHOLD = '생활용품',
  DIGITAL = '디지털 정보',
  OTHER = '기타'
}
