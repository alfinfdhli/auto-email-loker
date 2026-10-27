# Auto E-Mail Loker
### AI-Powered Job Application Assistant

Aplikasi berbasis Google Apps Script untuk membantu mengolah informasi lowongan kerja, menyiapkan draf lamaran berbantuan AI, dan mengelola proses pengiriman email lamaran kerja.

## Fitur Utama

- **AI-Powered Job Analysis:** Membantu mengidentifikasi informasi penting dari lowongan kerja.
- **Automated Email Drafting:** Menyusun draf email lamaran berdasarkan informasi lowongan dan profil pelamar.
- **Google Forms Support:** Membantu mengidentifikasi lowongan yang menggunakan Google Forms dan menyiapkan informasi yang diperlukan.
- **Document Management:** Mendukung penggunaan dokumen lamaran seperti CV, ijazah, transkrip nilai, dan sertifikat PKPA.
- **Google Sheets Integration:** Menyimpan dan mengelola data lowongan melalui Google Sheets.
- **Email Automation:** Mendukung proses pengiriman email lamaran melalui Google Apps Script.
- **AI Model Integration:** Menggunakan Gemini API untuk pemrosesan informasi berbasis AI.

## Tech Stack

- Google Apps Script
- HTML, CSS, JavaScript
- Google Sheets
- Google Drive
- Gemini API

## Project Structure

```text
Auto-E-Mail-Loker/
├── Code.gs       # Backend and application logic
├── Index.html    # Web application interface
└── README.md     # Project documentation
```

## Configuration

Aplikasi menggunakan Google Apps Script dan membutuhkan konfigurasi layanan berikut:

- Google Sheets untuk penyimpanan data.
- Google Drive untuk pengelolaan dokumen.
- Gemini API untuk pemrosesan AI.
- Gmail untuk pengiriman email lamaran.

Simpan API keys, ID dokumen, ID folder, dan konfigurasi sensitif lainnya menggunakan **Google Apps Script Script Properties**, bukan dengan menuliskannya langsung di source code.

Jangan mengunggah API keys, data pribadi, kredensial, atau dokumen lamaran ke repository publik.

## Setup

1. Buat proyek baru di Google Apps Script.
2. Tambahkan file `Code.gs` dan `Index.html`.
3. Konfigurasikan Script Properties sesuai kebutuhan aplikasi.
4. Siapkan Google Sheets dan Google Drive yang akan digunakan.
5. Atur izin layanan Google yang diperlukan.
6. Konfigurasikan Gemini API.
7. Uji aplikasi menggunakan data contoh.
8. Deploy sebagai Web App setelah konfigurasi selesai.

Nama fungsi, properti konfigurasi, dan struktur spreadsheet harus mengikuti implementasi yang digunakan dalam proyek.

## Security Notes

- Jangan menyimpan API keys langsung di source code.
- Jangan mengunggah informasi pribadi pelamar atau dokumen sensitif.
- Batasi akses Google Sheets, Google Drive, dan Web App sesuai kebutuhan.
- Periksa kembali konfigurasi deployment sebelum aplikasi digunakan.

## Disclaimer

This project is intended to assist with job application workflows. AI-generated content may contain errors and should be reviewed before use. Users remain responsible for verifying job information, reviewing application materials, and confirming email recipients before sending applications.

## Status

Personal project under development.
Semua hal dalam proyek ini adalah difokuskan untuk anak hukum yang telah melakukan sertifikasi advokat PKPA ataupun UPA, Mohon sesuaikan kualitas dan responsibilitas anda.

## Author

Alfin Fadhli
