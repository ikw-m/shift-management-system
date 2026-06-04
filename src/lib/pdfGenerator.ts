import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export async function generateShiftPDF(elementId: string, filename: string) {
  console.log('[PDF] 処理開始:', elementId);

  const element = document.getElementById(elementId);
  if (!element) {
    alert('印刷対象が見つかりません');
    return;
  }
  console.log('[PDF] 要素を取得しました');

  try {
    // 全てのページ要素を取得
    const pages = element.querySelectorAll('.pdf-page');
    console.log('[PDF] ページ数:', pages.length);

    if (pages.length === 0) {
      alert('印刷対象のページが見つかりません');
      return;
    }

    // 要素を一時的に表示
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    // PDFを生成
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // 各ページを処理
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      console.log(`[PDF] ページ ${i + 1}/${pages.length} を処理中...`);

      // ページを画像に変換
      const dataUrl = await toPng(page, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      console.log(`[PDF] ページ ${i + 1} 画像変換完了`);

      // 画像サイズを取得
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // 画像をPDFに追加（アスペクト比を保持）
      const imgWidth = 297; // A4横幅
      const imgHeight = (img.height * imgWidth) / img.width;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      console.log(`[PDF] ページ ${i + 1} PDF追加完了 (${imgWidth}mm x ${imgHeight.toFixed(2)}mm)`);
    }

    // 要素を元に戻す
    element.style.display = originalDisplay;

    // PDFをBlobとして取得
    console.log('[PDF] PDF保存中...', filename);
    const pdfBlob = pdf.output('blob');

    // Safari対応：a要素を使って手動でダウンロード
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // クリーンアップ（Safariのため遅延）
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[PDF] 処理完了');
    }, 100);
  } catch (error) {
    console.error('[PDF] エラー発生:', error);
    alert('PDF生成に失敗しました。コンソールを確認してください。');
  }
}
