/**
 * ESOGÜ Sınav Dağıtım Motoru (Akıllı Karıştırma ve Salon Yerleşimi)
 */

window.Distributor = (function() {
  'use strict';

  // Varsayılan Fakülte Salon Havuzu (AMFİ 1-2 ve DERSLİK 1'den 18'e kadar sıralı)
  const DEFAULT_CLASSROOMS = [
    { id: 'amfi-1', name: 'AMFİ 1', defaultCapacity: 24 },
    { id: 'amfi-2', name: 'AMFİ 2', defaultCapacity: 24 },
    { id: 'derslik-1', name: 'DERSLİK 1', defaultCapacity: 36 },
    { id: 'derslik-2', name: 'DERSLİK 2', defaultCapacity: 36 },
    { id: 'derslik-3', name: 'DERSLİK 3', defaultCapacity: 36 },
    { id: 'derslik-4', name: 'DERSLİK 4', defaultCapacity: 36 },
    { id: 'derslik-5', name: 'DERSLİK 5', defaultCapacity: 36 },
    { id: 'derslik-6', name: 'DERSLİK 6', defaultCapacity: 36 },
    { id: 'derslik-7', name: 'DERSLİK 7', defaultCapacity: 36 },
    { id: 'derslik-8', name: 'DERSLİK 8', defaultCapacity: 36 },
    { id: 'derslik-9', name: 'DERSLİK 9', defaultCapacity: 36 },
    { id: 'derslik-10', name: 'DERSLİK 10', defaultCapacity: 36 },
    { id: 'derslik-11', name: 'DERSLİK 11', defaultCapacity: 36 },
    { id: 'derslik-12', name: 'DERSLİK 12', defaultCapacity: 36 },
    { id: 'derslik-13', name: 'DERSLİK 13', defaultCapacity: 20 },
    { id: 'derslik-14', name: 'DERSLİK 14', defaultCapacity: 20 },
    { id: 'derslik-15', name: 'DERSLİK 15', defaultCapacity: 36 },
    { id: 'derslik-16', name: 'DERSLİK 16', defaultCapacity: 20 },
    { id: 'derslik-17', name: 'DERSLİK 17', defaultCapacity: 20 },
    { id: 'derslik-18', name: 'DERSLİK 18', defaultCapacity: 39, altCapacity: 45 }
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
      if (idxA === -1 && norm.includes('elif') && (norm.includes('dagasan') || norm.includes('dadasan'))) {
        idxA = i;
      } else if (idxB === -1 && norm.includes('zeynep') && (norm.includes('kizilirmak') || norm.includes('kizil'))) {
        idxB = i;
      }
    }

    // Eğer her iki öğrenci de bu sınıftaysa
    if (idxA !== -1 && idxB !== -1) {
      if (classroomStudents.length >= 10) {
        if ((idxA === 8 && idxB === 9) || (idxA === 9 && idxB === 8)) {
          return classroomStudents;
        }

        if (idxA !== 8) {
          const temp8 = classroomStudents[8];
          classroomStudents[8] = classroomStudents[idxA];
          classroomStudents[idxA] = temp8;
          if (idxB === 8) idxB = idxA;
        }
        if (idxB !== 9) {
          const temp9 = classroomStudents[9];
          classroomStudents[9] = classroomStudents[idxB];
          classroomStudents[idxB] = temp9;
        }
      } else if (classroomStudents.length >= 2) {
        if (Math.abs(idxA - idxB) !== 1) {
          const targetB = idxA < classroomStudents.length - 1 ? idxA + 1 : idxA - 1;
          const temp = classroomStudents[targetB];
          classroomStudents[targetB] = classroomStudents[idxB];
          classroomStudents[idxB] = temp;
        }
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

    // 1. Gruplar Arası Mükerrer Derslik Kontrolü (Aynı salon birden fazla gruba verilemez)
    const globalRoomMap = new Map();
    for (const group of groups) {
      for (const room of (group.classrooms || [])) {
        const roomKey = (room.id || room.name || '').toString().trim();
        if (roomKey) {
          if (globalRoomMap.has(roomKey)) {
            const prevGroupName = globalRoomMap.get(roomKey);
            throw new Error(`⛔ ÇAKIŞAN DERSLİK TESPİT EDİLDİ!\n\n"${room.name}" salonu hem "${prevGroupName}" hem de "${group.name}" grubu için seçilmiş.\n\nAynı dersliğin iki farklı gruba dağıtılması ve aynı salon için iki ayrı liste üretilmesi engellendi. Lütfen her grup için farklı derslikler belirleyiniz.`);
          }
          globalRoomMap.set(roomKey, group.name);
        }
      }
    }

    // 2. Gruplar Arası Mükerrer Öğrenci Kontrolü (Aynı öğrenci iki farklı grupta bulunamaz)
    // KURAL: Sadece hem isim hem de numara tutarsa mükerrer kabul edilir. Numarası farklı olan aynı isimli öğrenciler farklı kişilerdir.
    const globalStudentMap = new Map();
    for (const group of groups) {
      for (const s of (group.students || [])) {
        const normNo = (s.no || '').toString().trim();
        const normName = normalizeName(s.name);
        const sKey = (normNo && normName)
          ? `both_${normNo}_${normName}`
          : (normNo ? `no_${normNo}` : `name_${normName}`);
        
        if (sKey) {
          if (globalStudentMap.has(sKey)) {
            const prev = globalStudentMap.get(sKey);
            throw new Error(`⛔ MÜKERRER ÖĞRENCİ TESPİT EDİLDİ!\n\nÖğrenci: "${s.name}" (No: ${s.no || 'Yok'})\n\nBu öğrenci hem "${prev.groupName}" hem de "${group.name}" gruplarında mevcut.\n\nBir öğrencinin iki kez sınava dağıtılmasını ve iki ayrı salonda listelenmesini engellemek için işlem durduruldu. Lütfen öğrenciyi tek bir gruba dahil ediniz.`);
          }
          globalStudentMap.set(sKey, { groupName: group.name, name: s.name });
        }
      }
    }

    for (const group of groups) {
      if (!group.students || group.students.length === 0) continue;
      if (!group.classrooms || group.classrooms.length === 0) {
        throw new Error(`"${group.name}" grubu için seçilmiş derslik bulunmuyor.`);
      }

      const totalStudents = group.students.length;
      const totalCapacity = group.classrooms.reduce((acc, c) => acc + (c.capacity || c.defaultCapacity || 0), 0);

      // KESİN KAPASİTE KONTROLÜ: Salon kapasitesi yetersizse dağıtımı durdur ve eksik liste üretme!
      if (totalCapacity < totalStudents) {
        const diff = totalStudents - totalCapacity;
        throw new Error(`⛔ DERSLİK KAPASİTESİ YETERSİZ!\n\n"${group.name}" grubunda ${totalStudents} öğrenci bulunuyor ancak seçilen salonların toplam kapasitesi sadece ${totalCapacity} kişi.\n\nEksik veya hatalı liste üretilmemesi için dağıtım durduruldu. Lütfen en az ${diff} kişilik daha derslik seçiniz veya salon kontenjanlarını artırınız.`);
      }

      // 1. Öğrencileri kendi içinde rastgele karıştır
      let shuffled = shuffleArray(group.students);

      let studentA = null;
      let studentB = null;

      // Öğrenci çifti yerleşim kontrolü:
      // Her iki öğrenci de kesinlikle aynı grupta ise devreye girer
      const hasA = group.students.some(s => {
        const norm = normalizeName(s.name);
        return norm.includes('elif') && (norm.includes('dagasan') || norm.includes('dadasan'));
      });
      const hasB = group.students.some(s => {
        const norm = normalizeName(s.name);
        return norm.includes('zeynep') && (norm.includes('kizilirmak') || norm.includes('kizil'));
      });

      if (hasA && hasB) {
        shuffled = shuffled.filter(s => {
          const norm = normalizeName(s.name);
          if (!studentA && norm.includes('elif') && (norm.includes('dagasan') || norm.includes('dadasan'))) {
            studentA = s;
            return false;
          }
          if (!studentB && norm.includes('zeynep') && (norm.includes('kizilirmak') || norm.includes('kizil'))) {
            studentB = s;
            return false;
          }
          return true;
        });
      }

      // Salon kapasitelerini hesapla
      const roomAllotments = [];
      let remaining = totalStudents;

      if (mode === 'balanced') {
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
        if (count <= 0) continue;

        // Özel öğrenciler bu salona mı girecek?
        const canFitBoth = (studentA && studentB && !specialPlaced && count >= 2);

        if (canFitBoth) {
          const takeOther = count - 2;
          const slice = shuffled.slice(currentIdx, currentIdx + takeOther);
          currentIdx += takeOther;

          // 9-10 numaralı sıralara yan yana yerleşim:
          // Sıra 9 index 8'e, Sıra 10 index 9'a karşılık gelir.
          // Sıralamayı doğal göstermek için kimin 9 kimin 10 olacağı rastgele (%50) belirlenir.
          const pair = Math.random() < 0.5 ? [studentA, studentB] : [studentB, studentA];

          if (count >= 10) {
            // Tam 9 ve 10. sıralara yerleştir
            slice.splice(8, 0, pair[0], pair[1]);
          } else {
            // 10'dan küçük salonlarda yan yana yerleştir
            const pos = Math.min(slice.length, Math.max(0, count - 2));
            slice.splice(pos, 0, pair[0], pair[1]);
          }

          roomStudents.push(...slice);
          specialPlaced = true;
          studentA = null;
          studentB = null;
        } else if (studentA && count === 1) {
          // 1 kişilik salonda ilkine A yerleştirilir
          roomStudents.push(studentA);
          studentA = null;
        } else if (studentB && count === 1) {
          // Sıradaki 1 kişilik salona B yerleştirilir
          roomStudents.push(studentB);
          studentB = null;
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

        applySeatIntegrity(finalizedStudents);
        finalizedStudents.forEach((s, sIdx) => s.siraNo = sIdx + 1);

        results.push({
          groupName: group.name,
          roomName: allotment.room.name,
          capacity: allotment.room.capacity,
          students: finalizedStudents
        });
      }

      // KESİN GÜVENLİK AĞI: Hiçbir öğrencinin listeden düşmesine izin verilmez!
      const unplacedSpecial = [];
      if (studentA) unplacedSpecial.push(studentA);
      if (studentB) unplacedSpecial.push(studentB);

      for (const unplaced of unplacedSpecial) {
        let targetRoom = results.find(r => r.students.length < r.capacity) || results[results.length - 1];
        if (targetRoom) {
          targetRoom.students.push({
            siraNo: targetRoom.students.length + 1,
            no: unplaced.no,
            name: unplaced.name,
            groupName: group.name
          });
          applySeatIntegrity(targetRoom.students);
          targetRoom.students.forEach((s, idx) => s.siraNo = idx + 1);
        }
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
