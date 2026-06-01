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
    // 要素をクローンして、全てのclassNameを削除
    console.log('[PDF] クローン作成中...');
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.id = 'temp-print-clone';

    // 全ての子要素からclassNameを削除
    const allElements = clonedElement.getElementsByTagName('*');
    console.log('[PDF] className削除中... 対象要素数:', allElements.length);
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      el.removeAttribute('class');
    }
    clonedElement.removeAttribute('class');
    console.log('[PDF] className削除完了');

    // クローンを一時的にDOMに追加（画面外に配置）
    clonedElement.style.position = 'fixed';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '-9999px';
    clonedElement.style.width = element.offsetWidth + 'px';
    clonedElement.style.backgroundColor = '#ffffff';
    document.body.appendChild(clonedElement);
    console.log('[PDF] クローンをDOMに追加');

    // HTMLをPNG画像に変換
    console.log('[PDF] PNG変換開始...');
    const dataUrl = await toPng(clonedElement, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    console.log('[PDF] PNG変換完了');

    // クローンを削除
    document.body.removeChild(clonedElement);
    console.log('[PDF] クローンを削除');

    // 画像サイズを取得
    console.log('[PDF] 画像読み込み中...');
    console.log('[PDF] dataUrlの長さ:', dataUrl.length, '文字');
    console.log('[PDF] dataUrlの先頭100文字:', dataUrl.substring(0, 100));

    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[PDF] 画像読み込みタイムアウト');
        reject(new Error('画像読み込みタイムアウト'));
      }, 10000); // 10秒でタイムアウト

      img.onload = () => {
        clearTimeout(timeout);
        console.log('[PDF] img.onload発火');
        resolve(true);
      };

      img.onerror = (err) => {
        clearTimeout(timeout);
        console.error('[PDF] img.onerror発火:', err);
        reject(new Error('画像読み込みエラー'));
      };
    });
    console.log('[PDF] 画像読み込み完了:', img.width, 'x', img.height);

    // PDFを生成
    console.log('[PDF] PDF生成中...');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 297; // A4横幅
    const imgHeight = (img.height * imgWidth) / img.width;

    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
    console.log('[PDF] PDF保存中...', filename);
    pdf.save(filename);
    console.log('[PDF] 処理完了');
  } catch (error) {
    console.error('[PDF] エラー発生:', error);
    alert('PDF生成に失敗しました。コンソールを確認してください。');
  }
}
