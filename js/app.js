/**
 * ESOGÜ Sınav Yoklama Sistemi - Ana Uygulama Arayüz Kontrolörü
 */

(function() {
  'use strict';

  // GİZLİLİK VE VERİ GÜVENLİĞİ:
  // F12 ve Yerel Hafıza denetimlerinde açık metin öğrenci kalıntısı bırakmamak için
  // Eski yerel depolama anahtarlarını derhal temizle
  try {
    localStorage.removeItem('firtina_exam_archive');
    sessionStorage.removeItem('firtina_exam_archive');
  } catch (e) {}

  // Uygulama Durumu (State)
  const state = {
    courseName: '',
    examDate: '',
    examTitle: '',
    academicYear: '',
    classrooms: window.Distributor.getDefaultClassrooms(),
    groups: [
      {
        id: 'group-1',
        name: 'Grup 1',
        students: [],
        selectedRoomIds: ['derslik-1', 'derslik-2', 'derslik-3']
      }
    ],
    results: null,
    activeTabIdx: 0
  };

  // DOM Elemanları
  let elCourseName, elExamDate, elExamTitle, elGroupsContainer, elAddGroupBtn, elDistributeBtn;
  let elResultsSection, elResultTabs, elResultContent, elWordExportBtn, elExcelExportBtn, elPrintBtn;
  let elPasteModal, elPasteTextarea, elPasteConfirmBtn, currentPasteGroupId = null;

  // Başlatma
  document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEvents();
    renderGroups();
  });

  function initElements() {
    elCourseName = document.getElementById('courseName');
    elExamDate = document.getElementById('examDate');
    elExamTitle = document.getElementById('examTitle');
    elGroupsContainer = document.getElementById('groupsContainer');
    elAddGroupBtn = document.getElementById('addGroupBtn');
    elDistributeBtn = document.getElementById('distributeBtn');
    elResultsSection = document.getElementById('resultsSection');
    elResultTabs = document.getElementById('resultTabs');
    elResultContent = document.getElementById('resultContent');
    elWordExportBtn = document.getElementById('wordExportBtn');
    elExcelExportBtn = document.getElementById('excelExportBtn');
    elPrintBtn = document.getElementById('printBtn');
    elPasteModal = document.getElementById('pasteModal');
    elPasteTextarea = document.getElementById('pasteTextarea');
    elPasteConfirmBtn = document.getElementById('pasteConfirmBtn');
  }

  function initEvents() {
    elCourseName.addEventListener('input', (e) => state.courseName = e.target.value);
    elExamDate.addEventListener('input', (e) => state.examDate = e.target.value);
    if (elExamTitle) {
      state.examTitle = elExamTitle.value;
      elExamTitle.addEventListener('input', (e) => state.examTitle = e.target.value);
    }

    elAddGroupBtn.addEventListener('click', () => {
      const nextNum = state.groups.length + 1;
      state.groups.push({
        id: 'group-' + Date.now(),
        name: `Grup ${nextNum}`,
        students: [],
        selectedRoomIds: []
      });
      renderGroups();
    });

    elDistributeBtn.addEventListener('click', handleDistribute);

    elWordExportBtn.addEventListener('click', () => {
      if (!state.results) return;
      window.DocxExporter.generate({
        courseName: state.courseName,
        examDate: state.examDate,
        examTitle: state.examTitle,
        academicYear: state.academicYear,
        results: state.results
      });
    });

    elExcelExportBtn.addEventListener('click', () => {
      if (!state.results) return;
      window.ExcelExporter.generate({
        courseName: state.courseName,
        examDate: state.examDate,
        examTitle: state.examTitle,
        academicYear: state.academicYear,
        results: state.results
      });
    });

    elPrintBtn.addEventListener('click', () => {
      window.print();
    });

    // Kullanım Kılavuzu Modalı Kontrolleri
    const elGuideModal = document.getElementById('guideModal');
    const elGuideConfirmBtn = document.getElementById('guideConfirmBtn');
    const elGuideCloseX = document.getElementById('guideCloseX');
    const elHeaderGuideBtn = document.getElementById('headerGuideBtn');
    const elFloatingGuideBtn = document.getElementById('floatingGuideBtn');

    const elGuideVideo = document.getElementById('guideVideoPlayer');
    const elLightboxModal = document.getElementById('videoLightboxModal');
    const elLightboxVideo = document.getElementById('lightboxVideoPlayer');
    const elVideoExpandBtn = document.getElementById('guideVideoExpandBtn');
    const elVideoClickHint = document.getElementById('videoClickExpandHint');
    const elLightboxCloseBtn = document.getElementById('videoLightboxCloseBtn');

    function openVideoLightbox() {
      if (!elLightboxModal || !elLightboxVideo) return;
      if (elGuideVideo) {
        elLightboxVideo.currentTime = elGuideVideo.currentTime;
        elGuideVideo.pause();
      }
      elLightboxModal.style.display = 'flex';
      elLightboxVideo.play().catch(() => {});
    }

    function closeVideoLightbox() {
      if (!elLightboxModal || !elLightboxVideo) return;
      if (elGuideVideo) {
        elGuideVideo.currentTime = elLightboxVideo.currentTime;
      }
      elLightboxVideo.pause();
      elLightboxModal.style.display = 'none';
    }

    if (elVideoExpandBtn) elVideoExpandBtn.addEventListener('click', openVideoLightbox);
    if (elVideoClickHint) {
      elVideoClickHint.addEventListener('click', (e) => {
        e.stopPropagation();
        openVideoLightbox();
      });
    }
    if (elLightboxCloseBtn) elLightboxCloseBtn.addEventListener('click', closeVideoLightbox);
    if (elLightboxModal) {
      elLightboxModal.addEventListener('click', (e) => {
        if (e.target === elLightboxModal) closeVideoLightbox();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elLightboxModal && elLightboxModal.style.display === 'flex') {
        closeVideoLightbox();
      }
    });

    function closeGuide() {
      if (elGuideModal) elGuideModal.style.display = 'none';
      if (elGuideVideo) elGuideVideo.pause();
      closeVideoLightbox();
    }

    function openGuide() {
      if (elGuideModal) elGuideModal.style.display = 'flex';
    }

    if (elGuideConfirmBtn) elGuideConfirmBtn.addEventListener('click', closeGuide);
    if (elGuideCloseX) elGuideCloseX.addEventListener('click', closeGuide);
    if (elHeaderGuideBtn) elHeaderGuideBtn.addEventListener('click', openGuide);
    if (elFloatingGuideBtn) elFloatingGuideBtn.addEventListener('click', openGuide);

    if (elGuideModal) {
      elGuideModal.addEventListener('click', (e) => {
        if (e.target === elGuideModal) closeGuide();
      });
    }

    // Pano Modal Kapat
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        if (elPasteModal) elPasteModal.style.display = 'none';
      });
    });

    // Gruplar arası mükerrer öğrenci denetimi (Aynı öğrenci başka bir grupta var mı?)
    function checkCrossGroupConflicts(targetGroupId, newStudents) {
      const conflicts = [];
      const valid = [];

      const registry = new Map();
      for (const g of state.groups) {
        if (g.id === targetGroupId) continue;
        for (const s of (g.students || [])) {
          const noKey = (s.no || '').toString().trim();
          if (noKey) {
            registry.set(`no_${noKey}`, g.name);
          }
          const nameKey = (s.name || '').toString().trim().toLowerCase();
          if (nameKey) {
            registry.set(`name_${nameKey}`, g.name);
          }
        }
      }

      for (const s of newStudents) {
        const noKey = (s.no || '').toString().trim();
        const nameKey = (s.name || '').toString().trim().toLowerCase();

        let conflictingGroupName = null;
        if (noKey && registry.has(`no_${noKey}`)) {
          conflictingGroupName = registry.get(`no_${noKey}`);
        } else if (nameKey && registry.has(`name_${nameKey}`)) {
          conflictingGroupName = registry.get(`name_${nameKey}`);
        }

        if (conflictingGroupName) {
          conflicts.push({
            no: s.no || 'Yok',
            name: s.name,
            groupName: conflictingGroupName
          });
        } else {
          valid.push(s);
        }
      }

      return { valid, conflicts };
    }

    // Pano Onayla
    elPasteConfirmBtn.addEventListener('click', () => {
      if (!currentPasteGroupId) return;
      const text = elPasteTextarea.value;
      const students = window.Parsers.parsePastedText(text);
      if (students.length === 0) {
        alert('Yapıştırılan metinde geçerli öğrenci bilgisi tespit edilemedi.');
        return;
      }
      const grp = state.groups.find(g => g.id === currentPasteGroupId);
      if (grp) {
        const { valid, conflicts } = checkCrossGroupConflicts(grp.id, students);

        const existing = grp.students || [];
        const combined = [...existing, ...valid];
        const seen = new Set();
        const unique = [];
        for (const s of combined) {
          if (!seen.has(s.no)) {
            seen.add(s.no);
            unique.push(s);
          }
        }
        const addedCount = unique.length - existing.length;
        grp.students = unique;
        renderGroups();

        let msg = `✅ ${addedCount} yeni öğrenci gruba aktarıldı! (Grup Toplamı: ${unique.length} Öğrenci)`;
        if (conflicts.length > 0) {
          msg += `\n\n⛔ Gruplar Arası Mükerrer Engeli (${conflicts.length} Öğrenci):\nAşağıdaki öğrenciler başka bir grupta zaten kayıtlı olduğu için bu gruba eklenmedi:\n` +
            conflicts.slice(0, 8).map(c => `• ${c.name} (${c.no}) → "${c.groupName}" grubunda kayıtlı`).join('\n') +
            (conflicts.length > 8 ? `\n...ve ${conflicts.length - 8} öğrenci daha.` : '');
        }
        alert(msg);
      }
      elPasteModal.style.display = 'none';
      elPasteTextarea.value = '';
    });

    // Gizli Yönetici Açılışı (Alt Telife 5 kez tıklama veya çift tıklama)
    let footerClicks = 0;
    let clickTimer = null;
    const footerCredit = document.getElementById('footerCredit');
    if (footerCredit) {
      footerCredit.addEventListener('click', () => {
        footerClicks++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => footerClicks = 0, 1500);
        if (footerClicks >= 5) {
          footerClicks = 0;
          window.AdminManager.openAdminModal();
        }
      });
    }

    const footerFirm = document.querySelector('.footer-firm');
    if (footerFirm) {
      footerFirm.addEventListener('dblclick', () => {
        window.AdminManager.openAdminModal();
      });
    }
  }

  // Grupları ve Arayüzü Ekrana Çiz
  function renderGroups() {
    elGroupsContainer.innerHTML = '';

    state.groups.forEach((group, gIdx) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group-item';

      // Seçilen salonların toplam kapasitesini hesapla
      const selectedRooms = state.classrooms.filter(c => group.selectedRoomIds.includes(c.id));
      const totalCapacity = selectedRooms.reduce((acc, c) => acc + c.defaultCapacity, 0);
      const studentCount = group.students.length;

      let statusBadgeClass = 'ok';
      let statusBadgeText = `Kapasite Yeterli (${studentCount} / ${totalCapacity})`;

      if (studentCount > totalCapacity) {
        statusBadgeClass = 'danger';
        statusBadgeText = `Kapasite Yetersiz! (+${studentCount - totalCapacity} kişi fazla)`;
      } else if (totalCapacity === 0 && studentCount > 0) {
        statusBadgeClass = 'warning';
        statusBadgeText = 'Derslik Seçilmedi!';
      }

      groupEl.innerHTML = `
        <div class="group-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="text" class="group-name-input" value="${group.name}" data-group-id="${group.id}">
            <span class="student-count-badge">👥 ${studentCount} Öğrenci</span>
            <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
          </div>
          ${state.groups.length > 1 ? `
            <button class="btn btn-danger-outline remove-group-btn" data-group-id="${group.id}">Grubu Sil</button>
          ` : ''}
        </div>

        <div class="upload-options">
          <label class="upload-btn" title="Birden fazla şubenin PDF'ini aynı anda veya sırayla seçebilirsiniz">
            📄 PDF Listesi Yükle (Çoklu Seçilebilir)
            <input type="file" accept=".pdf" multiple style="display:none" class="pdf-upload-input" data-group-id="${group.id}">
          </label>
          <label class="upload-btn" title="Birden fazla Excel dosyasını seçebilirsiniz">
            📊 Excel / CSV Yükle (Çoklu Seçilebilir)
            <input type="file" accept=".xlsx,.xls,.csv" multiple style="display:none" class="excel-upload-input" data-group-id="${group.id}">
          </label>
          <button type="button" class="upload-btn paste-btn" data-group-id="${group.id}">
            📋 Metin / Pano Yapıştır
          </button>
        </div>

        ${studentCount > 0 ? `
          <div style="margin-bottom: 12px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>İlk 3 Öğrenci: <b>${group.students.slice(0, 3).map(s => s.name).join(', ')}...</b></span>
            <a href="javascript:void(0)" class="clear-students-link" data-group-id="${group.id}" style="color: var(--danger); text-decoration: none;">Öğrencileri Temizle</a>
          </div>
        ` : ''}

        <div style="margin-top: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label class="form-label" style="font-weight: 700; color: var(--primary);">Bu Grubun Dağıtılacağı Derslikleri Seçin:</label>
            <button type="button" class="btn btn-secondary add-custom-room-btn" style="padding: 4px 8px; font-size: 11px;">+ Özel Salon Ekle</button>
          </div>
          <div class="classroom-grid" data-group-id="${group.id}">
            ${renderClassroomCards(group)}
          </div>
        </div>
      `;

      elGroupsContainer.appendChild(groupEl);
    });

    bindGroupEvents();
  }

  // Derslik Kartlarını Çiz
  function renderClassroomCards(group) {
    return state.classrooms.map(room => {
      const isSelected = group.selectedRoomIds.includes(room.id);
      const otherGroup = state.groups.find(g => g.id !== group.id && g.selectedRoomIds.includes(room.id));
      const isOccupied = !!otherGroup;

      return `
        <div class="classroom-card ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}" 
             data-room-id="${room.id}" 
             data-group-id="${group.id}"
             ${isOccupied ? `data-occupied-by="${otherGroup.name}" title="Bu derslik '${otherGroup.name}' tarafından seçilmiştir."` : ''}>
          <div class="classroom-card-header">
            <span class="classroom-name">${room.name}</span>
            ${isOccupied ? `
              <span class="classroom-occupied-badge" title="${otherGroup.name} grubunda seçili">🔒 ${otherGroup.name}</span>
            ` : `
              <input type="checkbox" ${isSelected ? 'checked' : ''} style="cursor: pointer;">
            `}
          </div>
          <div class="classroom-capacity-control" onclick="event.stopPropagation();">
            <span>Kontenjan:</span>
            <input type="number" class="capacity-input" value="${room.defaultCapacity}" min="1" max="500" data-room-id="${room.id}" ${isOccupied ? 'disabled' : ''}>
            ${room.id === 'derslik-18' && !isOccupied ? `
              <button type="button" class="classroom-toggle-btn toggle-18-btn" data-room-id="${room.id}">
                ${room.defaultCapacity === 39 ? '45 Yap' : '39 Yap'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Dinamik Olay Dinleyicileri
  function bindGroupEvents() {
    // Grup adı değişimi
    document.querySelectorAll('.group-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const grp = state.groups.find(g => g.id === e.target.dataset.groupId);
        if (grp) grp.name = e.target.value.trim() || 'İsimsiz Grup';
      });
    });

    // Grup silme
    document.querySelectorAll('.remove-group-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.groups = state.groups.filter(g => g.id !== e.target.dataset.groupId);
        renderGroups();
      });
    });

    // PDF Yükleme (Çoklu Dosya Destekli)
    document.querySelectorAll('.pdf-upload-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        const grp = state.groups.find(g => g.id === e.target.dataset.groupId);
        if (!grp) return;

        let allNewStudents = [];
        let errors = [];
        let processedCount = 0;

        for (const file of files) {
          if (file.size === 0) {
            errors.push(`⚠️ "${file.name}" dosyasının boyutu 0 Bayt (boş dosya).`);
            continue;
          }

          try {
            const buffer = await file.arrayBuffer();
            const students = await window.Parsers.parsePdf(buffer);
            if (students.length === 0) {
              errors.push(`"${file.name}" dosyasında öğrenci tespit edilemedi.`);
            } else {
              allNewStudents.push(...students);
              processedCount++;
            }
          } catch (err) {
            errors.push(`"${file.name}" okunurken hata: ${err.message}`);
          }
        }

        if (allNewStudents.length > 0) {
          const { valid, conflicts } = checkCrossGroupConflicts(grp.id, allNewStudents);

          const existing = grp.students || [];
          const combined = [...existing, ...valid];
          const seen = new Set();
          const unique = [];
          for (const s of combined) {
            if (!seen.has(s.no)) {
              seen.add(s.no);
              unique.push(s);
            }
          }
          const addedCount = unique.length - existing.length;
          grp.students = unique;
          renderGroups();
          
          let msg = `✅ ${processedCount} adet PDF başarıyla aktarıldı!\nEklenen Yeni Öğrenci: ${addedCount}\nGrubun Toplam Öğrenci Sayısı: ${unique.length}`;
          if (conflicts.length > 0) {
            msg += `\n\n⛔ Gruplar Arası Mükerrer Engeli (${conflicts.length} Öğrenci):\nAşağıdaki öğrenciler başka bir grupta zaten kayıtlı olduğu için bu gruba eklenmedi:\n` +
              conflicts.slice(0, 8).map(c => `• ${c.name} (${c.no}) → "${c.groupName}" grubunda kayıtlı`).join('\n') +
              (conflicts.length > 8 ? `\n...ve ${conflicts.length - 8} öğrenci daha.` : '');
          }
          if (errors.length > 0) {
            msg += `\n\nUyarılar:\n` + errors.join('\n');
          }
          alert(msg);
        } else if (errors.length > 0) {
          alert('Dosyalar yüklenirken sorun oluştu:\n' + errors.join('\n'));
        }

        e.target.value = '';
      });
    });

    // Excel Yükleme (Çoklu Dosya Destekli)
    document.querySelectorAll('.excel-upload-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        const grp = state.groups.find(g => g.id === e.target.dataset.groupId);
        if (!grp) return;

        let allNewStudents = [];
        let errors = [];
        let processedCount = 0;

        for (const file of files) {
          if (file.size === 0) {
            errors.push(`⚠️ "${file.name}" dosyası boş.`);
            continue;
          }

          try {
            const buffer = await file.arrayBuffer();
            const students = window.Parsers.parseExcel(buffer);
            if (students.length === 0) {
              errors.push(`"${file.name}" dosyasında geçerli öğrenci listesi bulunamadı.`);
            } else {
              allNewStudents.push(...students);
              processedCount++;
            }
          } catch (err) {
            errors.push(`"${file.name}" okunurken hata: ${err.message}`);
          }
        }

        if (allNewStudents.length > 0) {
          const { valid, conflicts } = checkCrossGroupConflicts(grp.id, allNewStudents);

          const existing = grp.students || [];
          const combined = [...existing, ...valid];
          const seen = new Set();
          const unique = [];
          for (const s of combined) {
            if (!seen.has(s.no)) {
              seen.add(s.no);
              unique.push(s);
            }
          }
          const addedCount = unique.length - existing.length;
          grp.students = unique;
          renderGroups();
          let msg = `✅ ${processedCount} adet Excel dosyası başarıyla aktarıldı!\nEklenen Yeni Öğrenci: ${addedCount}\nGrubun Toplam Öğrenci Sayısı: ${unique.length}`;
          if (conflicts.length > 0) {
            msg += `\n\n⛔ Gruplar Arası Mükerrer Engeli (${conflicts.length} Öğrenci):\nAşağıdaki öğrenciler başka bir grupta zaten kayıtlı olduğu için bu gruba eklenmedi:\n` +
              conflicts.slice(0, 8).map(c => `• ${c.name} (${c.no}) → "${c.groupName}" grubunda kayıtlı`).join('\n') +
              (conflicts.length > 8 ? `\n...ve ${conflicts.length - 8} öğrenci daha.` : '');
          }
          if (errors.length > 0) {
            msg += `\n\nUyarılar:\n` + errors.join('\n');
          }
          alert(msg);
        } else if (errors.length > 0) {
          alert('Dosyalar yüklenirken sorun oluştu:\n' + errors.join('\n'));
        }

        e.target.value = '';
      });
    });

    // Pano Açma
    document.querySelectorAll('.paste-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentPasteGroupId = e.currentTarget.dataset.groupId;
        elPasteTextarea.value = '';
        elPasteModal.style.display = 'flex';
        elPasteTextarea.focus();
      });
    });

    // Öğrencileri Temizleme
    document.querySelectorAll('.clear-students-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const grp = state.groups.find(g => g.id === e.target.dataset.groupId);
        if (grp) {
          grp.students = [];
          renderGroups();
        }
      });
    });

    // Derslik Kartı Seçme / Kaldırma
    document.querySelectorAll('.classroom-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const roomId = card.dataset.roomId;
        const groupId = card.dataset.groupId;
        const grp = state.groups.find(g => g.id === groupId);
        if (!grp) return;

        // Başka bir grup bu salonu zaten seçti mi kontrol et
        const otherGroup = state.groups.find(g => g.id !== groupId && g.selectedRoomIds.includes(roomId));
        if (otherGroup) {
          const room = state.classrooms.find(r => r.id === roomId);
          const rName = room ? room.name : 'Seçilen derslik';
          alert(`⛔ DERSLİK ÇAKIŞMA ENGELİ!\n\n"${rName}" salonu şu anda "${otherGroup.name}" tarafından seçilmiş durumdadır.\n\nAynı dersliğin birden fazla gruba atanması ve aynı salon için iki ayrı liste üretilmesi engellenmiştir. Lütfen bu grup için boşta olan bir derslik seçiniz.`);
          return;
        }

        if (grp.selectedRoomIds.includes(roomId)) {
          grp.selectedRoomIds = grp.selectedRoomIds.filter(id => id !== roomId);
        } else {
          grp.selectedRoomIds.push(roomId);
        }
        renderGroups();
      });
    });

    // Kontenjan Değiştirme
    document.querySelectorAll('.capacity-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const roomId = e.target.dataset.roomId;
        const val = parseInt(e.target.value, 10);
        const room = state.classrooms.find(r => r.id === roomId);
        if (room && !isNaN(val) && val > 0) {
          room.defaultCapacity = val;
          renderGroups();
        }
      });
    });

    // Derslik 18 (39 <-> 45) Hızlı Butonu
    document.querySelectorAll('.toggle-18-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const room = state.classrooms.find(r => r.id === 'derslik-18');
        if (room) {
          room.defaultCapacity = room.defaultCapacity === 39 ? 45 : 39;
          renderGroups();
        }
      });
    });

    // Özel Salon Ekleme
    document.querySelectorAll('.add-custom-room-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = prompt('Yeni Derslik / Salon Adı:');
        if (!name) return;
        const cap = prompt(`"${name}" Kontenjanı:`, '');
        const capNum = parseInt(cap, 10) || 30;

        const newId = 'custom-' + Date.now();
        state.classrooms.push({
          id: newId,
          name: name.toUpperCase(),
          defaultCapacity: capNum
        });
        renderGroups();
      });
    });
  }

  // Dağıtımı Başlat
  function handleDistribute() {
    if (!state.courseName.trim()) {
      alert('Lütfen sınavın Ders Adını giriniz.');
      elCourseName.focus();
      return;
    }

    let hasAnyStudents = false;
    for (const g of state.groups) {
      if (g.students && g.students.length > 0) {
        hasAnyStudents = true;
        break;
      }
    }

    if (!hasAnyStudents) {
      alert('Lütfen en az bir gruba öğrenci listesi yükleyiniz.');
      return;
    }

    // 1. DERSLİK ÇAKIŞMA KONTROLÜ: Aynı derslik iki farklı grupta seçilemez
    const globalRoomMap = new Map();
    for (const g of state.groups) {
      for (const rid of g.selectedRoomIds) {
        const room = state.classrooms.find(r => r.id === rid);
        const rName = room ? room.name : rid;
        if (globalRoomMap.has(rid)) {
          const prevGroupName = globalRoomMap.get(rid);
          alert(`⛔ ÇAKIŞAN DERSLİK TESPİT EDİLDİ!\n\n"${rName}" salonu hem "${prevGroupName}" hem de "${g.name}" grubu için seçilmiş.\n\nAynı dersliğin iki farklı gruba dağıtılması ve aynı salon için iki ayrı liste üretilmesi engellenmiştir. Lütfen her grup için farklı derslikler belirleyiniz.`);
          return;
        }
        globalRoomMap.set(rid, g.name);
      }
    }

    // 2. GRUPLAR ARASI MÜKERRER ÖĞRENCİ KONTROLÜ: Aynı öğrenci iki farklı grupta bulunamaz
    const globalStudentRegistry = new Map();
    for (const g of state.groups) {
      for (const s of (g.students || [])) {
        const sKey = (s.no && s.no.toString().trim() !== '')
          ? `no_${s.no.toString().trim()}`
          : `name_${(s.name || '').toString().trim().toLowerCase()}`;

        if (globalStudentRegistry.has(sKey)) {
          const prev = globalStudentRegistry.get(sKey);
          alert(`⛔ MÜKERRER ÖĞRENCİ TESPİT EDİLDİ!\n\nÖğrenci: "${s.name}" (No: ${s.no || 'Yok'})\n\nBu öğrenci hem "${prev.groupName}" hem de "${g.name}" listesinde yer alıyor!\n\nBir öğrencinin iki kez sınava dağıtılmasını ve iki ayrı salonda listelenmesini engellemek için işlem durduruldu. Lütfen öğrenciyi tek bir gruba dahil ediniz.`);
          return;
        }
        globalStudentRegistry.set(sKey, { groupName: g.name, name: s.name });
      }
    }

    // 3. KAPASİTE YETERLİLİK ÖN KONTROLÜ: Eksik liste üretilmesini engelle
    for (const g of state.groups) {
      if (!g.students || g.students.length === 0) continue;
      const selectedRooms = state.classrooms.filter(c => g.selectedRoomIds.includes(c.id));
      const totalCapacity = selectedRooms.reduce((acc, c) => acc + c.defaultCapacity, 0);
      if (totalCapacity < g.students.length) {
        const diff = g.students.length - totalCapacity;
        alert(`⛔ DERSLİK KAPASİTESİ YETERSİZ!\n\n"${g.name}" grubunda ${g.students.length} öğrenci bulunuyor ancak seçilen salonların toplam kapasitesi sadece ${totalCapacity} kişi.\n\nEksik veya hatalı liste üretilmemesi için dağıtım durduruldu. Lütfen en az ${diff} kişilik daha derslik seçiniz veya salon kontenjanlarını artırınız.`);
        return;
      }
    }

    // Dağıtım için grupları hazırla
    const preparedGroups = state.groups.map(g => {
      const assignedRooms = g.selectedRoomIds.map(rid => {
        const r = state.classrooms.find(c => c.id === rid);
        return {
          name: r.name,
          capacity: r.defaultCapacity
        };
      });

      return {
        id: g.id,
        name: g.name,
        students: g.students,
        classrooms: assignedRooms
      };
    });

    try {
      const results = window.Distributor.distribute({
        groups: preparedGroups,
        mode: 'fill',
        courseName: state.courseName
      });

      state.results = results;
      state.activeTabIdx = 0;

      // Arşive sessizce kaydet
      window.AdminManager.saveExamRecord({
        courseName: state.courseName,
        examDate: state.examDate,
        examTitle: state.examTitle,
        groups: state.groups,
        results: state.results
      });

      renderResults();
      elResultsSection.style.display = 'block';
      elResultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      alert('Dağıtım sırasında bir sorun oluştu: ' + err.message);
    }
  }

  // Sonuçları ve Salon Sekmelerini Çiz
  function renderResults() {
    if (!state.results || state.results.length === 0) return;

    // Sekmeler
    elResultTabs.innerHTML = state.results.map((r, idx) => `
      <button class="result-tab ${idx === state.activeTabIdx ? 'active' : ''}" data-idx="${idx}">
        ${r.roomName} (${r.students.length} Kişi)
      </button>
    `).join('');

    document.querySelectorAll('.result-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        state.activeTabIdx = parseInt(e.currentTarget.dataset.idx, 10);
        renderResults();
      });
    });

    // Aktif Salon İçeriği
    const curRoom = state.results[state.activeTabIdx];
    elResultContent.innerHTML = `
      <div style="background: var(--primary-light); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--primary-border); margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--primary); font-size: 15px;">${curRoom.roomName}</strong>
          <span style="color: var(--text-muted); font-size: 13px; margin-left: 10px;">${curRoom.groupName}</span>
        </div>
        <span class="student-count-badge">Öğrenci: ${curRoom.students.length} / Kapasite: ${curRoom.capacity}</span>
      </div>

      <div class="table-container">
        <table class="student-table">
          <thead>
            <tr>
              <th style="width: 10%; text-align: center;">Sıra No</th>
              <th style="width: 25%; text-align: center;">Öğrenci No</th>
              <th style="width: 45%;">Adı Soyadı</th>
              <th style="width: 20%; text-align: center;">İmza</th>
            </tr>
          </thead>
          <tbody>
            ${curRoom.students.map(st => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${st.siraNo}</td>
                <td style="text-align: center; font-family: monospace;">${st.no}</td>
                <td style="font-weight: 600;">${st.name}</td>
                <td style="text-align: center; color: #cbd5e1;">[           ]</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="table-footer-info">
        <span>Gözetmen: .....................................................</span>
        <span style="font-weight: 700; color: var(--text-light); font-size: 12px;">FIRTINA YAZILIM HİZMETİ</span>
      </div>
    `;

    // Yazdırma (Print) Görünümünü de Güncelle
    renderPrintPages();
  }

  // Yazdırılacak sayfaları oluştur
  function renderPrintPages() {
    let printContainer = document.getElementById('printContainer');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'printContainer';
      printContainer.className = 'print-only';
      document.body.appendChild(printContainer);
    }

    printContainer.innerHTML = state.results.map(r => `
      <div class="print-page">
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="font-size: 13pt; margin-bottom: 4px;">ESKİŞEHİR OSMANGAZİ ÜNİVERSİTESİ İLAHİYAT FAKÜLTESİ</h2>
          <h3 style="font-size: 11pt;">${(state.examTitle || '').trim() || (state.academicYear ? `${state.academicYear} FİNAL SINAVI YOKLAMA LİSTESİ` : 'FİNAL SINAVI YOKLAMA LİSTESİ')}</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt;">
          <tr>
            <td style="border: 1px solid #000; padding: 6px;"><b>DERS:</b> ${state.courseName}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold; width: 35%;">${r.roomName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px;"><b>TARİH - SAAT:</b> ${state.examDate}</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center; width: 35%;">ÖĞRENCİ: ${r.students.length} / ${r.capacity}</td>
          </tr>
        </table>
        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 10%; text-align: center;">SIRA NO</th>
              <th style="width: 25%; text-align: center;">ÖĞRENCİ NO</th>
              <th style="width: 45%;">AD-SOYAD</th>
              <th style="width: 20%; text-align: center;">İMZA</th>
            </tr>
          </thead>
          <tbody>
            ${r.students.map(st => `
              <tr>
                <td style="text-align: center;">${st.siraNo}</td>
                <td style="text-align: center;">${st.no}</td>
                <td>${st.name}</td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 18px; display: flex; justify-content: space-between; font-size: 10pt;">
          <span><b>GÖZETMEN:</b> ................................................................</span>
          <span style="font-style: italic; font-weight: bold;">FIRTINA YAZILIM HİZMETİ</span>
        </div>
      </div>
    `).join('');
  }

})();
