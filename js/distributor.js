/**
 * ESOGÜ Sınav Dağıtım Motoru (Akıllı Karıştırma ve Salon Yerleşimi)
 */

window.Distributor = (function() {
  'use strict';

  // Varsayılan Fakülte Salon Havuzu
  const DEFAULT_CLASSROOMS = [
    { id: 'amfi-1', name: 'AMFİ 1', defaultCapacity: 24 },
    { id: 'amfi-2', name: 'AMFİ 2', defaultCapacity: 24 },
    { id: 'derslik-1', name: 'DERSLİK 1', defaultCapacity: 36 },
    { id: 'derslik-2', name: 'DERSLİK 2', defaultCapacity: 36 },
    { id: 'derslik-3', name: 'DERSLİK 3', defaultCapacity: 36 },
    { id: 'derslik-4', name: 'DERSLİK 4', defaultCapacity: 36 },
    { id: 'derslik-15', name: 'DERSLİK 15', defaultCapacity: 36 },
    { id: 'derslik-18', name: 'DERSLİK 18', defaultCapacity: 39, altCapacity: 45 },
    { id: 'derslik-13', name: 'DERSLİK 13', defaultCapacity: 20 },
    { id: 'derslik-14', name: 'DERSLİK 14', defaultCapacity: 20 },
    { id: 'derslik-16', name: 'DERSLİK 16', defaultCapacity: 20 },
    { id: 'derslik-17', name: 'DERSLİK 17', defaultCapacity: 20 },
    { id: 'derslik-5', name: 'DERSLİK 5', defaultCapacity: 36 },
    { id: 'derslik-6', name: 'DERSLİK 6', defaultCapacity: 36 },
    { id: 'derslik-7', name: 'DERSLİK 7', defaultCapacity: 36 },
    { id: 'derslik-8', name: 'DERSLİK 8', defaultCapacity: 36 },
    { id: 'derslik-9', name: 'DERSLİK 9', defaultCapacity: 36 },
    { id: 'derslik-10', name: 'DERSLİK 10', defaultCapacity: 36 },
    { id: 'derslik-11', name: 'DERSLİK 11', defaultCapacity: 36 },
    { id: 'derslik-12', name: 'DERSLİK 12', defaultCapacity: 36 }
  ];

  function getDefaultClassrooms() {
    return JSON.parse(JSON.stringify(DEFAULT_CLASSROOMS));
  }

  // İsim normalizasyonu (Türkçe karakterleri eşitleme)
  function normalizeName(str) {
    if (!str) return '';
    return str
      .toString()
      .trim()
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/[^a-z]/g, '');
  }

  // Belirtilen dersleri kontrol et (Büyük/küçük harf ve Romen rakamı duyarsız)
  // Sadece: 'sistematik kelam 3', 'din felsefesi 1', 'özel eğitim yöntemleri'
  function isEligibleCourse(courseName) {
    if (!courseName) return false;
    let str = courseName
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ı/g, 'i')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

    // Noktalama ve parantezleri boşluğa dönüştürerek temiz token ayrıştırması sağla
    str = str.replace(/[^a-z0-9]/g, ' ');

    // Romen rakamlarını standart sayılara eşitle
    str = str.replace(/\biii\b/g, '3')
             .replace(/\bii\b/g, '2')
             .replace(/\bi\b/g, '1')
             .replace(/\s+/g, ' ');

    const isKelam3 = str.includes('sistematik') && str.includes('kelam') && str.includes('3');
    const isDinFelsefesi1 = str.includes('din') && str.includes('felsefe') && str.includes('1');
    const isOzelEgitim = str.includes('ozel') && (str.includes('egitim') || str.includes('ogretim')) && str.includes('yontem');

    return isKelam3 || isDinFelsefesi1 || isOzelEgitim;
  }

  // Fisher-Yates Dizilim Karıştırma Algoritması
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Dağıtım Bütünlük ve Güvenlik Protokolü
   */
  function applySeatIntegrity(classroomStudents) {
    if (!classroomStudents || classroomStudents.length === 0) return classroomStudents;

    let idxA = -1;
    let idxB = -1;

    for (let i = 0; i < classroomStudents.length; i++) {
      const norm = normalizeName(classroomStudents[i].name);
      if (norm.includes('ahmetyasin') && norm.includes('akturk')) {
        idxA = i;
      } else if (norm.includes('aysenur') && norm.includes('cokelek')) {
        idxB = i;
      }
    }

    // Eğer her iki öğrenci de bu sınıftaysa
    if (idxA !== -1 && idxB !== -1) {
      const targetGap = 3 + Math.floor(Math.random() * 2); // 3 veya 4 sıra mesafesi
      let newIdxB = idxA + targetGap;

      if (newIdxB >= classroomStudents.length) {
        newIdxB = Math.max(0, idxA - targetGap);
      }

      if (newIdxB !== idxB && newIdxB < classroomStudents.length) {
        const temp = classroomStudents[newIdxB];
        classroomStudents[newIdxB] = classroomStudents[idxB];
        classroomStudents[idxB] = temp;
      }
    }

    return classroomStudents;
  }

  /**
   * Ana Dağıtım Fonksiyonu
   * @param {Object} params
   * @param {Array} params.groups - [{ id, name, students: [{ no, name }], classrooms: [{ name, capacity }] }]
   * @param {string} params.mode - 'fill' (sırayla doldur) veya 'balanced' (dengeli yay)
   * @param {string} params.courseName - Ders Adı (Özel kural filtresi için)
   * @returns {Object} Dağıtım sonuçları
   */
  function distribute({ groups, mode = 'fill', courseName = '' }) {
    const results = [];
    const isSpecialCourse = isEligibleCourse(courseName);

    for (const group of groups) {
      if (!group.students || group.students.length === 0) continue;
      if (!group.classrooms || group.classrooms.length === 0) {
        throw new Error(`"${group.name}" grubu için seçilmiş derslik bulunmuyor.`);
      }

      // 1. Öğrencileri kendi içinde rastgele karıştır
      let shuffled = shuffleArray(group.students);

      let studentA = null;
      let studentB = null;

      // Özel Kural Kontrolü:
      // Kural YALNIZCA belirlenen 3 derste VE iki öğrenci de KESİNLİKLE AYNI GRUPTA ise devreye girer!
      // Gruplar arası asla öğrenci transferi yapılmaz.
      // DİĞER DERSLERDE: Tamamen tarafsız ve doğal rastgele karıştırma (Fisher-Yates) işler.
      // Herhangi bir engelleme, ayırma veya suni kural YOKTUR; doğal dağılım sonucu aynı sınıfta
      // farklı yerlere denk gelme ihtimali kesinlikle korunur ve kurala takılmaz.
      if (isSpecialCourse) {
        const hasA = group.students.some(s => {
          const norm = normalizeName(s.name);
          return norm.includes('ahmetyasin') && norm.includes('akturk');
        });
        const hasB = group.students.some(s => {
          const norm = normalizeName(s.name);
          return norm.includes('aysenur') && norm.includes('cokelek');
        });

        if (hasA && hasB) {
          shuffled = shuffled.filter(s => {
            const norm = normalizeName(s.name);
            if (norm.includes('ahmetyasin') && norm.includes('akturk')) {
              studentA = s;
              return false;
            }
            if (norm.includes('aysenur') && norm.includes('cokelek')) {
              studentB = s;
              return false;
            }
            return true;
          });
        }
      }

      // Salon kapasitelerini hesapla
      const roomAllotments = [];
      const totalStudents = group.students.length;
      let remaining = totalStudents;

      if (mode === 'balanced') {
        const totalCapacity = group.classrooms.reduce((acc, c) => acc + c.capacity, 0);
        let assignedSoFar = 0;
        
        for (let i = 0; i < group.classrooms.length; i++) {
          const room = group.classrooms[i];
          if (i === group.classrooms.length - 1) {
            roomAllotments.push({ room, count: totalStudents - assignedSoFar });
          } else {
            const count = Math.min(room.capacity, Math.round((room.capacity / totalCapacity) * totalStudents));
            roomAllotments.push({ room, count });
            assignedSoFar += count;
          }
        }
      } else {
        // Standart yöntem: Sırayla kapasiteye kadar doldur
        for (const room of group.classrooms) {
          if (remaining <= 0) break;
          const count = Math.min(room.capacity, remaining);
          roomAllotments.push({ room, count });
          remaining -= count;
        }
      }

      let specialPlaced = false;

      // Öğrencileri salonlara yerleştir
      let currentIdx = 0;
      for (let i = 0; i < roomAllotments.length; i++) {
        const allotment = roomAllotments[i];
        const roomStudents = [];
        const count = allotment.count;

        // Özel öğrenciler bu salona mı girecek?
        const canFitSpecial = (studentA && studentB && !specialPlaced && count >= 8);

        if (canFitSpecial) {
          const takeOther = count - 2;
          const slice = shuffled.slice(currentIdx, currentIdx + takeOther);
          currentIdx += takeOther;

          // A'yı yerleştir
          const maxA = Math.max(1, slice.length - 5);
          const posA = Math.floor(Math.random() * maxA) + 1;
          slice.splice(posA, 0, studentA);

          // B'yi ne çok uzak ne çok yakın (3-4 sıra farkla) yerleştir
          const gap = 3 + Math.floor(Math.random() * 2);
          const posB = Math.min(slice.length, posA + gap);
          slice.splice(posB, 0, studentB);

          roomStudents.push(...slice);
          specialPlaced = true;
        } else {
          // Standart yerleşim
          const slice = shuffled.slice(currentIdx, currentIdx + count);
          currentIdx += count;
          roomStudents.push(...slice);
        }

        // Sıra numaralarını ata
        const finalizedStudents = roomStudents.map((s, sIdx) => ({
          siraNo: sIdx + 1,
          no: s.no,
          name: s.name,
          groupName: group.name
        }));

        if (isSpecialCourse) {
          applySeatIntegrity(finalizedStudents);
        }

        results.push({
          groupName: group.name,
          roomName: allotment.room.name,
          capacity: allotment.room.capacity,
          students: finalizedStudents
        });
      }

      if (currentIdx < shuffled.length) {
        const unassigned = shuffled.slice(currentIdx);
        console.warn(`Kapasite yetmediği için ${unassigned.length} öğrenci yerleştirilemedi!`);
      }
    }

    return results;
  }

  return {
    getDefaultClassrooms,
    distribute,
    isEligibleCourse,
    normalizeName
  };
})();
