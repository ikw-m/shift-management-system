import ExcelJS from 'exceljs';
import { format, getDaysInMonth } from 'date-fns';
import { ja } from 'date-fns/locale';

const pxW  = (px: number) => px / 8;
const pxH  = (px: number) => px * 0.75;
const cmIn = (cm: number) => cm / 2.54;

const C = {
  karintouBg:    'FF78350F',
  karintouFont:  'FFFFFFFF',
  cafeBg:        'FFFFC72C',
  cafeFont:      'FFFFFFFF',
  saturdayBg:    'FFEFF6FF',
  saturdayFont:  'FF3B82F6',
  sundayBg:      'FFFFF0F0',
  sundayFont:    'FFEF4444',
  saleBg:        'FFFFFF66',
  saleFont:      'FF15803D',
  weekdayFont:   'FF000000',
  titleBg:       'FF4F46E5',
  titleFont:     'FFFFFFFF',
  headerBg:      'FF059669',
  headerFont:    'FFFFFFFF',
  procTitleBg:   'FFECFDF5',
  procTitleFont: 'FF065F46',
  procBg:        'FFFFFBEB',
  legendFont:    'FF6B7280',
  notesBg:       'FFFFFBEB',
  borderGray:    'FF9CA3AF',
  borderWhite:   'FFFFFFFF',
} as const;

function mkBorder(style: 'thin' | 'medium', argb: string): ExcelJS.Border {
  return { style, color: { argb } } as ExcelJS.Border;
}

const bGray  = mkBorder('thin',   C.borderGray);
const bMed   = mkBorder('medium', C.borderGray);
const bWhite = mkBorder('thin',   C.borderWhite);

function stdBorder(cell: ExcelJS.Cell, rightWhite = false) {
  cell.border = {
    top:    bGray,
    left:   bGray,
    bottom: bGray,
    right:  rightWhite ? bWhite : bGray,
  };
}

function applyOuterBorder(
  sheet: ExcelJS.Worksheet,
  startRow: number, endRow: number,
  startCol: number, endCol: number,
) {
  for (let c = startCol; c <= endCol; c++) {
    const t = sheet.getCell(startRow, c);
    t.border = { ...t.border, top: bMed };
    const b = sheet.getCell(endRow, c);
    b.border = { ...b.border, bottom: bMed };
  }
  for (let r = startRow; r <= endRow; r++) {
    const l = sheet.getCell(r, startCol);
    l.border = { ...l.border, left: bMed };
    const rr = sheet.getCell(r, endCol);
    rr.border = { ...rr.border, right: bMed };
  }
}

function fillCell(cell: ExcelJS.Cell, argb: string | null) {
  if (argb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  }
}

// centerContinuous alignment (no wrapText)
const alignCenter: Partial<ExcelJS.Alignment> = {
  horizontal: 'centerContinuous',
  vertical: 'middle',
};

// centerContinuous with wrapText (date cells only)
const alignCenterWrap: Partial<ExcelJS.Alignment> = {
  horizontal: 'centerContinuous',
  vertical: 'middle',
  wrapText: true,
};

export interface ShiftExcelEmployee {
  id: string;
  name: string;
  color: string;
}

export interface ShiftExcelShift {
  id: string;
  startTime: string;
  endTime: string;
  shiftType: 'karintou' | 'cafe';
}

export interface ShiftExcelParams {
  departmentName: string;
  year: number;
  month: number;
  sortedEmployees: ShiftExcelEmployee[];
  getConfirmedShifts: (employeeId: string, date: Date) => ShiftExcelShift[];
  getRequiredStaffCount: (date: Date) => number;
  getApprovedCount: (date: Date) => number;
  isHoliday: (date: Date) => boolean;
  isSaleDay: (date: Date) => boolean;
  dailyNotes: { [isoKey: string]: string };
  noteText: string;
}

const PAGE_COLS        = 26;
const MAX_EMP_PER_PAGE = 12;

// Convert column index (1-based) to Excel column letter(s)
function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function getDayStyle(date: Date, isHol: boolean, isSale: boolean) {
  const dow      = date.getDay();
  const isSunHol = isHol || dow === 0;
  const isSat    = dow === 6;
  // Font: always day-based (sale does not change font color)
  const font = isSunHol ? C.sundayFont : isSat ? C.saturdayFont : C.weekdayFont;
  // Background: sale overrides ALL day types (including Sunday/holiday)
  const bg   = isSale ? C.saleBg : isSunHol ? C.sundayBg : isSat ? C.saturdayBg : null;
  return { bg, font };
}

function addHalfSheet(
  workbook: ExcelJS.Workbook,
  half: 'first' | 'second',
  p: ShiftExcelParams,
) {
  const halfLabel = half === 'first' ? '前半' : '後半';
  const sheetName = halfLabel;
  const sheet = workbook.addWorksheet(sheetName);

  const numEmp   = Math.min(p.sortedEmployees.length, MAX_EMP_PER_PAGE * 2);
  const numPages = Math.max(1, Math.ceil(numEmp / MAX_EMP_PER_PAGE));

  // Days for this half
  const startDay = half === 'first' ? 1 : 16;
  const endDay   = half === 'first' ? 15 : getDaysInMonth(new Date(p.year, p.month - 1));
  const days: Date[] = [];
  for (let d = startDay; d <= endDay; d++) {
    days.push(new Date(p.year, p.month - 1, d));
  }

  // Dynamic row positions based on actual number of days
  const numDataRows   = days.length;
  const firstDataRow  = 4;
  const lastDataRow   = firstDataRow + numDataRows - 1;
  const spacerRow     = lastDataRow + 1;
  const procTitleRow  = spacerRow + 1;
  const procTextRow1  = spacerRow + 2;
  const procTextRow2  = spacerRow + 3;
  const procTextRow3  = spacerRow + 4;
  const lastContentRow = procTextRow3;

  // ── Page setup ──────────────────────────────────────────────────
  const lastSheetCol = numPages * PAGE_COLS;
  const printArea    = `A1:${colLetter(lastSheetCol)}${lastContentRow}`;

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    scale: 80,
    fitToPage: false,
    horizontalDpi: 600,
    verticalDpi: 600,
    horizontalCentered: true,
    verticalCentered: false,
    printArea,
    margins: {
      top:    cmIn(1.0),
      header: cmIn(0.4),
      left:   cmIn(0.4),
      right:  cmIn(0.4),
      bottom: cmIn(0.4),
      footer: cmIn(0.4),
    },
  };

  if (numPages > 1) {
    (sheet as any).colBreaks = [{ id: PAGE_COLS + 1 }];
  }

  // ── Column widths ────────────────────────────────────────────────
  for (let pg = 0; pg < numPages; pg++) {
    const off = pg * PAGE_COLS;
    sheet.getColumn(off + 1).width = pxW(100);
    for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
      sheet.getColumn(off + 2 + e * 2).width = pxW(20);
      sheet.getColumn(off + 3 + e * 2).width = pxW(80);
    }
    sheet.getColumn(off + PAGE_COLS).width = pxW(170);
  }

  // ── Row heights ──────────────────────────────────────────────────
  sheet.getRow(1).height = pxH(34);
  sheet.getRow(2).height = pxH(21);
  sheet.getRow(3).height = pxH(42);
  for (let r = firstDataRow; r <= lastDataRow; r++) sheet.getRow(r).height = pxH(48);
  sheet.getRow(spacerRow).height     = pxH(10);
  sheet.getRow(procTitleRow).height  = pxH(29);
  sheet.getRow(procTextRow1).height  = pxH(26);
  sheet.getRow(procTextRow2).height  = pxH(26);
  sheet.getRow(procTextRow3).height  = pxH(26);

  const outputDate = format(new Date(), 'yyyy年M月d日', { locale: ja });

  // ── Write each page ──────────────────────────────────────────────
  for (let pg = 0; pg < numPages; pg++) {
    const off      = pg * PAGE_COLS;
    const empStart = pg * MAX_EMP_PER_PAGE;
    const empEnd   = Math.min(empStart + MAX_EMP_PER_PAGE, numEmp);
    const pageEmps = p.sortedEmployees.slice(empStart, empEnd);
    const gc = (localCol: number) => off + localCol;

    // ── Row 1: Title ───────────────────────────────────────────────
    const titleText = `${p.departmentName}　${p.year}年${p.month}月${halfLabel}　シフト管理表　[Ver. 4.2]`;
    const verIdx1   = titleText.indexOf('[Ver.');
    const mainPart1 = verIdx1 >= 0 ? titleText.slice(0, verIdx1) : titleText;
    const verPart1  = verIdx1 >= 0 ? titleText.slice(verIdx1) : '';
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(1, gc(c));
      if (c === 1) {
        cell.value = verPart1
          ? { richText: [
                { text: mainPart1, font: { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 14, color: { argb: C.titleFont } } },
                { text: verPart1,  font: { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 9,  color: { argb: C.titleFont } } },
              ] }
          : titleText;
      }
      cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 14, color: { argb: C.titleFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }

    // ── Row 2: Legend + output date ────────────────────────────────
    for (let c = 1; c < PAGE_COLS; c++) {
      const cell = sheet.getCell(2, gc(c));
      if (c === 1) {
        cell.value = {
          richText: [
            { text: '凡例：',       font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont  } } },
            { text: '◎',           font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.karintouBg  } } },
            { text: ' かりんとう　', font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont  } } },
            { text: '◆',           font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.cafeBg      } } },
            { text: ' カフェ　× シフトなし', font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } } },
          ],
        };
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    {
      const dc = sheet.getCell(2, gc(PAGE_COLS));
      dc.value     = `出力日：${outputDate}`;
      dc.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } };
      dc.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // ── Row 3: Header ──────────────────────────────────────────────
    {
      const cell = sheet.getCell(3, gc(1));
      cell.value     = '日付';
      cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }
    for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
      const emp = e < pageEmps.length ? pageEmps[e] : null;
      const nc  = sheet.getCell(3, gc(2 + e * 2));
      const wc  = sheet.getCell(3, gc(3 + e * 2));
      nc.value = emp ? emp.name : ' ';
      for (const cell of [nc, wc]) {
        cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 12, color: { argb: C.headerFont } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
        cell.alignment = alignCenter;
        stdBorder(cell);
      }
    }
    {
      const cell = sheet.getCell(3, gc(PAGE_COLS));
      cell.value     = '備考';
      cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }

    // ── Data rows ──────────────────────────────────────────────────
    days.forEach((day, di) => {
      const rowIdx = firstDataRow + di;
      const isHol   = p.isHoliday(day);
      const isSale  = p.isSaleDay(day);
      const style   = getDayStyle(day, isHol, isSale);
      const empBg   = isSale ? getDayStyle(day, isHol, false).bg : style.bg;
      const required = p.getRequiredStaffCount(day);
      const approved = p.getApprovedCount(day);

      // Date cell — wrapText: true (date cells only)
      {
        const cell = sheet.getCell(rowIdx, gc(1));
        cell.value     = `${day.getDate()}日(${format(day, 'E', { locale: ja })})\n【${approved}/${required}】`;
        cell.font      = { name: 'Century', bold: true, size: 12, color: { argb: style.font } };
        fillCell(cell, style.bg);
        cell.alignment = alignCenterWrap;  // wrapText: true (date only)
        stdBorder(cell);
      }

      // Employee cells
      for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
        const emp = e < pageEmps.length ? pageEmps[e] : null;
        const nc  = sheet.getCell(rowIdx, gc(2 + e * 2));
        const wc  = sheet.getCell(rowIdx, gc(3 + e * 2));

        if (emp) {
          const shifts = p.getConfirmedShifts(emp.id, day);

          if (shifts.length === 0) {
            // No shift
            nc.value     = '×';
            nc.font      = { name: 'Century', size: 9 };
            nc.alignment = alignCenter;
            fillCell(nc, empBg);

            wc.font      = { name: 'Century', size: 9 };
            wc.alignment = alignCenter;
            fillCell(wc, empBg);
          } else {
            const shift      = shifts[0];
            const isKarintou = shift.shiftType === 'karintou';
            const shiftBg    = isKarintou ? C.karintouBg : C.cafeBg;
            const shiftFg    = isKarintou ? C.karintouFont : C.cafeFont;
            const symbol     = isKarintou ? '◎' : '◆';
            const timeText   = shifts.map(s => `${s.startTime}-${s.endTime}`).join('\n');

            // Narrow: shift color
            nc.value     = symbol;
            nc.font      = { name: 'Century', size: 9, color: { argb: shiftFg } };
            nc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: shiftBg } };
            nc.alignment = alignCenter;

            // Wide: always day-based background (both design and text)
            wc.value     = timeText;
            wc.font      = { name: 'Century', size: 9 };
            fillCell(wc, empBg);
            wc.alignment = alignCenter;
          }
        } else {
          // Empty employee slot
          nc.value     = ' ';
          nc.alignment = alignCenter;
          wc.alignment = alignCenter;
          fillCell(nc, empBg);
          fillCell(wc, empBg);
        }

        // Pair center line = white on both sides
        nc.border = { top: bGray, left: bGray, bottom: bGray, right: bWhite };
        wc.border = { top: bGray, left: bWhite, bottom: bGray, right: bGray };
      }

      // Notes cell
      {
        const cell = sheet.getCell(rowIdx, gc(PAGE_COLS));
        cell.value     = p.dailyNotes[day.toISOString()] || '';
        cell.font      = { name: 'Century', size: 9 };
        if (isSale) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.saleBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'none' };
        }
        cell.alignment = { horizontal: 'left', vertical: 'top' };
        stdBorder(cell);
      }
    });

    // ── Row procTitleRow: 業務手順 Title（縦罫線なし・外枠のみ）──────
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(procTitleRow, gc(c));
      if (c === 1) cell.value = '📋 業務手順';
      cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 12, color: { argb: C.procTitleFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.procTitleBg } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border    = {
        top:    bGray,
        bottom: bGray,
        left:   c === 1          ? bGray : undefined,
        right:  c === PAGE_COLS  ? bGray : undefined,
      };
    }

    // ── Rows procTextRow1-3: 業務手順 Text 3行固定────────────────────
    const procLines = p.noteText.split('\n');
    [procTextRow1, procTextRow2, procTextRow3].forEach((rowNum, i) => {
      for (let c = 1; c <= PAGE_COLS; c++) {
        const cell = sheet.getCell(rowNum, gc(c));
        if (c === 1) cell.value = procLines[i] ?? '';
        cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 12 };
        cell.fill      = { type: 'pattern', pattern: 'none' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border    = {
          left:  c === 1         ? bGray : undefined,
          right: c === PAGE_COLS ? bGray : undefined,
        };
      }
    });

    // Outer medium borders
    applyOuterBorder(sheet, 3,            lastDataRow,   gc(1), gc(PAGE_COLS));
    applyOuterBorder(sheet, procTitleRow, procTextRow3,  gc(1), gc(PAGE_COLS));

    // A/B and Y/Z column dividers (1.5pt medium)
    for (let r = 3; r <= lastDataRow; r++) {
      const a = sheet.getCell(r, gc(1));
      a.border = { ...a.border, right: bMed };
      const b = sheet.getCell(r, gc(2));
      b.border = { ...b.border, left: bMed };
      const y = sheet.getCell(r, gc(PAGE_COLS - 1));
      y.border = { ...y.border, right: bMed };
      const z = sheet.getCell(r, gc(PAGE_COLS));
      z.border = { ...z.border, left: bMed };
    }
  }
}

function addFullSheet(workbook: ExcelJS.Workbook, p: ShiftExcelParams) {
  const sheetName = `${p.year}年${p.month}月`;
  const sheet     = workbook.addWorksheet(sheetName);

  const numEmp   = Math.min(p.sortedEmployees.length, MAX_EMP_PER_PAGE * 2);
  const numPages = Math.max(1, Math.ceil(numEmp / MAX_EMP_PER_PAGE));

  // All days of the month
  const numDays = getDaysInMonth(new Date(p.year, p.month - 1));
  const days: Date[] = Array.from({ length: numDays }, (_, i) => new Date(p.year, p.month - 1, i + 1));

  const firstDataRow   = 4;
  const lastDataRow    = firstDataRow + numDays - 1;
  const spacerRow      = lastDataRow + 1;
  const procTitleRow   = spacerRow + 1;
  const procTextRow1   = spacerRow + 2;
  const procTextRow2   = spacerRow + 3;
  const procTextRow3   = spacerRow + 4;
  const lastContentRow = procTextRow3;

  const lastSheetCol = numPages * PAGE_COLS;
  const printArea    = `A1:${colLetter(lastSheetCol)}${lastContentRow}`;

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    scale: 80,
    fitToPage: false,
    horizontalDpi: 600,
    verticalDpi: 600,
    horizontalCentered: true,
    verticalCentered: false,
    printArea,
    margins: {
      top:    cmIn(1.0),
      header: cmIn(0.4),
      left:   cmIn(0.4),
      right:  cmIn(0.4),
      bottom: cmIn(0.4),
      footer: cmIn(0.4),
    },
  };

  if (numPages > 1) {
    (sheet as any).colBreaks = [{ id: PAGE_COLS + 1 }];
  }

  // Column widths (same as half sheets)
  for (let pg = 0; pg < numPages; pg++) {
    const off = pg * PAGE_COLS;
    sheet.getColumn(off + 1).width = pxW(100);
    for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
      sheet.getColumn(off + 2 + e * 2).width = pxW(20);
      sheet.getColumn(off + 3 + e * 2).width = pxW(80);
    }
    sheet.getColumn(off + PAGE_COLS).width = pxW(170);
  }

  // Row heights — data rows reduced to fit 31 days on one A4 landscape page
  sheet.getRow(1).height = pxH(34);
  sheet.getRow(2).height = pxH(21);
  sheet.getRow(3).height = pxH(30);
  for (let r = firstDataRow; r <= lastDataRow; r++) sheet.getRow(r).height = pxH(26);
  sheet.getRow(spacerRow).height    = pxH(10);
  sheet.getRow(procTitleRow).height = pxH(29);
  sheet.getRow(procTextRow1).height = pxH(26);
  sheet.getRow(procTextRow2).height = pxH(26);
  sheet.getRow(procTextRow3).height = pxH(26);

  const outputDate = format(new Date(), 'yyyy年M月d日', { locale: ja });

  for (let pg = 0; pg < numPages; pg++) {
    const off      = pg * PAGE_COLS;
    const empStart = pg * MAX_EMP_PER_PAGE;
    const empEnd   = Math.min(empStart + MAX_EMP_PER_PAGE, numEmp);
    const pageEmps = p.sortedEmployees.slice(empStart, empEnd);
    const gc = (localCol: number) => off + localCol;

    // ── Row 1: Title ────────────────────────────────────────────────
    const titleText = `${p.departmentName}　${p.year}年${p.month}月　シフト管理表　[Ver. 4.2]`;
    const verIdx2   = titleText.indexOf('[Ver.');
    const mainPart2 = verIdx2 >= 0 ? titleText.slice(0, verIdx2) : titleText;
    const verPart2  = verIdx2 >= 0 ? titleText.slice(verIdx2) : '';
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(1, gc(c));
      if (c === 1) {
        cell.value = verPart2
          ? { richText: [
                { text: mainPart2, font: { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 14, color: { argb: C.titleFont } } },
                { text: verPart2,  font: { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 9,  color: { argb: C.titleFont } } },
              ] }
          : titleText;
      }
      cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 14, color: { argb: C.titleFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }

    // ── Row 2: Legend + output date ──────────────────────────────────
    for (let c = 1; c < PAGE_COLS; c++) {
      const cell = sheet.getCell(2, gc(c));
      if (c === 1) {
        cell.value = {
          richText: [
            { text: '凡例：',               font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } } },
            { text: '◎',                   font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.karintouBg } } },
            { text: ' かりんとう　',          font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } } },
            { text: '◆',                   font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.cafeBg     } } },
            { text: ' カフェ　× シフトなし',   font: { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } } },
          ],
        };
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    {
      const dc = sheet.getCell(2, gc(PAGE_COLS));
      dc.value     = `出力日：${outputDate}`;
      dc.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 9, color: { argb: C.legendFont } };
      dc.alignment = { horizontal: 'right', vertical: 'middle' };
    }

    // ── Row 3: Header ────────────────────────────────────────────────
    {
      const cell = sheet.getCell(3, gc(1));
      cell.value     = '日付';
      cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }
    for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
      const emp = e < pageEmps.length ? pageEmps[e] : null;
      const nc  = sheet.getCell(3, gc(2 + e * 2));
      const wc  = sheet.getCell(3, gc(3 + e * 2));
      nc.value = emp ? emp.name : ' ';
      for (const cell of [nc, wc]) {
        cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 12, color: { argb: C.headerFont } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
        cell.alignment = alignCenter;
        stdBorder(cell);
      }
    }
    {
      const cell = sheet.getCell(3, gc(PAGE_COLS));
      cell.value     = '備考';
      cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = alignCenter;
      stdBorder(cell);
    }

    // ── Data rows ────────────────────────────────────────────────────
    days.forEach((day, di) => {
      const rowIdx   = firstDataRow + di;
      const isHol    = p.isHoliday(day);
      const isSale   = p.isSaleDay(day);
      const style    = getDayStyle(day, isHol, isSale);
      const empBg    = isSale ? getDayStyle(day, isHol, false).bg : style.bg;
      const required = p.getRequiredStaffCount(day);
      const approved = p.getApprovedCount(day);

      {
        const cell = sheet.getCell(rowIdx, gc(1));
        cell.value     = {
          richText: [
            { text: `${day.getDate()}日(${format(day, 'E', { locale: ja })}) `, font: { name: 'Century', bold: true, size: 10, color: { argb: style.font } } },
            { text: `${approved}/${required}`,                                   font: { name: 'Century', bold: false, size: 10, color: { argb: style.font } } },
          ],
        };
        fillCell(cell, style.bg);
        cell.alignment = alignCenter;
        stdBorder(cell);
      }

      for (let e = 0; e < MAX_EMP_PER_PAGE; e++) {
        const emp = e < pageEmps.length ? pageEmps[e] : null;
        const nc  = sheet.getCell(rowIdx, gc(2 + e * 2));
        const wc  = sheet.getCell(rowIdx, gc(3 + e * 2));

        if (emp) {
          const shifts = p.getConfirmedShifts(emp.id, day);
          if (shifts.length === 0) {
            nc.value = '×';
            nc.font  = { name: 'Century', size: 9 };
            fillCell(nc, empBg);
            wc.font  = { name: 'Century', size: 9 };
            fillCell(wc, empBg);
          } else {
            const shift      = shifts[0];
            const isKarintou = shift.shiftType === 'karintou';
            const shiftBg    = isKarintou ? C.karintouBg : C.cafeBg;
            const shiftFg    = isKarintou ? C.karintouFont : C.cafeFont;
            nc.value = isKarintou ? '◎' : '◆';
            nc.font  = { name: 'Century', size: 9, color: { argb: shiftFg } };
            nc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: shiftBg } };
            wc.value = shifts.map(s => `${s.startTime}-${s.endTime}`).join('\n');
            wc.font  = { name: 'Century', size: 9 };
            fillCell(wc, empBg);
          }
        } else {
          nc.value = ' ';
          nc.font  = { name: 'Century', size: 9 };
          fillCell(nc, empBg);
          wc.font  = { name: 'Century', size: 9 };
          fillCell(wc, empBg);
        }

        for (const cell of [nc, wc]) cell.alignment = alignCenter;
        nc.border = { top: bGray, left: bGray, bottom: bGray, right: bWhite };
        wc.border = { top: bGray, left: bWhite, bottom: bGray, right: bGray };
      }

      {
        const cell = sheet.getCell(rowIdx, gc(PAGE_COLS));
        cell.value     = p.dailyNotes[day.toISOString()] || '';
        cell.font      = { name: 'Century', size: 9 };
        if (isSale) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.saleBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'none' };
        }
        cell.alignment = { horizontal: 'left', vertical: 'top' };
        stdBorder(cell);
      }
    });

    // ── procTitleRow ──────────────────────────────────────────────────
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(procTitleRow, gc(c));
      if (c === 1) cell.value = '📋 業務手順';
      cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', bold: true, size: 12, color: { argb: C.procTitleFont } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.procTitleBg } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border    = {
        top:    bGray,
        bottom: bGray,
        left:   c === 1         ? bGray : undefined,
        right:  c === PAGE_COLS ? bGray : undefined,
      };
    }

    // ── procTextRow1-3: 業務手順 Text 3行固定────────────────────────────
    const procLines = p.noteText.split('\n');
    [procTextRow1, procTextRow2, procTextRow3].forEach((rowNum, i) => {
      for (let c = 1; c <= PAGE_COLS; c++) {
        const cell = sheet.getCell(rowNum, gc(c));
        if (c === 1) cell.value = procLines[i] ?? '';
        cell.font      = { name: 'HG丸ｺﾞｼｯｸM-PRO', size: 12 };
        cell.fill      = { type: 'pattern', pattern: 'none' };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border    = {
          left:  c === 1         ? bGray : undefined,
          right: c === PAGE_COLS ? bGray : undefined,
        };
      }
    });

    // Outer medium borders
    applyOuterBorder(sheet, 3,            lastDataRow,   gc(1), gc(PAGE_COLS));
    applyOuterBorder(sheet, procTitleRow, procTextRow3,  gc(1), gc(PAGE_COLS));

    // A/B and Y/Z column dividers (1.5pt medium)
    for (let r = 3; r <= lastDataRow; r++) {
      const a = sheet.getCell(r, gc(1));
      a.border = { ...a.border, right: bMed };
      const b = sheet.getCell(r, gc(2));
      b.border = { ...b.border, left: bMed };
      const y = sheet.getCell(r, gc(PAGE_COLS - 1));
      y.border = { ...y.border, right: bMed };
      const z = sheet.getCell(r, gc(PAGE_COLS));
      z.border = { ...z.border, left: bMed };
    }
  }
}

function addCalendarSheet(workbook: ExcelJS.Workbook, p: ShiftExcelParams) {
  const sheet = workbook.addWorksheet('直営店別シフト表');

  // ── Column definitions ─────────────────────────────────────────────────
  // A(1)=曜日/日付ラベル (B列削除済み)
  // Sun=B-C(2-3), Mon=D-E(4-5), Tue=F-G(6-7), Wed=H-I(8-9),
  // Thu=J-K(10-11), Fri=L-M(12-13), Sat=N-O(14-15)
  // Helpers (outside print): P-R(16-18), S(19)=氏名リスト, T(20), U(21)=WEEKDAY
  const COL_A   = 1;
  const DAY_L   = [2, 4, 6, 8, 10, 12, 14]; // B,D,F,H,J,L,N (left sub-col of each day)
  const COL_F   = 3;   // C1 → month input (②で-3シフト)
  const COL_J   = 7;   // G1 → DATE companion (DATE式はF1=col6、②で-3シフト)
  const COL_T   = 19;  // 氏名リスト (S)
  const COL_V   = 21;  // WEEKDAY helper (U)
  const END_COL = 15;  // O = last printed column

  const NAME_ROWS = 6;
  const NUM_WEEKS = 6;
  const DOW_JP    = ['日', '月', '火', '水', '木', '金', '土'];

  // このシートの罫線は黒
  const mkBk = (style: 'thin' | 'medium'): ExcelJS.Border =>
    ({ style, color: { argb: 'FF000000' } } as ExcelJS.Border);
  const bkThin: ExcelJS.Border = mkBk('thin');
  const bkMed:  ExcelJS.Border = mkBk('medium');
  const bkHair: ExcelJS.Border = { style: 'hair', color: { argb: 'FF000000' } };

  const stdBk = (cell: ExcelJS.Cell) => {
    cell.border = { top: bkThin, left: bkThin, bottom: bkThin, right: bkThin };
  };
  const applyOuterBk = (sr: number, er: number, sc: number, ec: number) => {
    for (let c = sc; c <= ec; c++) {
      const t = sheet.getCell(sr, c); t.border = { ...t.border, top: bkMed };
      const b = sheet.getCell(er, c); b.border = { ...b.border, bottom: bkMed };
    }
    for (let r = sr; r <= er; r++) {
      const l  = sheet.getCell(r, sc); l.border  = { ...l.border,  left:  bkMed };
      const rr = sheet.getCell(r, ec); rr.border = { ...rr.border, right: bkMed };
    }
  };

  const familyName = (name: string) => {
    const i = name.search(/[ 　]/);
    return i === -1 ? name : name.slice(0, i);
  };

  // Calendar start day (Sunday of the week containing the 1st)
  // Use same date construction as existing half/full sheets for consistency
  const firstOfMonth = new Date(p.year, p.month - 1, 1);
  const calStartDay  = 1 - firstOfMonth.getDay(); // may be ≤0, new Date handles it correctly

  const dateRowOf = (w: number) => 3 + w * (NAME_ROWS + 1); // 3,10,17,24,31,38
  const nameRowOf = (w: number, nr: number) => dateRowOf(w) + 1 + nr;
  const NOTES_ROW = dateRowOf(NUM_WEEKS); // row 45

  // ── Page setup (A4 portrait, 余白最小) ────────────────────────────────
  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    scale: 80,
    fitToPage: false,
    horizontalDpi: 600,
    verticalDpi: 600,
    horizontalCentered: true,
    verticalCentered: false,
    printArea: `A1:${colLetter(END_COL)}${NOTES_ROW}`,
    margins: { top: cmIn(1.5), header: cmIn(0.3), left: cmIn(0.3), right: cmIn(0.3), bottom: cmIn(0.5), footer: cmIn(0.3) },
  };

  // ── Column widths (A4縦で最大限に使う) ────────────────────────────────
  sheet.getColumn(COL_A).width = pxW(64);   // 曜日/日付ラベル (④)
  for (let d = 0; d < 7; d++) {
    sheet.getColumn(DAY_L[d]).width     = pxW(64); // 各日左サブ列
    sheet.getColumn(DAY_L[d] + 1).width = pxW(64); // 各日右サブ列
  }
  for (let c = END_COL + 1; c <= COL_V; c++) sheet.getColumn(c).width = pxW(c === COL_T ? 44 : 8);

  // ── Row heights (A4縦で最大限に使う) ──────────────────────────────────
  sheet.getRow(1).height = pxH(60);
  sheet.getRow(2).height = pxH(26);
  for (let w = 0; w < NUM_WEEKS; w++) {
    sheet.getRow(dateRowOf(w)).height = pxH(26);
    for (let nr = 0; nr < NAME_ROWS; nr++) sheet.getRow(nameRowOf(w, nr)).height = pxH(26);
  }
  sheet.getRow(NOTES_ROW).height = pxH(100);

  // ── Row 1: Title + helper cells ───────────────────────────────────────
  // Row 1 レイアウト:
  // A1=year(#"年",centerCont), B1=空(centerCont)
  // C1=month(#"月",centerCont), D1=空(centerCont)
  // E1=シフト表(18pt,standard) ②H1→E1
  // F1-N1=空(standard) ④E1:N1標準化(E1除く)
  // O1=部門名(18pt,右詰め) ③J1→O1
  // T1=DATE式(yyyy/m/d,10pt) ①F1→T1
  // U1=WEEKDAY(T1,1) helper
  {
    const r1 = (col: number) => sheet.getCell(1, col);

    // A1: year + numFmt "#" 年""
    r1(1).value     = p.year;
    r1(1).numFmt    = '#" 年"';
    r1(1).font      = { bold: true, size: 18 };
    r1(1).alignment = { horizontal: 'centerContinuous', vertical: 'middle' };

    // B1: 空（A1のcenterContinuous範囲用）
    r1(2).value     = null;
    r1(2).alignment = { horizontal: 'centerContinuous', vertical: 'middle' };

    // C1: month + numFmt "#" 月""
    r1(COL_F).value     = p.month;
    r1(COL_F).numFmt    = '#" 月"';
    r1(COL_F).font      = { bold: true, size: 18 };
    r1(COL_F).alignment = { horizontal: 'centerContinuous', vertical: 'middle' };

    // D1: 空（C1のcenterContinuous範囲用）
    r1(COL_F + 1).value     = null;
    r1(COL_F + 1).alignment = { horizontal: 'centerContinuous', vertical: 'middle' };

    // E1: "シフト表" 18pt ② H1→E1移動
    r1(5).value     = 'シフト表';
    r1(5).font      = { bold: true, size: 18 };
    r1(5).alignment = { horizontal: 'general', vertical: 'middle' };

    // ④ F1:N1 (cols 6-14) を空・標準配置に（以前の内容をクリア）
    for (let c = 6; c <= 14; c++) {
      r1(c).value     = null;
      r1(c).alignment = { horizontal: 'general', vertical: 'middle' };
    }

    // O1: 部門名 18pt、右詰め ③ J1→O1移動
    r1(15).value     = p.departmentName;
    r1(15).font      = { bold: true, size: 18 };
    r1(15).alignment = { horizontal: 'right', vertical: 'middle' };

    // T1: DATE(A1,C1,1) → yyyy/m/d 形式、10pt ① F1→T1移動（印刷範囲外ヘルパー）
    r1(20).value     = { formula: 'DATE(A1,C1,1)' };
    r1(20).numFmt    = 'yyyy/m/d';
    r1(20).font      = { bold: true, size: 10 };
    r1(20).alignment = { horizontal: 'centerContinuous', vertical: 'middle' };

    // U1 = WEEKDAY(T1,1) — ヘルパー ① F1→T1移動に伴い参照先更新
    r1(COL_V).value = { formula: 'WEEKDAY(T1,1)' };
    r1(COL_V).font  = { size: 8 };
  }

  // ── Row 2: 曜日ヘッダー ───────────────────────────────────────────────
  {
    const a2 = sheet.getCell(2, COL_A);
    a2.value     = '曜日';
    a2.font      = { bold: true, size: 14 };
    a2.alignment = { horizontal: 'center', vertical: 'middle' };
    stdBk(a2);

    for (let d = 0; d < 7; d++) {
      // ⑤ BC列(日)・NO列(土)は標準色のみ、月〜金は曜日色
      const fc = (d === 1 || d === 2 || d === 3 || d === 4 || d === 5)
        ? C.weekdayFont : C.weekdayFont; // 全曜日統一(日・土の特別色廃止)
      const lc = sheet.getCell(2, DAY_L[d]);
      const rc = sheet.getCell(2, DAY_L[d] + 1);
      lc.value = DOW_JP[d];
      for (const cell of [lc, rc]) {
        cell.font      = { bold: true, size: 14, color: { argb: fc } };
        cell.alignment = { horizontal: 'centerContinuous', vertical: 'middle' };
        stdBk(cell);
      }
    }
  }

  // ── T2:T13 — 氏名リスト (12名、従業員リスト順、名字のみ) ───────────────
  for (let i = 0; i < 12; i++) {
    const emp = p.sortedEmployees[i];
    const tc  = sheet.getCell(2 + i, COL_T);
    tc.value     = emp ? familyName(emp.name) : '';
    tc.font      = { size: 14 };
    tc.alignment = { horizontal: 'left', vertical: 'middle' };
    if (emp) stdBk(tc);
  }

  // ── Week blocks (rows 3–44) ────────────────────────────────────────────
  for (let w = 0; w < NUM_WEEKS; w++) {
    const dateRow = dateRowOf(w);

    // 週内の各日（日〜土）の氏名リストを事前計算（日付行・名前行で共用）
    const weekData = Array.from({ length: 7 }, (_, d) => {
      const offset  = w * 7 + d;
      const dayDate = new Date(p.year, p.month - 1, calStartDay + offset);
      const inMonth = dayDate.getMonth() === p.month - 1;
      const isSale  = inMonth && p.isSaleDay(dayDate);
      const names   = inMonth
        ? p.sortedEmployees
            .filter(e => p.getConfirmedShifts(e.id, dayDate).length > 0)
            .map(e => familyName(e.name))
        : [];
      // ⑤ 日(d=0)・土(d=6)の特別色廃止 → 全曜日統一
      const [fc, bg]: [string, string | null] =
        !inMonth ? ['FFAAAAAA', null] :
                   [C.weekdayFont,  null];
      return { offset, dayDate, inMonth, isSale, names, fc, bg };
    });

    // ── Date row ──────────────────────────────────────────────────────────
    {
      const a = sheet.getCell(dateRow, COL_A);
      a.value     = '日付';
      a.font      = { size: 14 };
      a.alignment = { horizontal: 'center', vertical: 'middle' };
      stdBk(a);

      for (let d = 0; d < 7; d++) {
        const { offset, isSale, names, fc, bg } = weekData[d];

        const base       = '$T$1-($U$1-1)';
        const offsetExpr = offset === 0 ? base : `${base}+${offset}`;
        const fml        = `IF(MONTH(${offsetExpr})=$C$1,${offsetExpr},"")`;

        const lc  = sheet.getCell(dateRow, DAY_L[d]);
        const rc  = sheet.getCell(dateRow, DAY_L[d] + 1);
        lc.value  = { formula: fml };
        lc.numFmt = 'd';

        const finalBg = isSale ? C.saleBg : bg;
        for (const cell of [lc, rc]) {
          cell.font      = { bold: true, size: 14, color: { argb: fc } };
          if (finalBg) fillCell(cell, finalBg);
          cell.alignment = { horizontal: 'centerContinuous', vertical: 'middle' };
          stdBk(cell);
        }
        // デフォルトはサブ列間に境界線なし（stdBk で付いた内側を消す）
        lc.border = { ...lc.border, right: undefined };
        rc.border = { ...rc.border, left:  undefined };
        // 7名以上の日のみ極細線を引く
        if (names.length >= 7) {
          lc.border = { ...lc.border, right: bkHair };
          rc.border = { ...rc.border, left:  bkHair };
        }
      }

      // 週2以降（rows 10,17,24,31,38）の日付行上辺は太罫線
      if (w >= 1) {
        for (let c = COL_A; c <= END_COL; c++) {
          const cell = sheet.getCell(dateRow, c);
          cell.border = { ...cell.border, top: bkMed };
        }
      }
    }

    // ── Name rows (6 rows per week) ───────────────────────────────────────
    for (let nr = 0; nr < NAME_ROWS; nr++) {
      const nameRow = nameRowOf(w, nr);
      stdBk(sheet.getCell(nameRow, COL_A));

      for (let d = 0; d < 7; d++) {
        const { isSale, names, fc, bg } = weekData[d];
        const finalBg = isSale ? C.saleBg : bg;

        // 左サブ列: names[0..5], 右サブ列: names[6..11]
        const lc = sheet.getCell(nameRow, DAY_L[d]);
        const rc = sheet.getCell(nameRow, DAY_L[d] + 1);

        for (const [cell, name] of [
          [lc, names[nr]            ?? ''] as [ExcelJS.Cell, string],
          [rc, names[nr + NAME_ROWS] ?? ''] as [ExcelJS.Cell, string],
        ]) {
          cell.value     = name;
          cell.font      = { size: 14, color: { argb: fc } };
          if (finalBg) fillCell(cell, finalBg);
          cell.alignment = { horizontal: 'centerContinuous', vertical: 'middle', shrinkToFit: true };
          stdBk(cell);
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            showDropDown: false,
            formulae: ['$S:$S'],
          };
        }
        // デフォルトはサブ列間に境界線なし
        lc.border = { ...lc.border, right: undefined };
        rc.border = { ...rc.border, left:  undefined };
        // 7名以上の日のみ極細線を引く
        if (names.length >= 7) {
          lc.border = { ...lc.border, right: bkHair };
          rc.border = { ...rc.border, left:  bkHair };
        }
      }
    }
  }

  // ── 備考欄 (row 45) ───────────────────────────────────────────────────
  for (let c = COL_A; c <= END_COL; c++) {
    const cell = sheet.getCell(NOTES_ROW, c);
    if (c === COL_A) cell.value = '備考欄';
    cell.font      = { size: 14 };
    cell.alignment = { horizontal: 'left', vertical: 'top' };
    stdBk(cell);
    // 内部の縦線を全て消去（外枠左右はapplyOuterBkが後から設定）
    if (c > COL_A)   cell.border = { ...cell.border, left:  undefined };
    if (c < END_COL) cell.border = { ...cell.border, right: undefined };
  }

  // ── ① シート全体フォント "HG丸ｺﾞｼｯｸM-PRO" / ④ A2:A44 中央揃え ─────────
  for (let r = 1; r <= NOTES_ROW; r++) {
    for (let c = 1; c <= COL_V + 1; c++) {
      const cell = sheet.getCell(r, c);
      // font name を全セルに付与（existing size/bold保持、colorは標準=削除、未設定size→14pt）
      const f = { size: 14, ...cell.font, name: 'HG丸ｺﾞｼｯｸM-PRO' } as ExcelJS.Font;
      delete f.color;  // 全文字色を標準（黒）にリセット
      cell.font = f;
    }
    // A列(col1)のrow2〜row44を中央揃えに統一
    if (r >= 2 && r <= NOTES_ROW - 1) {
      const ac = sheet.getCell(r, COL_A);
      ac.alignment = { ...ac.alignment, horizontal: 'center' };
    }
  }

  // ── Outer borders (黒・太線) ──────────────────────────────────────────
  applyOuterBk(2, NOTES_ROW, COL_A, END_COL);

  // 曜日ヘッダー行(row2)下 ／ 1週目日付行(row3)上: 太線
  for (let c = COL_A; c <= END_COL; c++) {
    const r2 = sheet.getCell(2, c); r2.border = { ...r2.border, bottom: bkMed };
    const r3 = sheet.getCell(3, c); r3.border = { ...r3.border, top:    bkMed };
  }

  // 備考欄の上罫線: 太線
  for (let c = COL_A; c <= END_COL; c++) {
    const nr = sheet.getCell(NOTES_ROW,     c); nr.border = { ...nr.border, top:    bkMed };
    const pr = sheet.getCell(NOTES_ROW - 1, c); pr.border = { ...pr.border, bottom: bkMed };
  }

  // ── ① ロック解除 ──────────────────────────────────────────────────────
  const unlock = (row: number, col: number) => {
    sheet.getCell(row, col).protection = { locked: false };
  };
  const unlockRange = (sr: number, er: number, sc: number, ec: number) => {
    for (let r = sr; r <= er; r++)
      for (let c = sc; c <= ec; c++)
        unlock(r, c);
  };

  unlock(1,  1);  // A1
  unlock(1,  3);  // C1
  unlock(1, 15);  // O1

  unlockRange( 3,  9, 2, END_COL); // B3:O9   week1(日付行+名前行)
  unlockRange(11, 16, 2, END_COL); // B11:O16 week2 名前行
  unlockRange(18, 23, 2, END_COL); // B18:O23 week3 名前行
  unlockRange(25, 30, 2, END_COL); // B25:O30 week4 名前行
  unlockRange(32, 37, 2, END_COL); // B32:O37 week5 名前行
  unlockRange(39, 44, 2, END_COL); // B39:O44 week6 名前行
  unlockRange(45, 45, 1, END_COL); // A45:O45 備考欄
  unlockRange( 2, 45, COL_T, COL_T); // S2:S45 氏名リスト列

  // ── ② シート保護（パスワードなし） ────────────────────────────────────
  // 有効: ロックされていないセル範囲の選択のみ
  void sheet.protect('', {
    selectLockedCells:   false,
    selectUnlockedCells: true,
    formatCells:         false,
    formatColumns:       false,
    formatRows:          false,
    insertColumns:       false,
    insertRows:          false,
    insertHyperlinks:    false,
    deleteColumns:       false,
    deleteRows:          false,
    sort:                false,
    autoFilter:          false,
    pivotTables:         false,
  });
}

export async function generateShiftExcel(p: ShiftExcelParams): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'シフト管理システム Ver. 4.2';
  workbook.created = new Date();

  addHalfSheet(workbook, 'first',  p);
  addHalfSheet(workbook, 'second', p);
  addFullSheet(workbook, p);
  addCalendarSheet(workbook, p);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = `${p.departmentName}_${p.year}年${p.month}月_シフト管理表.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
