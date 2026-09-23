/**
 * ESOGÜ Sınav Yoklama Sistemi - Excel (.xlsx) Çıktı Oluşturucu
 * İncelenen resmi 'LİSTE ŞABLONU.xlsx' ile %100 birebir formatta çıktı üretir.
 */

window.ExcelExporter = (function() {
  'use strict';

  function downloadExcel(workbook, filename) {
    try {
      if (typeof window !== 'undefined' && typeof window.document !== 'undefined' && window.document.createElement) {
        XLSX.writeFile(workbook, filename || 'SINAV_YOKLAMA_LISTESI.xlsx');
      }
    } catch (e) {
      console.warn('Excel indirme uyarısı:', e.message);
    }
  }

  /**
   * Dağıtım sonuçlarını resmi Excel şablonu formatında oluşturur ve indirir
   */
  function generate({ courseName, examDate, results, academicYear = '2025-2026 EĞİTİM-ÖĞRETİM YILI BAHAR YARIYILI' }) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Excel kütüphanesi (XLSX) yüklenemedi.');
    }

    const wsData = [];
    const merges = [];

    let currentRow = 0; // 0-indexed

    for (let rIdx = 0; rIdx < results.length; rIdx++) {
      const room = results[rIdx];

      // 1. Satır: Başlık (A:D birleşik)
      const titleText = `ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ İLAHİYAT FAKÜLTESİ ${academicYear} FİNAL SINAVI YOKLAMA LİSTESİ`;
      wsData.push([titleText, null, null, null]);
      merges.push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: 3 }
      });
      currentRow++;

      // 2. Satır: Ders ve Derslik (C:D birleşik)
      wsData.push(['DERS', courseName || '', room.roomName, null]);
      merges.push({
        s: { r: currentRow, c: 2 },
        e: { r: currentRow, c: 3 }
      });
      currentRow++;

      // 3. Satır: Tarih - Saat
      wsData.push(['TARİH- SAAT', examDate || '', null, null]);
      currentRow++;

      // 4. Satır: Tablo Başlıkları
      wsData.push(['SIRA NO', 'ÖĞRENCİ NO', 'AD-SOYAD', 'İMZA']);
      currentRow++;

      // 5. Satır ve sonrası: Öğrenci Listesi
      for (const st of room.students) {
        wsData.push([st.siraNo, st.no || '', st.name || '', '']);
        currentRow++;
      }

      // Gözetmen Satırı
      wsData.push([null, 'GÖZETMEN', null, '']);
      currentRow++;

      // FIRTINA YAZILIM HİZMETİ İmzası
      wsData.push([null, null, null, 'FIRTINA YAZILIM HİZMETİ']);
      currentRow++;

      // Bloklar arası boşluk (Son blok değilse)
      if (rIdx < results.length - 1) {
        wsData.push([null, null, null, null]);
        wsData.push([null, null, null, null]);
        currentRow += 2;
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Birleştirmeleri (merges) uygula
    worksheet['!merges'] = merges;

    // Sütun genişlikleri (Standart A4 dikey baskı uyumlu)
    worksheet['!cols'] = [
      { wch: 10 }, // A: Sıra No
      { wch: 22 }, // B: Öğrenci No
      { wch: 38 }, // C: Ad-Soyad
      { wch: 22 }  // D: İmza
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sayfa1');

    const safeName = (courseName || 'SINAV').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_-]/g, '_');
    downloadExcel(workbook, `${safeName}_YOKLAMA_LISTESI.xlsx`);
    return workbook;
  }

  return {
    generate
  };
})();
