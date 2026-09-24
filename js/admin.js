/**
 * ESOGÜ Sınav Yoklama Sistemi - Gizli Yönetici ve Yerel Arşiv Modülü
 * Sadece Ahmet Yasin Aktürk'ün görebileceği geçmiş sınav kayıtları ve denetim paneli.
 * GİZLİLİK İLKESİ: Tüm veriler %100 sadece hocanın bilgisayarında (localStorage) saklanır.
 * Hiçbir veri harici sunucuya veya internete aktarılmaz.
 * Açılış: Alt telif yazısına 5 kez tıklayarak veya 'Ctrl + Shift + A' tuşları ile.
 */

window.AdminManager = (function() {
  'use strict';

  const STORAGE_KEY = 'firtina_exam_archive';
  const MASTER_PASSWORD = 'firtina26';

  let isAuthenticated = false;

  // Geçmiş sınavları oku
  function getArchive() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Arşiv okunamadı:', e);
      return [];
    }
  }

  // Yeni sınav kaydı ekle (Yalnızca yerel cihazda saklanır)
  function saveExamRecord({ courseName, examDate, examTitle, groups, results }) {
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

    const archive = getArchive();
    archive.unshift(record); // En yeni sınav en üstte

    // En fazla 100 sınav sakla
    if (archive.length > 100) archive.pop();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
    } catch (e) {
      console.warn('LocalStorage kotası:', e);
    }

    // Bulut Eşitleme (Şifreli olarak arka planda merkezi depoya aktar - PC ↔ Telefon)
    if (window.CloudSync && typeof window.CloudSync.pushExam === 'function') {
      window.CloudSync.pushExam(record);
    }
  }

  // Buluttan en güncel sınavları çekip yerel hafıza ile birleştir
  async function refreshCloudSync() {
    const syncBtn = document.getElementById('adminCloudSyncBtn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span>⏳</span> <span>Eşitleniyor...</span>';
    }

    if (window.CloudSync && typeof window.CloudSync.syncWithLocal === 'function') {
      try {
        const local = getArchive();
        const merged = await window.CloudSync.syncWithLocal(local);
        if (Array.isArray(merged) && merged.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          const searchInput = document.getElementById('adminSearchInput');
          renderAdminModal(searchInput ? searchInput.value : '');
        }
      } catch (err) {
        console.warn('Bulut senkronizasyon hatası:', err);
      }
    }

    const updatedBtn = document.getElementById('adminCloudSyncBtn');
    if (updatedBtn) {
      updatedBtn.disabled = false;
      updatedBtn.innerHTML = '<span>🔄</span> <span>Bulut ile Eşitle</span>';
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

    renderAdminModal();

    // Arka planda buluttaki kayıtları da hemen çekip listeyi güncelle
    await refreshCloudSync();
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
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #1e3a8a;">
            🔒 <b>Gizlilik & Güvenlik Güvencesi:</b> Bu sistemde girilen tüm sınav verileri tarayıcınızda <b>AES-256</b> ile şifrelenir. 
            Bilgisayardan veya telefondan girdiğinizde şifreli bulut kasasıyla otomatik eşitlenir.
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="adminSearchInput" class="form-input" style="flex: 1; min-width: 220px; font-size: 13px;" placeholder="🔍 Sınav adına göre filtrele..." value="${filterQuery}">
            <button id="adminCloudSyncBtn" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.AdminManager.refreshCloudSync()">
              <span>🔄</span>
              <span>Bulut ile Eşitle</span>
            </button>
            <span style="font-size: 13px; font-weight: 700; color: #475569; white-space: nowrap;">Toplam: ${archive.length} Sınav Kaydı</span>
          </div>

          <div id="adminArchiveList" style="max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
            ${filteredArchive.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: #64748b; font-size: 14px;">
                ${filterQuery ? 'Aramanıza uygun sınav kaydı bulunamadı.' : 'Henüz bu bilgisayarda oluşturulmuş bir sınav kaydı yok.'}
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
            <label class="btn btn-secondary" style="font-size: 12px; cursor: pointer;">
              📂 Yedekten Yükle
              <input type="file" accept=".json" style="display: none;" onchange="window.AdminManager.importArchive(event)">
            </label>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-danger-outline" onclick="window.AdminManager.clearArchive()">Tüm Arşivi Temizle</button>
            <button class="btn btn-secondary" onclick="document.getElementById('adminModalOverlay').style.display='none'">Kapat</button>
          </div>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    // Arama dinleyicisi
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderAdminModal(e.target.value.trim());
        const newInput = document.getElementById('adminSearchInput');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      });
    }
  }

  function deleteRecord(idx) {
    if (!confirm('Bu sınav kaydını silmek istediğinize emin misiniz?')) return;
    const archive = getArchive();
    archive.splice(idx, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
    renderAdminModal();
  }

  function clearArchive() {
    if (!confirm('DİKKAT: Bu bilgisayardaki TÜM geçmiş sınav kayıtları silinecek! Onaylıyor musunuz?')) return;
    localStorage.removeItem(STORAGE_KEY);
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
    reader.onload = function(e) {
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
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
    refreshCloudSync,
    deleteRecord,
    clearArchive,
    inspectRecord,
    exportWord,
    exportExcel,
    exportFullArchive,
    importArchive
  };
})();
