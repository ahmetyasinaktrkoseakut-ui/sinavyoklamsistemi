/**
 * ESOGÜ Sınav Yoklama Sistemi - Dosya ve Veri Ayrıştırıcıları
 * Destekler: PDF, Excel (.xlsx, .xls, .csv), Metin / Pano Kopyala-Yapıştır
 */

window.Parsers = (function() {
  'use strict';

  // Türkçe karakter temizleme ve normalizasyon
  function cleanText(text) {
    if (!text) return '';
    return text.toString().replace(/\s+/g, ' ').trim();
  }

  // Öğrenci numarası tespiti (genelde 8-12 haneli rakamlar)
  function isPossibleStudentNo(val) {
    if (!val) return false;
    const cleaned = val.toString().replace(/\D/g, '');
    return cleaned.length >= 8 && cleaned.length <= 13;
  }

  // Öğrenci adı temizleme (gereksiz OBS eklerini ve rakamları temizler)
  function cleanStudentName(name) {
    if (!name) return '';
    let cleaned = name.toString()
      .replace(/^\d+[\s\.\-]+/, '') // baştaki sıra numarasını at
      .replace(/\b(AKTİF|PASİF|KAYITLI|ASİL|YEDEK|NORMAL ÖĞRETİM|İKİNCİ ÖĞRETİM|LİSANS|İLAHİYAT)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.toLocaleUpperCase('tr-TR');
  }

  /**
   * 1. Kopyala - Yapıştır / Düz Metin Ayrıştırıcı
   */
  function parsePastedText(rawText) {
    if (!rawText) return [];
    const lines = rawText.split(/\r?\n/);
    const students = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Tab ile ayrılmış (Excel / OBS kopyalaması)
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => cleanText(p)).filter(Boolean);
        let studentNo = null;
        let studentName = null;

        for (let part of parts) {
          const digits = part.replace(/\D/g, '');
          if (!studentNo && digits.length >= 8 && digits.length <= 13) {
            studentNo = digits;
          } else if (!studentName && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(part) && !isPossibleStudentNo(part)) {
            // Başlık satırlarını atla
            if (/^(ÖĞRENCİ NO|NUMARA|ADI SOYADI|AD SOYAD|SIRA NO|SIRA)$/i.test(part)) continue;
            studentName = part;
          }
        }

        if (studentNo && studentName) {
          students.push({
            no: studentNo,
            name: cleanStudentName(studentName)
          });
          continue;
        }
      }

      // Boşluklarla ayrılmış satırlar
      // Örnek: "1 181120231042 ELİF DAĞAŞAN" veya "181120231042 ELİF DAĞAŞAN"
      const match = line.match(/(?:^|\s)(\d{8,13})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ\s]{3,})/);
      if (match) {
        const studentNo = match[1];
        const studentName = cleanStudentName(match[2]);
        if (studentName && !/^(ÖĞRENCİ|NUMARA|ADI SOYADI)/i.test(studentName)) {
          students.push({
            no: studentNo,
            name: studentName
          });
          continue;
        }
      }
    }

    return deduplicateStudents(students);
  }

  /**
   * 2. Excel (.xlsx, .xls, .csv) Ayrıştırıcı
   */
  function parseExcel(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Excel kütüphanesi (XLSX) yüklenemedi.');
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length === 0) return [];

    let noColIdx = -1;
    let nameColIdx = -1;

    // Önce başlık satırını ara
    for (let r = 0; r < Math.min(jsonData.length, 10); r++) {
      const row = jsonData[r];
      for (let c = 0; c < row.length; c++) {
        const cell = cleanText(row[c]).toLowerCase();
        if (noColIdx === -1 && (cell.includes('öğrenci no') || cell === 'no' || cell.includes('numara') || cell.includes('ogr no'))) {
          noColIdx = c;
        }
        if (nameColIdx === -1 && (cell.includes('ad') || cell.includes('soyad') || cell.includes('öğrenci adı') || cell.includes('isim'))) {
          nameColIdx = c;
        }
      }
      if (noColIdx !== -1 && nameColIdx !== -1) break;
    }

    const students = [];

    // Başlık bulunduysa oradan oku
    if (noColIdx !== -1 && nameColIdx !== -1) {
      for (let r = 0; r < jsonData.length; r++) {
        const row = jsonData[r];
        const noVal = cleanText(row[noColIdx]).replace(/\D/g, '');
        const nameVal = cleanStudentName(row[nameColIdx]);

        if (isPossibleStudentNo(noVal) && nameVal.length >= 3) {
          students.push({ no: noVal, name: nameVal });
        }
      }
    } else {
      // Başlık yoksa her satırı akıllı tara
      for (let r = 0; r < jsonData.length; r++) {
        const row = jsonData[r];
        let foundNo = null;
        let foundName = null;

        for (let c = 0; c < row.length; c++) {
          const val = cleanText(row[c]);
          const digits = val.replace(/\D/g, '');
          if (!foundNo && digits.length >= 8 && digits.length <= 13) {
            foundNo = digits;
          } else if (!foundName && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(val) && !isPossibleStudentNo(val)) {
            foundName = cleanStudentName(val);
          }
        }

        if (foundNo && foundName) {
          students.push({ no: foundNo, name: foundName });
        }
      }
    }

    return deduplicateStudents(students);
  }

  /**
   * 3. PDF Ayrıştırıcı (OBS Öğrenci Listeleri İçin)
   */
  async function parsePdf(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF kütüphanesi (pdfjsLib) yüklenemedi.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Öğeleri Y koordinatına göre satır satır grupla
      const lineMap = new Map();
      for (let item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]); // Y ekseni konumu
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push({
          x: Math.round(item.transform[4]), // X ekseni konumu
          str: item.str
        });
      }

      // Y eksenini yukarıdan aşağıya sırala (PDF'de Y ters çalışabilir)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (let y of sortedY) {
        const items = lineMap.get(y).sort((a, b) => a.x - b.x);
        const lineStr = items.map(it => it.str).join('\t');
        fullText += lineStr + '\n';
      }
    }

    return parsePastedText(fullText);
  }

  // Mükerrer öğrencileri numaraya göre filtreleme
  function deduplicateStudents(students) {
    const seen = new Set();
    const result = [];
    for (let s of students) {
      if (!seen.has(s.no)) {
        seen.add(s.no);
        result.push(s);
      }
    }
    return result;
  }

  return {
    parsePastedText,
    parseExcel,
    parsePdf
  };
})();
