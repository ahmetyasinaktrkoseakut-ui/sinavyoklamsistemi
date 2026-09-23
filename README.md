# ESOGÜ İlahiyat Fakültesi Sınav Yoklama ve Akıllı Dağıtım Otomasyonu

Bu sistem, ESOGÜ İlahiyat Fakültesi hocalarının sınav yoklama listelerini karmaşık satır sayma ve kopyala-yapıştır zahmetinden kurtararak, resmi formata %100 uygun şekilde saniyeler içinde hazırlamalarını sağlayan modern bir web otomasyonudur.

---

## 🌟 Öne Çıkan Özellikler

1. **Çoklu Liste Yükleme:**
   - **PDF:** OBS'den indirilen öğrenci listesi PDF'lerini doğrudan okur ve öğrenci numaralarını ayrıştırır.
   - **Excel:** `.xlsx`, `.xls` ve `.csv` formatındaki listeleri otomatik olarak tanır.
   - **Metin Yapıştırma:** OBS veya başka bir tablodan kopyalanan metinleri 1 saniyede listeye çevirir.

2. **Grup & Derslik Yönetimi:**
   - 2. Sınıf, 3. Sınıf, Şube A, Şube B veya Alttan Alanlar gibi birden fazla grubu ayrı ayrı tanımlama.
   - Her grubun hangi salonlara gireceğini tek tıkla seçme.
   - Fakülte salon havuzu:
     - Amfi 1-2 (24)
     - Derslik 1-4, 15 (36)
     - Derslik 13-14, 16-17 (20)
     - Derslik 18 (39 - tek tıkla 45 yap butonu)
     - Derslik 5..12 ve sınırsız özel salon ekleme imkanı.
   - Kontenjanlar her sınav için anlık olarak düzenlenebilir.

3. **Akıllı Karıştırma (Kelebek / Kopya Önleme):**
   - Her grup kendi öğrencileri arasında rastgele karıştırılarak salonlara yerleştirilir.

4. **Çıktı Formatları:**
   - **Word (.docx):** A4 dikey baskıya tam ayarlı, resmi başlıklı, gözetmen alanlı ve her sayfa/tablo altında **`FIRTINA YAZILIM HİZMETİ`** imzalı Word belgesi.
   - **Excel (.xlsx):** Fakültenin resmi `LİSTE ŞABLONU.xlsx` düzeniyle birebir aynı şablonda Excel dosyası.
   - **Yazdır / PDF:** Tarayıcıdan tek tıkla doğrudan A4 çıktısı alma.

5. **Gizli Yönetici ve Arşiv Paneli (Ahmet Yasin Aktürk):**
   - Alt kısımdaki telif yazısına 5 kez hızlıca tıklanarak veya klavyeden `Ctrl + Shift + A` tuşlarına basılarak açılır.
   - **Şifre:** `firtina26`
   - Bugüne kadar yapılan tüm dağıtımlar burada arşivlenir, incelenebilir veya tekrar indirilebilir.
   - İsteğe bağlı olarak Discord veya Telegram Webhook linki eklenerek sınav dağıtımlarından anlık bildirim alınabilir.

---

## 🚀 Yerel Kullanım (Bilgisayarda Açma)

1. Proje klasöründeki **`baslat.bat`** dosyasına çift tıklayın.
2. Veya doğrudan **`index.html`** dosyasını Google Chrome / Microsoft Edge ile açın.
3. İnternet bağlantısı olmasa bile tüm kütüphaneler yerel çalıştığı için sorunsuz çalışır.

---

## 🌐 Vercel'e Dağıtım (Tüm Hocalara İnternet Linki Vermek İçin)

Projeyi Vercel'de yayınlayıp hocalara link olarak göndermek için:

### Yöntem A: Vercel CLI İle (En Hızlısı)
1. Terminal veya PowerShell'i bu klasörde açın:
   ```bash
   npx vercel
   ```
2. Sorulan soruları Enter ile onaylayın.
3. 30 saniye içinde size `https://esogu-sinav-yoklama.vercel.app` gibi bir canlı link verecektir!

### Yöntem B: GitHub Üzerinden
1. Bu klasörü bir GitHub deposuna (repository) yükleyin.
2. [Vercel.com](https://vercel.com) adresine gidin, "Add New Project" diyerek depoyu seçin.
3. "Deploy" butonuna basın; hiçbir ek ayar gerekmeden siteniz yayına girecektir.

---

## 👨‍💻 Yapımcı & Telif

> **Bu sistem AHMET YASİN AKTÜRK tarafından ESOGÜ İLAHİYAT hocalarının hizmetine sunulmak için yapılmıştır.**  
> **FIRTINA YAZILIM HİZMETİ**
