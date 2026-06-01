import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, Availability, ShiftCondition, shiftTypeConfig } from '../app/types';
import { format, getDaysInMonth, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PDFGeneratorOptions {
  year: number;
  month: number;
  half: 'first' | 'second';
  employees: Employee[];
  availabilities: Availability[];
  dailyNotes: { [key: string]: string };
  monthlyProcedure: string;
  shiftCondition: ShiftCondition | null;
}

export function generateShiftPDF(options: PDFGeneratorOptions) {
  const { year, month, half, employees, availabilities, dailyNotes, monthlyProcedure, shiftCondition } = options;

  // A4横向き
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // 日本語フォント設定（デフォルトフォントを使用）
  doc.setFont('helvetica');

  // 従業員を12人ずつに分割
  const sortedEmployees = [...employees].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).slice(0, 15);
  const pageCount = Math.ceil(sortedEmployees.length / 12);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (pageIndex > 0) {
      doc.addPage();
    }

    const startIndex = pageIndex * 12;
    const pageEmployees = sortedEmployees.slice(startIndex, startIndex + 12);

    // タイトル
    doc.setFontSize(14);
    doc.text(
      `${year}年${month}月${half === 'first' ? '前半' : '後半'}シフト管理表 [Ver 2.0]${
        pageCount > 1 ? ` (${pageIndex + 1}/${pageCount})` : ''
      }`,
      14,
      15
    );

    // 凡例
    doc.setFontSize(8);
    doc.text('凡例: ◉ かりんとう  ◆ カフェ', 14, 22);

    // 印刷日
    doc.setFontSize(9);
    doc.text(`印刷日: ${format(new Date(), 'yyyy年M月d日', { locale: ja })}`, 250, 15);

    // 日付範囲を取得
    const printDays = getPrintDays(year, month, half);

    // テーブルデータを準備
    const tableHeaders = [
      '日付',
      ...Array.from({ length: 12 }, (_, i) => {
        const emp = pageEmployees[i];
        return emp ? emp.name : '-';
      }),
      '備考',
    ];

    const tableData = printDays.map((day) => {
      const dateStr = `${day.getDate()}日(${format(day, 'E', { locale: ja })})`;
      const requiredStaff = getRequiredStaffCount(day, shiftCondition);
      const approvedCount = getApprovedShiftsCountForDate(day, employees, availabilities);
      const dateCell = `${dateStr}\n[${approvedCount}/${requiredStaff}]`;

      const employeeCells = Array.from({ length: 12 }, (_, i) => {
        const emp = pageEmployees[i];
        if (!emp) return '';

        const shifts = getConfirmedShiftsForEmployeeAndDate(emp.id, day, availabilities);
        return shifts
          .map((shift) => {
            const icon = shift.shiftType === 'karintou' ? '◉' : '◆';
            return `${icon}${shift.startTime}-${shift.endTime}`;
          })
          .join('\n');
      });

      const noteCell = dailyNotes[day.toISOString()] || '';

      return [dateCell, ...employeeCells, noteCell];
    });

    // テーブルを描画
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineColor: [153, 153, 153],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        13: { cellWidth: 20 },
      },
      didParseCell: (data) => {
        // 土日・祝日の背景色
        if (data.section === 'body' && data.column.index > 0 && data.column.index < 13) {
          const rowIndex = data.row.index;
          const day = printDays[rowIndex];
          if (day && (isSunday(day) || isSaturday(day) || isHoliday(day, shiftCondition))) {
            data.cell.styles.fillColor = [254, 226, 226];
          }
        }
      },
    });

    // 業務手順セクション
    if (monthlyProcedure) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(8);
      doc.setFillColor(240, 253, 244);
      doc.rect(14, finalY + 5, 267, 20, 'F');
      doc.setDrawColor(16, 185, 129);
      doc.rect(14, finalY + 5, 267, 20);
      doc.setFontSize(8);
      doc.text('📋 業務手順', 16, finalY + 10);
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(monthlyProcedure, 260);
      doc.text(lines.slice(0, 3), 16, finalY + 15);
    }
  }

  // PDFをダウンロード
  const filename = `シフト管理表_${year}年${month}月_${half === 'first' ? '前半' : '後半'}_Ver2.0.pdf`;
  doc.save(filename);
}

// ヘルパー関数
function getPrintDays(year: number, month: number, half: 'first' | 'second'): Date[] {
  const startDay = half === 'first' ? 1 : 16;
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const endDay = half === 'first' ? 15 : daysInMonth;

  const days: Date[] = [];
  for (let day = startDay; day <= endDay; day++) {
    days.push(new Date(year, month - 1, day));
  }
  return days;
}

function getConfirmedShiftsForEmployeeAndDate(
  employeeId: string,
  date: Date,
  availabilities: Availability[]
) {
  return availabilities.filter(
    (availability) =>
      availability.employeeId === employeeId &&
      isSameDay(new Date(availability.date), date) &&
      availability.status === 'approved'
  );
}

function getApprovedShiftsCountForDate(
  date: Date,
  employees: Employee[],
  availabilities: Availability[]
): number {
  let count = 0;
  employees.forEach((employee) => {
    const shifts = availabilities.filter(
      (availability) =>
        availability.employeeId === employee.id && isSameDay(new Date(availability.date), date)
    );
    if (shifts.length > 0) {
      count += 1;
    }
  });
  return count;
}

function getRequiredStaffCount(date: Date, shiftCondition: ShiftCondition | null): number {
  if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return 0;

  const key = `${date.getMonth() + 1}/${date.getDate()}`;

  // セールイベント
  const springSaleRow = shiftCondition.rows.find((row) => row.type === 'springSale');
  if (springSaleRow && springSaleRow.dates.includes(key)) {
    return springSaleRow.requiredStaff;
  }

  const summerSaleRow = shiftCondition.rows.find((row) => row.type === 'summerSale');
  if (summerSaleRow && summerSaleRow.dates.includes(key)) {
    return summerSaleRow.requiredStaff;
  }

  const winterSaleRow = shiftCondition.rows.find((row) => row.type === 'winterSale');
  if (winterSaleRow && winterSaleRow.dates.includes(key)) {
    return winterSaleRow.requiredStaff;
  }

  // 祝日
  if (isHoliday(date, shiftCondition)) {
    const holidayRow = shiftCondition.rows.find((row) => row.type === 'holiday');
    return holidayRow ? holidayRow.requiredStaff : 0;
  }

  // 曜日
  const dayOfWeek = date.getDay();
  const dayTypeMap: { [key: number]: string } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const dayType = dayTypeMap[dayOfWeek];
  const row = shiftCondition.rows.find((r) => r.type === dayType);
  return row ? row.requiredStaff : 0;
}

function isHoliday(date: Date, shiftCondition: ShiftCondition | null): boolean {
  if (!shiftCondition || shiftCondition.year !== date.getFullYear()) return false;
  const holidayRow = shiftCondition.rows.find((row) => row.type === 'holiday');
  const key = `${date.getMonth() + 1}/${date.getDate()}`;
  return holidayRow ? holidayRow.dates.includes(key) : false;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}
