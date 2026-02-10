import * as XLSX from 'xlsx';
import { Item } from '../types';

/**
 * [엑셀 데이터 변환 인터페이스]
 * 엑셀 파일의 헤더와 데이터를 한국어로 매핑하기 위한 구조입니다.
 */
interface ExcelItem {
    '이름': string;
    '위치': string;
    '카테고리': string;
    '메모': string;
    '최종 수정일': string;
}

/**
 * [엑셀 내보내기 서비스]
 * 앱의 아이템 데이터를 엑셀 파일(.xlsx)로 변환하여 다운로드합니다.
 */
export const exportItemsToExcel = (items: Item[]): void => {
    try {
        // [방어적 코딩] 데이터가 없을 경우 사용자에게 알림 (console)
        if (!items || items.length === 0) {
            console.warn('내보낼 데이터가 없습니다.');
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        // 1. 데이터 매핑: 기술적 필드명을 사용자 친화적인 한국어 명칭으로 변환
        const excelData: ExcelItem[] = items.map(item => ({
            '이름': item.name,
            '위치': item.locationPath,
            '카테고리': item.category,
            '메모': item.notes.join(', '),
            '최종 수정일': new Date(item.updatedAt).toLocaleString('ko-KR')
        }));

        // 2. 워크시트 생성
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // 3. 열 너비 자동 조절 (기본적인 가독성 확보)
        const columnWidths = [
            { wch: 20 }, // 이름
            { wch: 30 }, // 위치
            { wch: 15 }, // 카테고리
            { wch: 40 }, // 메모
            { wch: 25 }, // 최종 수정일
        ];
        worksheet['!cols'] = columnWidths;

        // 4. 워크북 생성 및 파일 저장
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '보관 물품 목록');

        // 파일명에 날짜를 포함하여 중복 방지 및 식별 용이하게 설정
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `MemoryWhisp_Items_${dateStr}.xlsx`);

        console.log('[Success] 엑셀 파일 다운로드 완료');
    } catch (error) {
        // [디버깅 교육] 에러 로그를 남겨 문제 해결을 도움
        console.error('엑셀 내보내기 중 오류 발생:', error);
        alert('엑셀 파일 생성 중 오류가 발생했습니다.');
    }
};
