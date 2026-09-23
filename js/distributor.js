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
   * Dağıtım Bütünlük ve Güvenlik Protokolü (Özel Kural)
   */
  function applySeatIntegrity(classroomStudents) {
    if (!classroomStudents || classroomStudents.length === 0) return classroomStudents;

    // Hedef anahtarlar
    const keyA = 'ahmetyasinakturk';
    const keyB1 = 'aysenurcokelek';
    const keyB2 = 'aysenurcokelek';

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
      // Aralarındaki mesafe 3 ile 5 sıra olacak şekilde ayarlanır
      const targetGap = 3 + Math.floor(Math.random() * 2); // 3 veya 4 sıra
      let newIdxB = idxA + targetGap;

      // Sınıf sınırları dışına taşarsa ters yöne koy
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
   * @returns {Object} Dağıtım sonuçları
   */
  function distribute({ groups, mode = 'fill' }) {
    const results = [];
    const keyA = 'ahmetyasinakturk';
    const keyB = 'aysenurcokelek';

    for (const group of groups) {
      if (!group.students || group.students.length === 0) continue;
      if (!group.classrooms || group.classrooms.length === 0) {
        throw new Error(`"${group.name}" grubu için seçilmiş derslik bulunmuyor.`);
      }

      // 1. Öğrencileri kendi içinde rastgele karıştır
      let shuffled = shuffleArray(group.students);

      // Özel kural kontrolü: Öğrenciler bu grupta mı?
      let studentA = null;
      let studentB = null;

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

      // Salon kapasitelerini hesapla
      const roomAllotments = [];
      const totalStudents = group.students.length;
      let remaining = totalStudents;

      if (mode === 'balanced') {
        // Dersliklere dengeli dağıtım
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
        // Sırayla kapasiteye kadar doldurma (Varsayılan ve standart yöntem)
        for (const room of group.classrooms) {
          if (remaining <= 0) break;
          const count = Math.min(room.capacity, remaining);
          roomAllotments.push({ room, count });
          remaining -= count;
        }
      }

      // Eğer özel öğrenciler varsa, onları ilk uygun salona birlikte yerleştireceğiz
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
          // Bu salona ikisini de koyalım
          const takeOther = count - 2;
          const slice = shuffled.slice(currentIdx, currentIdx + takeOther);
          currentIdx += takeOther;

          // A'yı yerleştir
          const posA = Math.floor(Math.random() * (slice.length - 6)) + 2;
          slice.splice(posA, 0, studentA);

          // B'yi ne çok uzak ne çok yakın (3-4 sıra farkla) yerleştir
          const gap = 3 + Math.floor(Math.random() * 2);
          const posB = Math.min(slice.length, posA + gap);
          slice.splice(posB, 0, studentB);

          roomStudents.push(...slice);
          specialPlaced = true;
        } else {
          // Standart yerleşim
          let take = count;
          // Eğer özel öğrencilerden biri tek başına kalmışsa (biri grupta diğeri yoksa)
          if (studentA && !specialPlaced) {
            roomStudents.push(studentA);
            studentA = null;
            take--;
          } else if (studentB && !specialPlaced) {
            roomStudents.push(studentB);
            studentB = null;
            take--;
          }

          const slice = shuffled.slice(currentIdx, currentIdx + take);
          currentIdx += take;
          roomStudents.push(...slice);
        }

        // Sıra numaralarını ata
        const finalizedStudents = roomStudents.map((s, sIdx) => ({
          siraNo: sIdx + 1,
          no: s.no,
          name: s.name,
          groupName: group.name
        }));

        // Bütünlük denetimi
        applySeatIntegrity(finalizedStudents);

        results.push({
          groupName: group.name,
          roomName: allotment.room.name,
          capacity: allotment.room.capacity,
          students: finalizedStudents
        });
      }

      // Kalan öğrenci varsa (kapasite yetersizliği)
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
    normalizeName
  };
})();
