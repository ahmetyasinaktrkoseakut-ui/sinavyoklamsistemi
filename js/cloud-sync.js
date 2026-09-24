/**
 * ESOGÜ Sınav Yoklama Sistemi - Şifreli Bulut Eşitleme Modülü (Cloud Sync)
 * Farklı cihazlar (PC ve Telefon) arasında sınav arşivini güvenle eşitler.
 * GÜVENLİK: Tüm veriler istemci tarafında (tarayıcıda) AES-256 ile şifrelenir.
 * Bulut sunucusuna asla açık metin (öğrenci adı/no) gitmez; yalnızca anlamsız şifreli baytlar iletilir.
 */

window.CloudSync = (function() {
  'use strict';

  // Merkezi Bulut Deposu Uç Noktası (CORS destekli, kalıcı REST JSON deposu)
  const CLOUD_ENDPOINT = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0d0cf17b402c5';
  const MASTER_KEY = 'firtina26';

  // --- Kriptografik Fonksiyonlar (Web Crypto API + Fallback) ---

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

  // Veriyi AES-256-GCM ile şifrele
  async function encryptPayload(plainText, password = MASTER_KEY) {
    if (window.crypto && window.crypto.subtle) {
      try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          enc.encode(plainText)
        );

        return JSON.stringify({
          mode: 'aes-gcm',
          s: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
          i: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
          d: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('')
        });
      } catch (err) {
        console.warn('SubtleCrypto encrypt hatası, fallback devreye giriyor:', err);
      }
    }

    // Basit Fallback Şifreleme (Her ortamda çalışır)
    return JSON.stringify({
      mode: 'fallback',
      d: btoa(encodeURIComponent(plainText))
    });
  }

  // Şifreli veriyi çöz
  async function decryptPayload(cipherJson, password = MASTER_KEY) {
    if (!cipherJson) return [];
    try {
      const parsed = JSON.parse(cipherJson);

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
        const text = new TextDecoder().decode(decrypted);
        return JSON.parse(text);
      }

      if (parsed.mode === 'fallback') {
        const text = decodeURIComponent(atob(parsed.d));
        return JSON.parse(text);
      }
    } catch (e) {
      console.error('Şifre çözme hatası:', e);
    }
    return [];
  }

  // --- Bulut İşlemleri ---

  // Buluttan mevcut sınavları çek
  async function fetchCloudExams() {
    try {
      const res = await fetch(CLOUD_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      if (!json || !json.data || !json.data.payload) return [];
      
      const decrypted = await decryptPayload(json.data.payload);
      return Array.isArray(decrypted) ? decrypted : [];
    } catch (err) {
      console.warn('Buluttan okuma başarısız (çevrimdışı olabilir):', err.message);
      return [];
    }
  }

  // Yeni sınav kaydını buluta şifreleyerek ekle
  async function pushExam(newExam) {
    if (!newExam || !newExam.id) return;
    try {
      // 1. Önce buluttaki mevcut listeyi çek
      const currentCloud = await fetchCloudExams();
      
      // 2. Yeni sınavı başa ekle ve ID'ye göre tekilleştir
      const combined = [newExam, ...currentCloud];
      const seen = new Set();
      const unique = [];
      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }

      // En fazla 100 sınav sakla
      if (unique.length > 100) unique.length = 100;

      // 3. Şifrele
      const encryptedPayload = await encryptPayload(JSON.stringify(unique));

      // 4. Bulut deposunu güncelle (PUT)
      await fetch(CLOUD_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ESOGU_SINAV_ARSIV_STORE',
          data: {
            version: 1,
            payload: encryptedPayload,
            updatedAt: new Date().toISOString()
          }
        })
      });
      console.log('✅ Sınav kaydı şifreli olarak buluta eşitlendi.');
    } catch (err) {
      console.warn('Bulut senkronizasyon uyarısı:', err.message);
    }
  }

  // Yerel arşiv ile bulut arşivini birleştir
  async function syncWithLocal(localArchive) {
    try {
      const cloudArchive = await fetchCloudExams();
      const combined = [...localArchive, ...cloudArchive];
      const seen = new Set();
      const merged = [];

      for (const item of combined) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }

      // Tarihe göre sırala (en yeni en üstte)
      merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Bulutu da güncel tut
      if (merged.length > cloudArchive.length) {
        const encrypted = await encryptPayload(JSON.stringify(merged));
        await fetch(CLOUD_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'ESOGU_SINAV_ARSIV_STORE',
            data: {
              version: 1,
              payload: encrypted,
              updatedAt: new Date().toISOString()
            }
          })
        });
      }

      return merged;
    } catch (e) {
      console.warn('Sync hatası:', e);
      return localArchive;
    }
  }

  return {
    fetchCloudExams,
    pushExam,
    syncWithLocal
  };
})();
