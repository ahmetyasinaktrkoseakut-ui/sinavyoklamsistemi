/**
 * ESOGÜ Sınav Yoklama Sistemi - Word (.docx) Çıktı Oluşturucu
 * Her sınıf/salon için A4 dikey, kenar boşlukları ayarlı, tablo ve 'FIRTINA YAZILIM HİZMETİ' imzalı belge üretir.
 */

window.DocxExporter = (function() {
  'use strict';

  function downloadDocx(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'SINAV_YOKLAMA_LISTESI.docx';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Dağıtılmış sınav listesini Word (.docx) formatında oluşturur ve indirir
   */
  async function generate({ courseName, examDate, results, academicYear = '2025-2026 EĞİTİM-ÖĞRETİM YILI BAHAR YARIYILI' }) {
    if (typeof docx === 'undefined') {
      throw new Error('Word kütüphanesi (docx) yüklenemedi.');
    }

    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
      TextRun,
      BorderStyle
    } = docx;

    const sections = [];

    const borderThin = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: '444444'
    };

    const bordersAll = {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin
    };

    for (let i = 0; i < results.length; i++) {
      const room = results[i];
      const children = [];

      // 1. Fakülte ve Sınav Başlığı
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: 'ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ İLAHİYAT FAKÜLTESİ',
              bold: true,
              size: 23, // 11.5 pt
              font: 'Calibri'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: `${academicYear} FİNAL SINAVI YOKLAMA LİSTESİ`,
              bold: true,
              size: 21, // 10.5 pt
              font: 'Calibri'
            })
          ]
        })
      );

      // 2. Bilgi Başlığı (Ders, Tarih, Salon)
      const infoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'DERS: ', bold: true, size: 20 }),
                      new TextRun({ text: courseName || 'Belirtilmedi', size: 20 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: room.roomName, bold: true, size: 22 })
                    ]
                  })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'TARİH - SAAT: ', bold: true, size: 20 }),
                      new TextRun({ text: examDate || 'Belirtilmedi', size: 20 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: `ÖĞRENCİ: ${room.students.length} / ${room.capacity}`, size: 19 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });

      children.push(infoTable);
      children.push(new Paragraph({ spacing: { after: 120 } }));

      // 3. Öğrenci Listesi Tablosu
      const tableRows = [];

      // Tablo Başlık Satırı
      tableRows.push(
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              borders: bordersAll,
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'SIRA NO', bold: true, size: 19 })]
                })
              ]
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: bordersAll,
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'ÖĞRENCİ NO', bold: true, size: 19 })]
                })
              ]
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: bordersAll,
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'AD-SOYAD', bold: true, size: 19 })]
                })
              ]
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: bordersAll,
              shading: { fill: 'F1F5F9' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'İMZA', bold: true, size: 19 })]
                })
              ]
            })
          ]
        })
      );

      // Öğrenci Satırları
      for (const st of room.students) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                width: { size: 10, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: st.siraNo.toString(), size: 19 })]
                  })
                ]
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: st.no || '', size: 19 })]
                  })
                ]
              }),
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: st.name || '', size: 19 })]
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: bordersAll,
                children: [new Paragraph({})]
              })
            ]
          })
        );
      }

      const studentTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows
      });

      children.push(studentTable);

      // 4. Gözetmen Alanı
      children.push(
        new Paragraph({
          spacing: { before: 180, after: 120 },
          children: [
            new TextRun({
              text: 'GÖZETMEN: ................................................................                  İMZA: ........................',
              bold: true,
              size: 20
            })
          ]
        })
      );

      // 5. Firma İmzası (FIRTINA YAZILIM HİZMETİ) - Sayfa Sonu / Tablo Altı
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: 'FIRTINA YAZILIM HİZMETİ',
              bold: true,
              italics: true,
              size: 16,
              color: '555555',
              font: 'Calibri'
            })
          ]
        })
      );

      // Her salonu ayrı A4 sayfasına yerleştir
      sections.push({
        properties: {
          page: {
            margin: {
              top: 720,    // 12.7 mm
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: children
      });
    }

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    const safeName = (courseName || 'SINAV').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_-]/g, '_');
    downloadDocx(blob, `${safeName}_YOKLAMA_LISTESI.docx`);
    return blob;
  }

  return {
    generate
  };
})();
