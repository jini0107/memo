
import { Item } from '../types';

/**
 * 백업 데이터의 구조를 정의합니다.
 */
export interface BackupData {
    items: Item[];
    config: {
        locTypes: string[];
        homeLocs: string[];
        officeLocs: string[];
        digitalLocs: string[];
        categories: string[];
    };
    version: number;
    exportedAt: string;
}

/**
 * 데이터의 정합성을 검증하고 보정하는 서비스입니다.
 */
export const dataService = {
    /**
     * JSON 데이터를 파일로 내보냅니다.
     */
    exportToJson: (data: Omit<BackupData, 'exportedAt'>) => {
        const fullData: BackupData = {
            ...data,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whereisit_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('데이터 백업 완료:', fullData.exportedAt);
    },

    /**
     * 복원할 데이터의 유효성을 검사합니다. (방어적 코딩)
     */
    validateAndSanitize: (rawData: any): BackupData | null => {
        try {
            // 1. 기본 구조 검사
            if (!rawData || typeof rawData !== 'object') return null;
            if (!Array.isArray(rawData.items)) return null;

            const sanitizedItems: Item[] = rawData.items.map((item: any) => {
                // 2. 개별 아이템 필드 검증 및 기본값 부여
                return {
                    id: item.id || Date.now().toString() + Math.random(),
                    name: item.name || '이름 없음',
                    locationPath: item.locationPath || '위치 미지정',
                    category: item.category || '기타',
                    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
                    notes: Array.isArray(item.notes) ? item.notes : [],
                    updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now()
                };
            });

            // 3. 설정 데이터 검증
            const config = rawData.config || {};
            const sanitizedConfig = {
                locTypes: Array.isArray(config.locTypes) ? config.locTypes : [],
                homeLocs: Array.isArray(config.homeLocs) ? config.homeLocs : [],
                officeLocs: Array.isArray(config.officeLocs) ? config.officeLocs : [],
                digitalLocs: Array.isArray(config.digitalLocs) ? config.digitalLocs : [],
                categories: Array.isArray(config.categories) ? config.categories : []
            };

            return {
                items: sanitizedItems,
                config: sanitizedConfig,
                version: rawData.version || 1,
                exportedAt: rawData.exportedAt || new Date().toISOString()
            };
        } catch (error) {
            console.error('데이터 검증 중 오류 발생:', error);
            return null;
        }
    }
};
