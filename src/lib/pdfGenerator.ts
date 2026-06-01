import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generateShiftPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('印刷対象が見つかりません');
    return;
  }

  try {
    // HTMLをCanvasに変換
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1280,
      windowHeight: 720,
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
  } catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDF生成に失敗しました。コンソールを確認してください。');
  }
}
