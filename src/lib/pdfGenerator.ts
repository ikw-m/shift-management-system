import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generateShiftPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('印刷対象が見つかりません');
    return;
  }

  // HTMLをCanvasに変換
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: true, // エラー詳細を確認するためloggingをtrueに
    backgroundColor: '#ffffff',
    onclone: (clonedDoc) => {
      // Tailwind v4のoklch()カラーを安全な形式に置き換え
      const style = clonedDoc.createElement('style');
      style.textContent = `
        * {
          color: inherit !important;
          background-color: transparent !important;
          border-color: inherit !important;
        }
        #${elementId} {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
      `;
      clonedDoc.head.appendChild(style);
    },
  });

  // CanvasをPDFに変換
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const imgWidth = 297; // A4横幅
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
}
