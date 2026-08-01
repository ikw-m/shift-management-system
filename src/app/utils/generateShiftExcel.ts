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
    const titleText = `${p.departmentName}　${p.year}年${p.month}月${halfLabel}　シフト管理表　[Ver. 4.0]`;
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(1, gc(c));
      if (c === 1) cell.value = titleText;
      cell.font      = { bold: true, size: 13, color: { argb: C.titleFont } };
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
            { text: '凡例：',       font: { size: 9, color: { argb: C.legendFont  } } },
            { text: '◎',           font: { size: 9, color: { argb: C.karintouBg  } } },
            { text: ' かりんとう　', font: { size: 9, color: { argb: C.legendFont  } } },
            { text: '◆',           font: { size: 9, color: { argb: C.cafeBg      } } },
            { text: ' カフェ　× シフトなし', font: { size: 9, color: { argb: C.legendFont } } },
          ],
        };
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    {
      const dc = sheet.getCell(2, gc(PAGE_COLS));
      dc.value     = `出力日：${outputDate}`;
      dc.font      = { size: 9, color: { argb: C.legendFont } };
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
        cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
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
      cell.font      = { name: 'MS Pゴシック', bold: true, size: 10, color: { argb: C.procTitleFont } };
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
        cell.font      = { name: 'MS Pゴシック', size: 9 };
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
    const titleText = `${p.departmentName}　${p.year}年${p.month}月　シフト管理表　[Ver. 4.0]`;
    for (let c = 1; c <= PAGE_COLS; c++) {
      const cell = sheet.getCell(1, gc(c));
      if (c === 1) cell.value = titleText;
      cell.font      = { bold: true, size: 13, color: { argb: C.titleFont } };
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
            { text: '凡例：',               font: { size: 9, color: { argb: C.legendFont } } },
            { text: '◎',                   font: { size: 9, color: { argb: C.karintouBg } } },
            { text: ' かりんとう　',          font: { size: 9, color: { argb: C.legendFont } } },
            { text: '◆',                   font: { size: 9, color: { argb: C.cafeBg     } } },
            { text: ' カフェ　× シフトなし',   font: { size: 9, color: { argb: C.legendFont } } },
          ],
        };
      }
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
    {
      const dc = sheet.getCell(2, gc(PAGE_COLS));
      dc.value     = `出力日：${outputDate}`;
      dc.font      = { size: 9, color: { argb: C.legendFont } };
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
        cell.font      = { bold: true, size: 10, color: { argb: C.headerFont } };
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
      cell.font      = { name: 'MS Pゴシック', bold: true, size: 10, color: { argb: C.procTitleFont } };
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
        cell.font      = { name: 'MS Pゴシック', size: 9 };
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

export async function generateShiftExcel(p: ShiftExcelParams): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'シフト管理システム Ver. 4.0';
  workbook.created = new Date();

  addHalfSheet(workbook, 'first',  p);
  addHalfSheet(workbook, 'second', p);
  addFullSheet(workbook, p);

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
