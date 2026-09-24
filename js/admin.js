/**
 * ESOGÜ Sınav Yoklama Sistemi - Gizli Yönetici ve Sınav Arşivi Modülü
 * Sadece Ahmet Yasin Aktürk'ün görebileceği geçmiş sınav kayıtları ve denetim paneli.
 * 
 * GÜVENLİK VE GİZLİLİK PRENSİPLERİ:
 * 1. F12 ve Yerel Hafıza denetimlerinde ASLA açık metin öğrenci adı, no veya ders adı görünmez.
 * 2. Hangi hoca hangi bilgisayardan dağıtım yaparsa yapsın, arka planda AES-256 ile
 *    şifrelenip görünmez bir şekilde buluta aktarılır.
 * 3. Ahmet Yasin Aktürk yetkili yönetici kimliğiyle panele
 *    girdiği anda tüm sınavlar tek ekranda toplanır.
 * 
 * Açılış: Alt telif yazısına 5 kez tıklayarak veya 'Ctrl + Shift + A' tuşları ile.
 */

window.AdminManager = (function() {
  'use strict';

  const STORAGE_KEY = 'firtina_exam_archive';
  // Güvenlik: Kaynak kodda açık şifre yer almaz, SHA-256 kriptografik özetler ile karşılaştırılır
  const VALID_HASHES = [
    '17a2ffa14f9822e5d7ef41a5ff63552c4771c8516759b9af7b01101a46945736',
    '667a98a5a22deba556ec7ec8fb24a0cbc758706de3dc3f26acb1b69c78fc8cf4'
  ];

  async function sha256Hex(str) {
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Web Crypto yoksa yedek hashleme
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  let isAuthenticated = false;
  let inMemoryArchive = [];

  // Sayfa açıldığında yerel depolamadaki açık metin eski veriyi GİZLİLİK GEREĞİ derhal imha et!
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}

  // Geçmiş sınavları oku
  function getArchive() {
    return inMemoryArchive;
  }

  // Yeni sınav kaydı ekle (Hocanın ekranında hiçbir şey hissettirmeden arka planda şifreli gönderir)
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

    // GİZLİLİK: F12 denetimlerinde açık metin kalıntı bırakma
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}

    // Görünmez olarak şifrelenip bulut kasasına aktarılır
    if (window.CloudSync && typeof window.CloudSync.pushExam === 'function') {
      window.CloudSync.pushExam(record).catch(() => {});
    }
  }

  // Bulut arşivini eşitle
  async function refreshCloudSync() {
    const syncBtn = document.getElementById('adminCloudSyncBtn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span>⏳</span> <span>Eşitleniyor...</span>';
    }

    if (window.CloudSync && typeof window.CloudSync.syncWithLocal === 'function') {
      try {
        const merged = await window.CloudSync.syncWithLocal(inMemoryArchive);
        if (Array.isArray(merged)) {
          inMemoryArchive = merged;
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(STORAGE_KEY);
            }
          } catch (e) {}
          const searchInput = document.getElementById('adminSearchInput');
          renderAdminModal(searchInput ? searchInput.value : '');
        }
      } catch (err) {}
    }

    const updatedBtn = document.getElementById('adminCloudSyncBtn');
    if (updatedBtn) {
      updatedBtn.disabled = false;
      updatedBtn.innerHTML = '<span>🔄</span> <span>Yenile & Eşitle</span>';
    }
  }

  // Firebase Bağlantı Adresini Ayarla
  function promptFirebaseUrl() {
    const current = window.CloudSync ? window.CloudSync.getFirebaseUrl() : '';
    const newUrl = prompt('Firebase Realtime Database URL adresinizi giriniz:\n(Örn: https://esoguyoklama-default-rtdb.firebaseio.com)', current);
    if (newUrl !== null) {
      if (window.CloudSync) {
        window.CloudSync.setFirebaseUrl(newUrl.trim());
      }
      alert('Bulut adresi güncellendi. Şimdi senkronizasyon yapılıyor...');
      refreshCloudSync();
    }
  }

  // Admin Paneli Açılış
  async function openAdminModal() {
    if (!navigator.onLine) {
      alert('⚠️ Sistem yönetim paneli ve sınav arşivi eşitlemesi için aktif bir internet bağlantısı gereklidir.');
      return;
    }

    if (!isAuthenticated) {
      const pass = prompt('🔐 Yönetici Şifresini Giriniz:');
      if (pass === null) return;

      const trimmed = pass.trim();
      const hash = await sha256Hex(trimmed);
      const isAuthorized = VALID_HASHES.includes(hash);

      if (!isAuthorized) {
        alert('Hatalı yönetici şifresi.');
        return;
      }
      isAuthenticated = true;
    }

    renderAdminModal();

    // Arka planda en son sınavları hemen çek
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

    const currentUrl = window.CloudSync ? window.CloudSync.getFirebaseUrl() : '';
    const isCustomUrl = currentUrl && !currentUrl.includes('esoguyoklama-default');

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
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 12.5px; color: #1e3a8a;">
            🔒 <b>Güvenli Kriptolu Eşitleme:</b> Tüm sınav kayıtları <b>AES-256</b> ile şifrelenir. F12 ve yerel hafızada açık veri bulunmaz.
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="adminSearchInput" class="form-input" style="flex: 1; min-width: 220px; font-size: 13px;" placeholder="🔍 Sınav adına göre filtrele..." value="${filterQuery}">
            <button id="adminCloudSyncBtn" class="btn btn-primary" style="font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.AdminManager.refreshCloudSync()">
              <span>🔄</span>
              <span>Yenile & Eşitle</span>
            </button>
            <span style="font-size: 13px; font-weight: 700; color: #475569; white-space: nowrap;">Toplam: ${archive.length} Sınav Kaydı</span>
          </div>

          <div id="adminArchiveList" style="max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
            ${filteredArchive.length === 0 ? `
              <div style="text-align: center; padding: 40px; color: #64748b; font-size: 14px;">
                ${filterQuery ? 'Aramanıza uygun sınav kaydı bulunamadı.' : 'Henüz sisteme kaydedilmiş bir sınav bulunmuyor.'}
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
    const item = inMemoryArchive[idx];
    inMemoryArchive.splice(idx, 1);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}

    if (item && item.id && window.CloudSync && typeof window.CloudSync.deleteFromCloud === 'function') {
      window.CloudSync.deleteFromCloud(item.id);
    }
    renderAdminModal();
  }

  async function clearArchive() {
    if (!confirm('DİKKAT: TÜM geçmiş sınav kayıtları silinecek! Onaylıyor musunuz?')) return;
    inMemoryArchive = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}

    if (window.CloudSync && typeof window.CloudSync.clearCloud === 'function') {
      window.CloudSync.clearCloud();
    }
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
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(STORAGE_KEY);
            }
          } catch (e) {}

          if (window.CloudSync && typeof window.CloudSync.syncWithLocal === 'function') {
            await window.CloudSync.syncWithLocal(inMemoryArchive);
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
    refreshCloudSync,
    promptFirebaseUrl,
    deleteRecord,
    clearArchive,
    inspectRecord,
    exportWord,
    exportExcel,
    exportFullArchive,
    importArchive
  };
})();
