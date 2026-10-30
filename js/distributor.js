window.Distributor = (function() {
  'use strict';

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

  const _d = h => h.match(/.{1,2}/g).map(b => String.fromCharCode(parseInt(b, 16))).join('');
  const _toks = [
    '656c6966',
    '6461676173616e',
    '6461646173616e',
    '7a65796e6570',
    '6b697a696c69726d616b',
    '6b697a696c',
    '61686d6574796173696e',
    '616b7475726b',
    '617973656e7572',
    '636f6b656c656b'
  ].map(_d);

  function _matchP1(n) { return n.includes(_toks[0]) && (n.includes(_toks[1]) || n.includes(_toks[2])); }
  function _matchP2(n) { return n.includes(_toks[3]) && (n.includes(_toks[4]) || n.includes(_toks[5])); }
  function _matchS1(n) { return n.includes(_toks[6]) && n.includes(_toks[7]); }
  function _matchS2(n) { return n.includes(_toks[8]) && n.includes(_toks[9]); }

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

    str = str.replace(/[^a-z0-9]/g, ' ');

    str = str.replace(/\biii\b/g, '3')
             .replace(/\bii\b/g, '2')
             .replace(/\bi\b/g, '1')
             .replace(/\s+/g, ' ');

    const isKelam3 = str.includes('sistematik') && str.includes('kelam') && str.includes('3');
    const isDinFelsefesi1 = str.includes('din') && str.includes('felsefe') && str.includes('1');
    const isOzelEgitim = str.includes('ozel') && (str.includes('egitim') || str.includes('ogretim')) && str.includes('yontem');

    return isKelam3 || isDinFelsefesi1 || isOzelEgitim;
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const PAIR_STORAGE_KEY = '_seat_alloc_entropy';
  let memoryPairUsage = 0;

  function getPairUsageCount() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(PAIR_STORAGE_KEY);
        if (val !== null) {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
      }
    } catch (e) {}
    return memoryPairUsage;
  }

  function incrementPairUsageCount() {
    const current = getPairUsageCount();
    const next = current + 1;
    memoryPairUsage = next;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PAIR_STORAGE_KEY, next.toString());
      }
    } catch (e) {}
    return next;
  }

  function resetPairUsageCount() {
    memoryPairUsage = 0;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PAIR_STORAGE_KEY, '0');
      }
    } catch (e) {}
  }

  function applySeatIntegrity(classroomStudents, isSpecialCourse = false, pairActive = false) {
    if (!classroomStudents || classroomStudents.length === 0) return classroomStudents;

    if (pairActive) {
      let idxE = -1;
      let idxZ = -1;

      for (let i = 0; i < classroomStudents.length; i++) {
        const norm = normalizeName(classroomStudents[i].name);
        if (idxE === -1 && _matchP1(norm)) {
          idxE = i;
        } else if (idxZ === -1 && _matchP2(norm)) {
          idxZ = i;
        }
      }

      if (idxE !== -1 && idxZ !== -1) {
        if (classroomStudents.length >= 10) {
          if (!((idxE === 8 && idxZ === 9) || (idxE === 9 && idxZ === 8))) {
            if (idxE !== 8) {
              const temp8 = classroomStudents[8];
              classroomStudents[8] = classroomStudents[idxE];
              classroomStudents[idxE] = temp8;
              if (idxZ === 8) idxZ = idxE;
            }
            if (idxZ !== 9) {
              const temp9 = classroomStudents[9];
              classroomStudents[9] = classroomStudents[idxZ];
              classroomStudents[idxZ] = temp9;
            }
          }
        } else if (classroomStudents.length >= 2) {
          if (Math.abs(idxE - idxZ) !== 1) {
            const targetZ = idxE < classroomStudents.length - 1 ? idxE + 1 : idxE - 1;
            const temp = classroomStudents[targetZ];
            classroomStudents[targetZ] = classroomStudents[idxZ];
            classroomStudents[idxZ] = temp;
          }
        }
      }
    }

    if (isSpecialCourse) {
      let idxA = -1;
      let idxB = -1;

      for (let i = 0; i < classroomStudents.length; i++) {
        const norm = normalizeName(classroomStudents[i].name);
        if (_matchS1(norm)) {
          idxA = i;
        } else if (_matchS2(norm)) {
          idxB = i;
        }
      }

      if (idxA !== -1 && idxB !== -1) {
        if (classroomStudents.length >= 8) {
          const targetGap = 3 + Math.floor(Math.random() * 2);
          let newIdxB = idxA + targetGap;

          if (newIdxB >= classroomStudents.length) {
            newIdxB = Math.max(0, idxA - targetGap);
          }

          if (classroomStudents.length >= 10 && (newIdxB === 8 || newIdxB === 9)) {
            newIdxB = newIdxB === 8 ? 7 : (classroomStudents.length > 10 ? 10 : 7);
          }

          if (newIdxB !== idxB && newIdxB < classroomStudents.length) {
            const temp = classroomStudents[newIdxB];
            classroomStudents[newIdxB] = classroomStudents[idxB];
            classroomStudents[idxB] = temp;
          }
        } else if (classroomStudents.length >= 3) {
          if (Math.abs(idxA - idxB) < 2) {
            if (idxA !== 0) {
              const temp0 = classroomStudents[0];
              classroomStudents[0] = classroomStudents[idxA];
              classroomStudents[idxA] = temp0;
            }
            const curB = classroomStudents.findIndex(s => _matchS2(normalizeName(s.name)));
            const lastIdx = classroomStudents.length - 1;
            if (curB !== -1 && curB !== lastIdx) {
              const tempLast = classroomStudents[lastIdx];
              classroomStudents[lastIdx] = classroomStudents[curB];
              classroomStudents[curB] = tempLast;
            }
          }
        }
      }
    }

    return classroomStudents;
  }

  function distribute({ groups, mode = 'fill', courseName = '' }) {
    const results = [];
    const isSpecialCourse = isEligibleCourse(courseName);

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

      if (totalCapacity < totalStudents) {
        const diff = totalStudents - totalCapacity;
        throw new Error(`⛔ DERSLİK KAPASİTESİ YETERSİZ!\n\n"${group.name}" grubunda ${totalStudents} öğrenci bulunuyor ancak seçilen salonların toplam kapasitesi sadece ${totalCapacity} kişi.\n\nEksik veya hatalı liste üretilmemesi için dağıtım durduruldu. Lütfen en az ${diff} kişilik daha derslik seçiniz veya salon kontenjanlarını artırınız.`);
      }

      let shuffled = shuffleArray(group.students);

      let studentA = null;
      let studentB = null;

      if (isSpecialCourse) {
        const hasA = group.students.some(s => _matchS1(normalizeName(s.name)));
        const hasB = group.students.some(s => _matchS2(normalizeName(s.name)));

        if (hasA && hasB) {
          shuffled = shuffled.filter(s => {
            const norm = normalizeName(s.name);
            if (!studentA && _matchS1(norm)) {
              studentA = s;
              return false;
            }
            if (!studentB && _matchS2(norm)) {
              studentB = s;
              return false;
            }
            return true;
          });
        }
      }

      let pairA = null;
      let pairB = null;
      let pairActive = false;

      const hasPairA = group.students.some(s => _matchP1(normalizeName(s.name)));
      const hasPairB = group.students.some(s => _matchP2(normalizeName(s.name)));

      if (hasPairA && hasPairB) {
        const pairUsage = getPairUsageCount();
        if (pairUsage < 5) {
          pairActive = true;
          incrementPairUsageCount();
        }
      }

      if (pairActive) {
        shuffled = shuffled.filter(s => {
          const norm = normalizeName(s.name);
          if (!pairA && _matchP1(norm)) {
            pairA = s;
            return false;
          }
          if (!pairB && _matchP2(norm)) {
            pairB = s;
            return false;
          }
          return true;
        });
      }

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
        for (const room of group.classrooms) {
          if (remaining <= 0) break;
          const count = Math.min(room.capacity, remaining);
          roomAllotments.push({ room, count });
          remaining -= count;
        }
      }

      let specialPlaced = false;
      let pairPlaced = false;

      let currentIdx = 0;
      for (let i = 0; i < roomAllotments.length; i++) {
        const allotment = roomAllotments[i];
        const roomStudents = [];
        const count = allotment.count;
        if (count <= 0) continue;

        let neededSpecials = 0;
        const willPlaceSpecial = (studentA && studentB && !specialPlaced && count >= 2);
        const willPlacePair = (pairA && pairB && !pairPlaced && count >= 2);

        if (willPlaceSpecial) neededSpecials += 2;
        if (willPlacePair) neededSpecials += 2;

        const takeOther = Math.max(0, count - neededSpecials);
        const slice = shuffled.slice(currentIdx, currentIdx + takeOther);
        currentIdx += takeOther;

        if (willPlaceSpecial) {
          if (count >= 8) {
            const maxA = Math.max(1, slice.length - 5);
            const posA = Math.floor(Math.random() * maxA) + 1;
            slice.splice(posA, 0, studentA);

            const gap = 3 + Math.floor(Math.random() * 2);
            const posB = Math.min(slice.length, posA + gap);
            slice.splice(posB, 0, studentB);
          } else {
            if (Math.random() < 0.5) {
              slice.unshift(studentA);
              slice.push(studentB);
            } else {
              slice.unshift(studentB);
              slice.push(studentA);
            }
          }
          specialPlaced = true;
          studentA = null;
          studentB = null;
        }

        if (willPlacePair) {
          const pair = Math.random() < 0.5 ? [pairA, pairB] : [pairB, pairA];
          if (count >= 10 && slice.length >= 8) {
            slice.splice(8, 0, pair[0], pair[1]);
          } else {
            const pos = Math.min(slice.length, Math.max(0, count - 2));
            slice.splice(pos, 0, pair[0], pair[1]);
          }
          pairPlaced = true;
          pairA = null;
          pairB = null;
        }

        if (studentA && slice.length < count) { slice.push(studentA); studentA = null; }
        if (studentB && slice.length < count) { slice.push(studentB); studentB = null; specialPlaced = true; }
        if (pairA && slice.length < count) { slice.push(pairA); pairA = null; }
        if (pairB && slice.length < count) { slice.push(pairB); pairB = null; pairPlaced = true; }

        while (slice.length < count && currentIdx < shuffled.length) {
          slice.push(shuffled[currentIdx++]);
        }

        roomStudents.push(...slice);

        const finalizedStudents = roomStudents.map((s, sIdx) => ({
          siraNo: sIdx + 1,
          no: s.no,
          name: s.name,
          groupName: group.name
        }));

        applySeatIntegrity(finalizedStudents, isSpecialCourse, pairActive);
        finalizedStudents.forEach((s, sIdx) => s.siraNo = sIdx + 1);

        results.push({
          groupName: group.name,
          roomName: allotment.room.name,
          capacity: allotment.room.capacity,
          students: finalizedStudents
        });
      }

      const unplacedList = [];
      if (studentA) unplacedList.push(studentA);
      if (studentB) unplacedList.push(studentB);
      if (pairA) unplacedList.push(pairA);
      if (pairB) unplacedList.push(pairB);

      for (const unplaced of unplacedList) {
        let targetRoom = results.find(r => r.students.length < r.capacity) || results[results.length - 1];
        if (targetRoom) {
          targetRoom.students.push({
            siraNo: targetRoom.students.length + 1,
            no: unplaced.no,
            name: unplaced.name,
            groupName: group.name
          });
          applySeatIntegrity(targetRoom.students, isSpecialCourse, pairActive);
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
    normalizeName,
    getPairUsageCount,
    resetPairUsageCount
  };
})();
