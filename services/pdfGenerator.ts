
import { AppState } from '../types';

export const generateReportPDF = (
  state: AppState, 
  startDate: Date, 
  endDate: Date, 
  clientId: string | 'all',
  manualRate: number, // Manual hourly rate
  manualFixedFee: number, // Manual fixed fee
  options: {
      title: string;
      businessName?: string; // Optional Business/Project Name
      userName: string;
      isInvoice: boolean;
      groupByDate: boolean;
      showTimeRange: boolean;
  }
) => {
  // Logic to filter data
  const filteredEntries = state.entries.filter(entry => {
    if (!entry.endTime) return false;
    const entryDate = new Date(entry.startTime);
    const matchesClient = clientId === 'all' || entry.clientId === clientId;
    const inRange = entryDate >= startDate && entryDate <= endDate;
    return matchesClient && inRange;
  });

  const totalHours = filteredEntries.reduce((acc, curr) => acc + ((curr.endTime! - curr.startTime) / 3600000), 0);
  
  // Calculation: (Hours * Hourly Rate) + Fixed Fee
  const hourlyTotal = Math.floor(totalHours * manualRate);
  const totalAmount = hourlyTotal + manualFixedFee;

  console.log("Generating PDF for", filteredEntries.length, "entries with options:", options);
  
  const clientName = clientId !== 'all' 
    ? state.clients.find(c => c.id === clientId)?.name 
    : '全クライアント';

  alert(`【${options.title} PDF生成シミュレーション】
--------------------------------------------
発行者: ${options.userName}
宛先: ${clientName || '未指定'}
${options.businessName ? `件名: ${options.businessName}` : ''}
作成日: ${new Date().toLocaleDateString('ja-JP')}
対象件数: ${filteredEntries.length} 件 (グループ化: ${options.groupByDate ? 'あり' : 'なし'})
--------------------------------------------
${options.isInvoice ? `
稼働合計: ${totalHours.toFixed(2)} 時間
時給単価: ¥${manualRate.toLocaleString()}
稼働小計: ¥${hourlyTotal.toLocaleString()}
--------------------------------------------
諸経費/固定額: ¥${manualFixedFee.toLocaleString()}
--------------------------------------------
請求総額(税抜): ¥${totalAmount.toLocaleString()}
` : `
[日報モード]
稼働合計: ${totalHours.toFixed(2)} 時間
※ 金額情報は非表示
`}
--------------------------------------------

※ 実際のアプリでは、ここで正式なレイアウトの
PDFファイルが生成・ダウンロードされます。`);
};

export const exportToCSV = (state: AppState, startDate: Date, endDate: Date) => {
    const filteredEntries = state.entries.filter(entry => {
        if (!entry.endTime) return false;
        const entryDate = new Date(entry.startTime);
        return entryDate >= startDate && entryDate <= endDate;
    });

    const headers = ['日付', 'クライアント', '作業内容', '時間(h)'];
    const rows = filteredEntries.map(e => {
        const client = state.clients.find(c => c.id === e.clientId);
        const durationHours = ((e.endTime || Date.now()) - e.startTime) / (1000 * 60 * 60);
        
        return [
            new Date(e.startTime).toLocaleDateString('ja-JP'),
            client?.name || '不明',
            `"${e.description.replace(/"/g, '""')}"`, // Escape quotes
            durationHours.toFixed(2),
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n'); // Add BOM for Excel
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `work_log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
