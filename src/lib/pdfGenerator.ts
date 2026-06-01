import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export async function generateShiftPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('印刷対象が見つかりません');
    return;
  }

  try {
    // 要素をクローンして、全てのclassNameを削除
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.id = 'temp-print-clone';

    // 全ての子要素からclassNameを削除
    const allElements = clonedElement.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      el.removeAttribute('class');
    }
    clonedElement.removeAttribute('class');

    // クローンを一時的にDOMに追加（画面外に配置）
    clonedElement.style.position = 'fixed';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '-9999px';
    clonedElement.style.width = element.offsetWidth + 'px';
    clonedElement.style.backgroundColor = '#ffffff';
    document.body.appendChild(clonedElement);

    // HTMLをPNG画像に変換
    const dataUrl = await toPng(clonedElement, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    // クローンを削除
    document.body.removeChild(clonedElement);

    // 画像サイズを取得
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // PDFを生成
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 297; // A4横幅
    const imgHeight = (img.height * imgWidth) / img.width;

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('PDF生成エラー:', error);
    alert('PDF生成に失敗しました。コンソールを確認してください。');
  }
}
