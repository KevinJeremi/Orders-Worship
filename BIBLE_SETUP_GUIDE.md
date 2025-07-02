# Bible Setup Guide - Panduan Setup Alkitab

## 📖 Pengantar

Aplikasi Worship Presentation sekarang mendukung tampilan ayat Alkitab dengan fitur:

- Import data Alkitab dari file CSV
- Pencarian ayat berdasarkan teks atau referensi
- Navigasi berdasarkan kitab, pasal, dan ayat
- Tampilan ayat yang indah di layar presentasi

## 🚀 Cara Setup

### 1. Prepare File CSV Alkitab

File CSV harus memiliki kolom dengan nama-nama berikut (salah satu dari alternatif):

**Kolom yang Dikenali:**

- **Book ID**: `book_id`, `book`, atau `kitab`
- **Chapter**: `chapter` atau `pasal`
- **Verse Number**: `verse`, `ayat_no`, atau `verse_number`
- **Verse Text**: `text`, `ayat`, atau `isi`

**Contoh Format CSV:**

```csv
book_id,book,chapter,verse,text
gen,Kejadian,1,1,"Pada mulanya Allah menciptakan langit dan bumi."
gen,Kejadian,1,2,"Bumi belum berbentuk dan kosong; gelap gulita menutupi samudera raya, dan Roh Allah melayang-layang di atas permukaan air."
joh,Yohanes,3,16,"Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal."
```

### 2. Import Data ke Aplikasi

1. Buka aplikasi Worship Presentation
2. Di panel kiri, klik tab **"Bible"**
3. Jika belum ada data, Anda akan melihat area drop file
4. **Drag & Drop** file CSV Anda ke area tersebut, atau
5. Klik **"Pilih File CSV"** untuk memilih file secara manual

### 3. Gunakan Fitur Alkitab

Setelah data terload, Anda dapat:

#### **Pencarian Ayat:**

- Ketik kata kunci di kotak pencarian untuk mencari dalam teks ayat
- Ketik referensi seperti "Yohanes 3:16" untuk mencari ayat spesifik
- Hasil akan ditampilkan dengan referensi dan teks ayat

#### **Navigasi Manual:**

- Pilih kitab dari daftar Perjanjian Lama atau Perjanjian Baru
- Pilih pasal yang tersedia
- Pilih ayat yang diinginkan

#### **Menampilkan Ayat:**

- Klik pada ayat yang diinginkan
- Ayat akan otomatis muncul di panel preview
- Klik **"Show Presentation"** untuk menampilkan di layar presentasi

## 🗂 Format Book ID yang Didukung

Aplikasi mengenali ID kitab standar berikut:

**Perjanjian Lama:**

- `gen` - Kejadian
- `exo` - Keluaran
- `lev` - Imamat
- `num` - Bilangan
- `deu` - Ulangan
- `jos` - Yosua
- `jdg` - Hakim-hakim
- `rut` - Rut
- `1sa` - 1 Samuel
- `2sa` - 2 Samuel
- ... (dan seterusnya)

**Perjanjian Baru:**

- `mat` - Matius
- `mar` - Markus
- `luk` - Lukas
- `joh` - Yohanes
- `act` - Kisah Para Rasul
- `rom` - Roma
- `1co` - 1 Korintus
- ... (dan seterusnya)

## 📝 Tips dan Troubleshooting

### File CSV Tidak Terbaca?

- Pastikan encoding file adalah UTF-8
- Pastikan menggunakan koma (,) sebagai delimiter
- Pastikan text yang mengandung koma diapit tanda kutip ("")

### Data Tidak Muncul?

- Periksa nama kolom di baris pertama CSV
- Pastikan tidak ada baris kosong di awal file
- Cek console browser untuk pesan error

### Pencarian Tidak Bekerja?

- Pastikan menggunakan minimal 2 karakter untuk pencarian
- Coba gunakan kata yang lebih spesifik
- Periksa ejaan kitab dan referensi

## 🎨 Kustomisasi Tampilan

Ayat Alkitab akan menggunakan theme yang sama dengan lagu:

- Font, ukuran, dan warna dapat diatur di panel Media
- Background dapat diubah (warna solid, gambar, atau video)
- Text alignment dapat disesuaikan

## 📚 Sumber Data Alkitab

Anda dapat mendapatkan data Alkitab dalam format CSV dari:

- [Open Scripture](https://ebible.org/)
- [Bible API](https://scripture.api.bible/)
- Konversi dari format lain (JSON, XML, database)

## 🆘 Support

Jika mengalami masalah:

1. Periksa file `sample_bible.csv` sebagai contoh format yang benar
2. Pastikan aplikasi berjalan dalam mode Electron (bukan browser)
3. Restart aplikasi jika data tidak ter-refresh

---

**Happy Worship! 🙏**
