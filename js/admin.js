/**
 * ESOGÜ Sınav Yoklama Sistemi - Gizli Yönetici ve Kriptolu Yerel Arşiv Modülü
 * Sadece Ahmet Yasin Aktürk'ün görebileceği geçmiş sınav kayıtları ve denetim paneli.
 * 
 * GİZLİLİK İLKESİ:
 * - Harici hiçbir sunucu veya Firebase bağlantısı YOKTUR (%100 Sunucusuz & Güvenli).
 * - Tüm veriler tarayıcıda AES-256 ile şifrelenerek 'firtina_vault' anahtarında saklanır.
 * - F12 / Geliştirici Araçları / LocalStorage denetimlerinde ASLA açık metin
 *   öğrenci adı, no veya ders adı görünmez.
 * - PC ↔ Telefon aktarımı şifreli "Hızlı Aktarım Kodu" veya dosya ile tek tıkla yapılır.
 * 
 * Açılış: Alt telif yazısına 5 kez tıklayarak veya 'Ctrl + Shift + A' tuşları ile.
 */

window.AdminManager = (function() {
  'use strict';

  const STORAGE_KEY = 'firtina_exam_archive';
  const MASTER_PASSWORD = 'firtina26';

  let isAuthenticated = false;
  let inMemoryArchive = [];

  // Sayfa açıldığında yerel depolamadaki açık metin eski veriyi GİZLİLİK GEREĞİ derhal imha et!
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {}

  // Geçmiş sınavları oku
  function getArchive() {
    return inMemoryArchive;
  }

  // Yeni sınav kaydı ekle (AES-256 ile şifrelenerek kasaya yazılır, açık metin ASLA tutulmaz)
  async function saveExamRecord({ courseName, examDate, examTitle, groups, results }) {
    const totalStudents = results.reduce((acc, r) => acc + r.students.length, 0);
    const totalRooms = results.length;

    const cleanCourseName = (courseName || '').trim() || 'İSİMSİZ SINAV';

    const record = {
      id: 'exam_' + Date.now(),
      createdAt: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('tr-TR'),
      courseName: cleanCourseName,
      examDate: (examDate || '').trim() || 'Tarih Belirtilmedi',
      examTitle: (examTitle || '').trim() || '',
      totalStudents,
      totalRooms,
      groupsSummary: groups.map(g => `${g.name}: ${g.students ? g.students.length : 0} öğrenci`).join(', '),
      results
    };

    inMemoryArchive.unshift(record);
    if (inMemoryArchive.length > 100) inMemoryArchive.pop();

    // GİZLİLİK VE GÜVENLİK GARANTİSİ:
    // Açık metin localStorage kalıntısını temizle
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    // Şifreli yerel kasaya kaydet (AES-256)
    if (window.CryptoVault && typeof window.CryptoVault.saveVault === 'function') {
      await window.CryptoVault.saveVault(inMemoryArchive);
    }
  }

  // Hızlı Aktarım Kodu Kopyala (PC -> Telefon için)
  async function copyTransferCode() {
    const archive = getArchive();
    if (archive.length === 0) {
      alert('Kopyalanacak kayıtlı sınav bulunamadı.');
      return;
    }
    if (window.CryptoVault && typeof window.CryptoVault.exportTransferCode === 'function') {
      try {
        const code = await window.CryptoVault.exportTransferCode(archive);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
          alert('✅ Aktarım kodu panoya kopyalandı!\n\nBu kodu WhatsApp ile kendinize gönderip, telefonda bu paneli açarak "Kodu Yapıştır & Yükle" butonuna tıklayınız.');
        } else {
          prompt('Aktarım kodunuz (Kopyalayıp WhatsApp ile kendinize atınız):', code);
        }
      } catch (e) {
        alert('Aktarım kodu oluşturulamadı: ' + e.message);
      }
    }
  }

  // Hızlı Aktarım Kodunu Yapıştır ve Yükle
  async function pasteTransferCode() {
    const code = prompt('Telefona veya başka cihaza aktarmak istediğiniz aktarım kodunu buraya yapıştırınız:');
    if (!code || !code.trim()) return;

    if (window.CryptoVault && typeof window.CryptoVault.importTransferCode === 'function') {
      try {
        const imported = await window.CryptoVault.importTransferCode(code.trim());
        if (Array.isArray(imported) && imported.length > 0) {
          const current = getArchive();
          const combined = [...imported, ...current];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item);
            }
          }
          unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          inMemoryArchive = unique;
          if (window.CryptoVault && typeof window.CryptoVault.saveVault === 'function') {
            await window.CryptoVault.saveVault(inMemoryArchive);
          }
          alert(`✅ Harika! ${imported.length} adet sınav kaydı başarıyla yüklendi.`);
          renderAdminModal();
        } else {
          alert('❌ Geçersiz aktarım kodu veya veri boş.');
        }
      } catch (e) {
        alert('Aktarım kodu çözülürken hata: ' + e.message);
      }
    }
  }

  // Admin Paneli Açılış
  async function openAdminModal() {
    if (!isAuthenticated) {
      const pass = prompt('🔐 Yönetici Şifresini Giriniz:');
      if (pass !== MASTER_PASSWORD) {
        if (pass !== null) alert('Hatalı şifre.');
        return;
      }
      isAuthenticated = true;
    }

    // Şifreli kasadan hafızaya yükle
    if (window.CryptoVault && typeof window.CryptoVault.loadVault === 'function') {
      try {
        const vaultData = await window.CryptoVault.loadVault();
        if (Array.isArray(vaultData) && vaultData.length > 0) {
          const combined = [...inMemoryArchive, ...vaultData];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item);
            }
          }
          unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          inMemoryArchive = unique;
        }
      } catch (e) {
        console.warn('Kasa yükleme hatası:', e);
      }
    }

    renderAdminModal();
  }

  function renderAdminModal(filterQuery = '') {
    let overlay = document.getElementById('adminModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'adminModalOverlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const archive = getArchive();
    const filteredArchive = filterQuery 
      ? archive.filter(item => item.courseName.toLowerCase().includes(filterQuery.toLowerCase()))
      : archive;

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 860px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🔐</span>
            <h3>Sistem Yönetim ve Sınav Arşivi (Ahmet Yasin Aktürk)</h3>
          </div>
          <button class="modal-close" onclick="document.getElementById('adminModalOverlay').style.display='none'">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; color: #1e3a8a;">
            🔒 <b>%100 Güvenli & Kriptolu Yerel Kasa:</b> Sınav verileriniz harici hiçbir sunucuya iletilmez. 
            Tüm kayıtlar tarayıcınızda <b>AES-256</b> ile şifrelenir. F12 geliştirici araçlarında öğrenci veya ders adı <b>kesinlikle görünmez</b>.
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #334155; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">📲</span>
              <div>
                <b>Sunucusuz Cihazlar Arası Aktarım (PC ↔ Telefon):</b>
                <div style="font-size: 11px; color: #64748b;">Tek tıkla aktarım kodunu kopyalayıp WhatsApp'tan kendinize atarak telefonunuza aktarabilirsiniz.</div>
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn btn-primary" style="font-size: 11.5px; padding: 6px 12px;" onclick="window.AdminManager.copyTransferCode()">📋 Aktarım Kodu Kopyala</button>
              <button type="button" class="btn btn-secondary" style="font-size: 11.5px; padding: 6px 12px;" onclick="window.AdminManager.pasteTransferCode()">📥 Kodu Yapıştır & Yükle</button>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="adminSearchInput" class="form-input" style="flex: 1; min-width: 220px; font-size: 13px;" placeholder="🔍 Sınav adına göre filtrele..." value="${filterQuery}">
            <span style="font-size: 13px; font-weight: 700; color: #475569; white-space: nowrap;">Toplam: ${archive.length} Sınav Kaydı</span>
          </div>

          <div id="adminArchiveList" style="max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
            ${filteredArchive.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: #64748b; font-size: 14px;">
                ${filterQuery ? 'Aramanıza uygun sınav kaydı bulunamadı.' : 'Henüz bu cihazda kayıtlı bir sınav arşivi yok.'}
              </div>
            ` : ''}

            ${filteredArchive.map((item, idx) => `
              <div class="archive-card" style="padding: 14px 16px; border-left: 4px solid #1e3a8a; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">📚</span>
                    <strong style="color: #1e3a8a; font-size: 15px; letter-spacing: 0.2px;">${item.courseName}</strong>
                  </div>
                  
                  <div style="font-size: 12.5px; color: #475569; margin-top: 6px; display: flex; flex-wrap: wrap; gap: 14px;">
                    <span>📅 <b>Sınav Tarihi:</b> ${item.examDate}</span>
                    <span>🕒 <b>Hazırlanma:</b> ${item.formattedDate}</span>
                    <span>👥 <b>Toplam:</b> ${item.totalStudents} Öğrenci</span>
                    <span>🏫 <b>Salon:</b> ${item.totalRooms} Derslik</span>
                  </div>

                  ${item.examTitle ? `
                    <div style="margin-top: 4px; font-size: 11.5px; color: #64748b;">
                      <b>Başlık:</b> ${item.examTitle}
                    </div>
                  ` : ''}

                  <div style="margin-top: 4px; font-size: 11.5px; color: #64748b;">
                    <b>Dağıtılan Salonlar:</b> ${item.results ? item.results.map(r => `${r.roomName} (${r.students.length})`).join(', ') : ''}
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px; margin-left: 14px; min-width: 140px;">
                  <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 10px;" onclick="window.AdminManager.inspectRecord(${idx})">📋 İncele</button>
                  <div style="display: flex; gap: 4px;">
                    <button class="btn btn-primary" style="font-size: 11px; padding: 5px 8px; flex: 1;" onclick="window.AdminManager.exportWord(${idx})">Word</button>
                    <button class="btn btn-success" style="font-size: 11px; padding: 5px 8px; flex: 1;" onclick="window.AdminManager.exportExcel(${idx})">Excel</button>
                  </div>
                  <button class="btn btn-danger-outline" style="font-size: 11px; padding: 4px 6px;" onclick="window.AdminManager.deleteRecord(${idx})">Sil</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" style="font-size: 12px;" onclick="window.AdminManager.exportFullArchive()">💾 Arşivi Yedekle (JSON)</button>
            <label class="btn btn-secondary" style="font-size: 12px; margin-bottom: 0; cursor: pointer;">
              📂 Yedek Yükle (JSON)
              <input type="file" accept=".json" style="display: none;" onchange="window.AdminManager.importArchive(event)">
            </label>
          </div>
          <button class="btn btn-danger-outline" style="font-size: 12px;" onclick="window.AdminManager.clearArchive()">⚠️ Tüm Arşivi Temizle</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    // Arama kutusu olayı
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        renderAdminModal(e.target.value.trim());
        const newInput = document.getElementById('adminSearchInput');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      });
    }
  }

  async function deleteRecord(idx) {
    if (!confirm('Bu sınav kaydını silmek istediğinize emin misiniz?')) return;
    inMemoryArchive.splice(idx, 1);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    if (window.CryptoVault && typeof window.CryptoVault.saveVault === 'function') {
      await window.CryptoVault.saveVault(inMemoryArchive);
    }
    renderAdminModal();
  }

  async function clearArchive() {
    if (!confirm('DİKKAT: Bu cihazdaki TÜM geçmiş sınav kayıtları silinecek! Onaylıyor musunuz?')) return;
    inMemoryArchive = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('firtina_vault');
    } catch (e) {}
    renderAdminModal();
  }

  function inspectRecord(idx) {
    const archive = getArchive();
    const item = archive[idx];
    if (!item) return;

    let text = `==========================================================\n`;
    text += `  ESOGÜ İLAHİYAT FAKÜLTESİ SINAV DETAYI\n`;
    text += `==========================================================\n`;
    text += `DERS ADI        : ${item.courseName}\n`;
    text += `SINAV TARİHİ    : ${item.examDate}\n`;
    if (item.examTitle) {
      text += `BAŞLIK          : ${item.examTitle}\n`;
    }
    text += `OLUŞTURULMA     : ${item.formattedDate}\n`;
    text += `TOPLAM ÖĞRENCİ  : ${item.totalStudents}\n`;
    text += `TOPLAM SALON    : ${item.totalRooms}\n`;
    text += `----------------------------------------------------------\n\n`;

    for (const r of item.results) {
      text += `[SALON: ${r.roomName}] (${r.students.length} Öğrenci - Kapasite: ${r.capacity})\n`;
      text += `----------------------------------------------------------\n`;
      for (const s of r.students) {
        text += `  ${s.siraNo.toString().padStart(2, ' ')}. [${s.no}]  ${s.name}\n`;
      }
      text += `\n`;
    }

    const w = window.open('', '_blank');
    w.document.write(`<title>${item.courseName} - Sınav Detayı</title><pre style="font-family: Consolas, monospace; padding: 24px; font-size: 13px; line-height: 1.5; background: #0f172a; color: #f8fafc; border-radius: 8px;">${text}</pre>`);
  }

  function exportWord(idx) {
    const archive = getArchive();
    const item = archive[idx];
    if (!item || !window.DocxExporter) return;
    window.DocxExporter.generate({
      courseName: item.courseName,
      examDate: item.examDate,
      examTitle: item.examTitle,
      results: item.results
    });
  }

  function exportExcel(idx) {
    const archive = getArchive();
    const item = archive[idx];
    if (!item || !window.ExcelExporter) return;
    window.ExcelExporter.generate({
      courseName: item.courseName,
      examDate: item.examDate,
      examTitle: item.examTitle,
      results: item.results
    });
  }

  function exportFullArchive() {
    const archive = getArchive();
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESOGU_SINAV_ARSIVI_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function importArchive(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          const current = getArchive();
          const combined = [...imported, ...current];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              unique.push(item);
            }
          }
          unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          inMemoryArchive = unique;
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          if (window.CryptoVault && typeof window.CryptoVault.saveVault === 'function') {
            await window.CryptoVault.saveVault(inMemoryArchive);
          }
          alert(`Başarılı! ${imported.length} adet sınav kaydı arşive aktarıldı.`);
          renderAdminModal();
        } else {
          alert('Geçersiz arşiv dosyası.');
        }
      } catch (err) {
        alert('Dosya okunurken hata oluştu: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // Kısayol Dinleyicisi (Ctrl + Shift + A)
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        openAdminModal();
      }
    });
  }

  return {
    saveExamRecord,
    openAdminModal,
    copyTransferCode,
    pasteTransferCode,
    deleteRecord,
    clearArchive,
    inspectRecord,
    exportWord,
    exportExcel,
    exportFullArchive,
    importArchive
  };
})();
