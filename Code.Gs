/**
- AUTO E-MAIL, GFORM & COVER LETTER PDF GENERATOR - BACKEND SYSTEM
- Developer: Alfin Fadhli, S.H.
 */

// =========================================================
// 1. KONFIGURASI SCRIPT & PROPERTIS
// =========================================================
function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var keysFromProps = props.getProperty("GEMINI_KEYS");

  var defaultKeys = [
    "xxxx",
    "xxxx",
    "xxxx"
  ];

  var geminiKeys = keysFromProps
    ? keysFromProps.split(",").map(function(k){ return k.trim(); }).filter(Boolean)
    : defaultKeys;

  return {
    geminiKeys: geminiKeys,
    geminiModel: props.getProperty("GEMINI_MODEL") || "gemini-2.0-flash",
    folderTambahanId: props.getProperty("FOLDER_TAMBAHAN_ID") || "xxxx",
    idTemplateDocs: props.getProperty("ID_TEMPLATE_DOCS") || "xxxx",
    folderSuratNama: "TEMPLATE SURAT LAMARAN",
    idCv: props.getProperty("ID_CV") || "xxxx",
    idIjazah: props.getProperty("ID_IJAZAH") || "xxxx",
    idTranskrip: props.getProperty("ID_TRANSKRIP") || "xxxx",
    idPkpaUpa: props.getProperty("ID_PKPA_UPA") || "xxxx"
  };
}

function getFolderSuratLamaran_(config) {
  var folders = DriveApp.getFoldersByName(config.folderSuratNama);
  if (folders.hasNext()) return folders.next();
  return DriveApp.getFolderById(config.folderTambahanId);
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Input Loker & Cover Letter AI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getAppLinks() {
  var config = getConfig_();
  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var driveFolderUrl = "https://drive.google.com/drive/folders/" + config.folderTambahanId;
  return { sheetUrl: sheetUrl, driveFolderUrl: driveFolderUrl };
}

function jalankanKirimEmailManual() {
  return kirimEmailOtomatis();
}

// =========================================================
// 2. ATURAN PROFIL & SYSTEM INSTRUCTION GEMINI API
// =========================================================
var SYSTEM_INSTRUCTION = 
  "Kamu adalah asisten penyusun lamaran kerja profesional untuk kandidat Alfin Fadhli, S.H.\n\n" +
  "ATURAN MUTLAK:\n" +
  "1. PENDIDIKAN & GELAR:\n" +
  "   - Wajib menyebutkan secara eksplisit bahwa pelamar adalah Sarjana Hukum dari UIN Sunan Kalijaga (DILARANG menggunakan frasa 'lulusan Ilmu Hukum').\n" +
  "   - Sebutkan IPK 3.92. DILARANG MENYEBUTKAN predikat 'Cum Laude' atau 'Cumlaude'.\n" +
  "2. KUALIFIKASI KHUSUS:\n" +
  "   - Wajib mencantumkan bahwa pelamar telah menyelesaikan Pendidikan Khusus Profesi Advokat (PKPA) PERADI – CLE FH UI dan dinyatakan LOLOS UJIAN PROFESI ADVOKAT (UPA) PERADI.\n" +
  "3. DETEKSI GOOGLE FORM & BUKTI PENDUKUNG:\n" +
  "   - Set 'is_gform': true jika loker berbasis Google Form / Form Web, ekstrak URL ke 'link_gform' (atau '-').\n" +
  "   - Set 'requires_unsupported_doc': true jika loker meminta berkas khusus di luar berkas standar pelamar, detailkan di 'missing_docs_detail' (atau '-'), dan susun jawaban di 'gform_helper_answers'.\n" +
  "4. BODY EMAIL ('pesan'):\n" +
  "   - Ringkas, formal, persuasif, bebas markdown/bold/italic, pisahkan paragraf dengan \\n\\n.\n" +
  "   - Akhiri 'pesan' persis dengan 5 baris identitas berikut:\n" +
  "   Hormat saya,\n" +
  "   Alfin Fadhli, S.H.\n" +
  "   Telepon/WhatsApp: xxxx\n" +
  "   Email: xxxx\n" +
  "   LinkedIn: xxxx\n" +
  "   Domisili: Matraman, Jakarta Timur\n" +
  "5. SURAT LAMARAN DOCS ('surat_lamaran' - WAJIB 5 PARAGRAF PRESISI):\n" +
  "   - Jika bahasa surat diminta 'ID' atau 'EN', isi semua field objek 'surat_lamaran' 100% dalam bahasa tersebut.\n" +
  "   - Jika 'ID': status_penempatan='Bersedia ditempatkan di mana saja', label_perihal='Perihal: Lamaran Posisi [Posisi]', salam_pembuka='Yth. [Penerima] [Nama Perusahaan],', salam_penutup='Hormat saya,'.\n" +
  "   - Jika 'EN': status_penempatan='Willing to be relocated', label_perihal='Subject: Application for [Position] Position', salam_pembuka='Dear [Recipient] of [Company Name],', salam_penutup='Sincerely,'.\n" +
  "   - Jika alamat perusahaan tidak tercantum di iklan loker, isi 'di Tempat' (ID) atau 'On Site' (EN).\n" +
  "   - SUSUNAN WAJIB 5 PARAGRAF:\n" +
  "     * paragraf_1 (PEMBUKA): Hanya pernyataan ketertarikan melamar posisi yang dituju di perusahaan tersebut (Contoh ID: 'Sehubungan dengan informasi lowongan pekerjaan yang tersedia di [Nama Perusahaan] untuk posisi [Posisi], saya yang bertanda tangan di bawah ini mengajukan diri untuk bergabung dengan perusahaan yang Bapak/Ibu pimpin.'). JANGAN masukkan detail kampus/IPK di paragraf 1.\n" +
  "     * paragraf_2 (PENDIDIKAN & PENGALAMAN HUKUM): Awali dengan kualifikasi pendidikan ('Saya adalah Sarjana Hukum dari UIN Sunan Kalijaga dengan IPK 3.92, serta telah menyelesaikan Pendidikan Khusus Profesi Advokat (PKPA) PERADI – CLE FH UI dan dinyatakan lolos Ujian Profesi Advokat (UPA) PERADI.'), lalu lanjutkan pengalaman sebagai Advocate Intern di Digdaya Eternity Law Office (sesuaikan urutan keahlian: corporate compliance, perizinan usaha seperti OSS RBA, NIB, dan KBLI, legal drafting, serta penanganan sengketa perdata dan komersial sesuai kebutuhan loker).\n" +
  "     * paragraf_3 (PENGALAMAN PT NEORA - WAJIB LENGKAP): Gunakan isi berikut secara utuh (atau terjemahan bahasa Inggrisnya yang akurat jika bahasa='EN'): 'Sebelum bergabung dengan Digdaya Eternity Law Office, saya memiliki pengalaman profesional di PT Neora Infrastructure Indonesia, Palembang, sebagai Project Administrator dan Logistics & Field Coordinator. Dalam kedua posisi tersebut, saya bertanggung jawab atas pengelolaan dokumentasi proyek, validasi lebih dari 1.500 Work Orders (WO) setiap bulan, pemantauan operasional harian, serta koordinasi empat tim lapangan yang terdiri dari delapan personel. Saya juga terlibat dalam penerapan SOP, pemantauan kepatuhan operasional, dan pengelolaan catatan aset perusahaan. Pengalaman ini memperkuat kemampuan saya dalam administrasi, koordinasi lintas tim, pengelolaan risiko operasional, serta penerapan prosedur dan standar kepatuhan dalam lingkungan perusahaan.'\n" +
  "     * paragraf_4 (KONTRIBUSI SPESIFIK): 1 paragraf ringkas (2 kalimat) yang menonjolkan kemampuan analisis hukum, pemahaman regulasi/operasional, serta kesiapan mendukung bisnis dan posisi yang dilamar di perusahaan tujuan.\n" +
  "     * paragraf_5 (PENUTUP): Permohonan kesempatan wawancara dan ucapan terima kasih (Contoh ID: 'Demikian surat lamaran ini saya sampaikan. Besar harapan saya untuk dapat diberikan kesempatan menghadiri tahap wawancara guna memaparkan kualifikasi saya secara lebih rinci. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.').\n" +
  "   - Jika bahasa surat lamaran = 'NONE', isi semua field 'surat_lamaran' dengan '-'.";

var PROFIL_PELAMAR = 
  "Nama Lengkap: Alfin Fadhli, S.H.\n" +
  "Pendidikan: Sarjana Hukum (UIN Sunan Kalijaga Yogyakarta, IPK 3.92), PKPA (PERADI – CLE FH UI)\n" +
  "Sertifikasi: Lolos Ujian Profesi Advokat (UPA) PERADI\n" +
  "Domisili: Matraman, Jakarta Timur\n\n" +
  "PILAR PENGALAMAN:\n" +
  "1. LEGAL / HUKUM: Advocate Intern di Digdaya Eternity Law Office, Jakarta. Menangani sengketa perdata dan komersial (wanprestasi, perbuatan melawan hukum, permohonan eksekusi), legal drafting (somasi, gugatan, jawaban), pendampingan klien di kepolisian, serta pengurusan perizinan usaha (OSS RBA, NIB, KBLI) dan corporate compliance.\n" +
  "2. ADMIN & OPERASIONAL: Ex-Project Administrator & Logistics Coordinator di PT Neora Infrastructure Indonesia, Palembang (pengelolaan dokumentasi proyek, validasi >1.500 Work Orders/bulan, penerapan SOP, pemantauan kepatuhan operasional, pengelolaan aset, dan koordinasi 4 tim lapangan / 8 personel).\n" +
  "3. WRITING & CONTENT: Ex-Freelance Writer VIVA Group & Jurnalis LPM Rhetor.";

// =========================================================
// 3. ENGINE PEMANGGILAN GEMINI API (ROTASI KEY + FALLBACK)
// =========================================================
function panggilGeminiApiRotasi_(payload) {
  var config = getConfig_();
  var keys = config.geminiKeys;

  if (!keys || keys.length === 0) {
    throw new Error("Daftar API Key belum dikonfigurasi.");
  }

  var modelsToTry = [config.geminiModel, "gemini-1.5-flash", "gemini-3.5-flash-lite"];
  var lastErrorMsg = "";

  for (var m = 0; m < modelsToTry.length; m++) {
    var currentModel = modelsToTry[m];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(currentModel) + ":generateContent";

    for (var k = 0; k < keys.length; k++) {
      var options = {
        method: "post",
        contentType: "application/json",
        headers: { "x-goog-api-key": keys[k] },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      for (var attempt = 1; attempt <= 2; attempt++) {
        var res = UrlFetchApp.fetch(url, options);
        var code = res.getResponseCode();
        var body = {};
        try { body = JSON.parse(res.getContentText()); } catch(e) { body = { rawText: res.getContentText() }; }

        if (code === 200 && body.candidates && body.candidates[0] && body.candidates[0].content) {
          return body;
        }

        var errorMsg = (body.error && body.error.message) ? body.error.message : "HTTP Status " + code;
        lastErrorMsg = "[" + currentModel + "] Key #" + (k + 1) + " -> " + errorMsg;

        if (code === 429 || code === 403) break;
        if ((code === 500 || code === 503 || errorMsg.indexOf("high demand") !== -1) && attempt < 2) {
          Utilities.sleep(1000);
          continue;
        }
        if (code === 400) throw new Error("Permintaan tidak valid (HTTP 400): " + errorMsg);
      }
    }
  }
  throw new Error("Semua Key & Model gagal diproses: " + lastErrorMsg);
}

// =========================================================
// 4. GENERATOR PDF SURAT LAMARAN DARI TEMPLATE GOOGLE DOCS
// =========================================================
function generateCoverLetterPdf_(suratData, perusahaan, posisi, lang) {
  var config = getConfig_();
  var templateFile = DriveApp.getFileById(config.idTemplateDocs);
  var targetFolder = getFolderSuratLamaran_(config);

  var cleanCompany = (perusahaan || "Perusahaan").replace(/[\\/:*?"<>|]/g, "").trim();
  var fileName = "Surat_Lamaran_Alfin_Fadhli_" + cleanCompany;

  var copyFile = templateFile.makeCopy(fileName, targetFolder);
  var copyId = copyFile.getId();
  var doc = DocumentApp.openById(copyId);
  var body = doc.getBody();

  var replacements = {
    "\\{\\{STATUS_PENEMPATAN\\}\\}": suratData.status_penempatan || "",
    "\\{\\{TANGGAL\\}\\}": suratData.tanggal || "",
    "\\{\\{PENERIMA\\}\\}": suratData.penerima || "",
    "\\{\\{NAMA_PERUSAHAAN\\}\\}": suratData.nama_perusahaan || perusahaan || "",
    "\\{\\{ALAMAT_PERUSAHAAN\\}\\}": suratData.alamat_perusahaan || "",
    "\\{\\{LABEL_PERIHAL\\}\\}": suratData.label_perihal || "",
    "\\{\\{SALAM_PEMBUKA\\}\\}": suratData.salam_pembuka || "",
    "\\{\\{PARAGRAF_1\\}\\}": suratData.paragraf_1 || "",
    "\\{\\{PARAGRAF_2\\}\\}": suratData.paragraf_2 || "",
    "\\{\\{PARAGRAF_3\\}\\}": suratData.paragraf_3 || "",
    "\\{\\{PARAGRAF_4\\}\\}": suratData.paragraf_4 || "",
    "\\{\\{PARAGRAF_5\\}\\}": suratData.paragraf_5 || "",
    "\\{\\{SALAM_PENUTUP\\}\\}": suratData.salam_penutup || ""
  };

  for (var pattern in replacements) {
    body.replaceText(pattern, replacements[pattern]);
  }
  doc.saveAndClose();

  var pdfBlob = copyFile.getAs("application/pdf").setName(fileName + ".pdf");
  var pdfFile = targetFolder.createFile(pdfBlob);
  copyFile.setTrashed(true);

  var fullPlainText = [
    suratData.paragraf_1,
    suratData.paragraf_2,
    suratData.paragraf_3,
    suratData.paragraf_4,
    suratData.paragraf_5
  ].filter(Boolean).join("\n\n");

  return {
    pdfFileId: pdfFile.getId(),
    pdfFileName: fileName + ".pdf",
    pdfBase64: Utilities.base64Encode(pdfBlob.getBytes()),
    plainText: fullPlainText
  };
}

// =========================================================
// 5. FUNGSI UTAMA: ANALISIS, GENERATE PDF & SIMPAN KE SHEET
// =========================================================
function analisisDanSimpan(base64Image, mimeType, textInput, extraDoc, options) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error("Proses sedang berjalan, mohon tunggu sebentar.");
  }

  try {
    options = options || {};
    var coverLetterLang = options.coverLetterLang || "NONE";
    var saveToSheet = options.saveToSheet !== false;
    var attachments = options.attachments || { cv: true, surat: true, ijazah: false, transkrip: false, pkpa_upa: false };

    if (!base64Image && (!textInput || textInput.trim() === "")) {
      throw new Error("Input tidak boleh kosong. Masukkan gambar SS atau teks deskripsi loker.");
    }

    var todayStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMMM yyyy");
    var parts = [
      { text: "PROFIL PELAMAR:\n" + PROFIL_PELAMAR },
      { text: "TANGGAL HARI INI: " + todayStr + "\nBAHASA SURAT LAMARAN DIMINTA: " + coverLetterLang }
    ];

    if (textInput && textInput.trim() !== "") {
      parts.push({ text: "DESKRIPSI / LINK LOKER:\n" + textInput.substring(0, 10000) });
    }

    if (base64Image) {
      if (base64Image.length > (7 * 1024 * 1024 * 4 / 3)) {
        throw new Error("Ukuran gambar terlalu besar (Maksimal 7MB).");
      }
      parts.push({ inline_data: { mime_type: mimeType || "image/png", data: base64Image } });
    }

    parts.push({ text: "Analisis lowongan kerja di atas dan susun output JSON sesuai schema." });

    var payload = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            perusahaan: { type: "STRING" },
            email:      { type: "STRING" },
            email_cc:   { type: "STRING" },
            posisi:     { type: "STRING" },
            kategori:   { type: "STRING", enum: ["Legal", "Admin", "Writing", "Umum"] },
            subjek:     { type: "STRING" },
            pesan:      { type: "STRING" },
            link_gform: { type: "STRING" },
            is_gform:   { type: "BOOLEAN" },
            requires_unsupported_doc: { type: "BOOLEAN" },
            missing_docs_detail:       { type: "STRING" },
            gform_helper_answers:      { type: "STRING" },
            catatan_ai:                { type: "STRING" },
            surat_lamaran: {
              type: "OBJECT",
              properties: {
                status_penempatan: { type: "STRING" },
                tanggal:           { type: "STRING" },
                penerima:          { type: "STRING" },
                nama_perusahaan:   { type: "STRING" },
                alamat_perusahaan: { type: "STRING" },
                label_perihal:     { type: "STRING" },
                salam_pembuka:     { type: "STRING" },
                paragraf_1:        { type: "STRING" },
                paragraf_2:        { type: "STRING" },
                paragraf_3:        { type: "STRING" },
                paragraf_4:        { type: "STRING" },
                paragraf_5:        { type: "STRING" },
                salam_penutup:     { type: "STRING" }
              },
              required: [
                "status_penempatan", "tanggal", "penerima", "nama_perusahaan", "alamat_perusahaan",
                "label_perihal", "salam_pembuka", "paragraf_1", "paragraf_2", "paragraf_3", "paragraf_4", "paragraf_5", "salam_penutup"
              ]
            }
          },
          required: [
            "perusahaan", "email", "email_cc", "posisi", "kategori", "subjek", "pesan",
            "link_gform", "is_gform", "requires_unsupported_doc", "missing_docs_detail",
            "gform_helper_answers", "catatan_ai", "surat_lamaran"
          ]
        }
      }
    };

    var responseJson = panggilGeminiApiRotasi_(payload);
    var data = JSON.parse(responseJson.candidates[0].content.parts[0].text);

    var pesanRapi = (data.pesan || "-").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    var pdfResult = null;
    if (coverLetterLang === "ID" || coverLetterLang === "EN") {
      pdfResult = generateCoverLetterPdf_(data.surat_lamaran, data.perusahaan, data.posisi, coverLetterLang);
    }

    var config = getConfig_();
    var extraDocFileId = "-";
    if (extraDoc && extraDoc.base64) {
      try {
        var decodedBlob = Utilities.newBlob(
          Utilities.base64Decode(extraDoc.base64),
          extraDoc.mimeType || "application/octet-stream",
          extraDoc.name
        );
        var folder = DriveApp.getFolderById(config.folderTambahanId);
        var createdFile = folder.createFile(decodedBlob);
        extraDocFileId = createdFile.getId();
      } catch (errUpload) {
        extraDocFileId = "UPLOAD_GAGAL: " + errUpload.message;
      }
    }

    if (saveToSheet) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Email Queue") || ss.getActiveSheet();

      if (sheet.getLastColumn() < 16) {
        sheet.getRange(1, 12).setValue("Kategori");
        sheet.getRange(1, 13).setValue("Email CC");
        sheet.getRange(1, 14).setValue("Link GForm");
        sheet.getRange(1, 15).setValue("Mode GForm & Catatan AI");
        sheet.getRange(1, 16).setValue("ID Surat Lamaran PDF");
      }

      var initialStatus = "";
      var gformModeStatus = "-";
      if (data.is_gform || (data.link_gform && data.link_gform !== "-" && data.link_gform.indexOf("http") !== -1)) {
        if (data.requires_unsupported_doc) {
          initialStatus = "BUTUH_DOKUMEN: " + (data.missing_docs_detail || "Dokumen Pendukung Khusus");
          gformModeStatus = "MODE_HELPER_MISSING_DOC";
        } else {
          initialStatus = "PERLU_ISI_GFORM";
          gformModeStatus = "AUTO_SUBMIT_READY";
        }
      }

      var attachSuratId = (pdfResult && attachments.surat) ? pdfResult.pdfFileId : "-";

      sheet.appendRow([
        data.perusahaan || "-",
        data.email || "-",
        data.posisi || "-",
        data.subjek || "-",
        pesanRapi,
        initialStatus,
        attachments.ijazah ? "Lampirkan" : "Tidak",
        attachments.transkrip ? "Lampirkan" : "Tidak",
        attachments.pkpa_upa ? "Lampirkan" : "Tidak",
        attachments.cv ? "Lampirkan" : "Tidak",
        extraDocFileId,
        data.kategori || "-",
        data.email_cc || "-",
        data.link_gform || "-",
        gformModeStatus + " | " + (data.catatan_ai || "-"),
        attachSuratId
      ]);
    }

    var msgSuccess = saveToSheet
      ? "Data masuk antrean Sheet" + (pdfResult ? " & PDF Surat Lamaran siap!" : "!")
      : "PDF Surat Lamaran berhasil dibuat & disimpan ke Drive!";

    return JSON.stringify({
      status: "SUCCESS",
      message: msgSuccess,
      is_gform: data.is_gform,
      requires_unsupported_doc: data.requires_unsupported_doc,
      missing_docs_detail: data.missing_docs_detail,
      link_gform: data.link_gform,
      gform_helper_answers: data.gform_helper_answers,
      pesan_lamaran: pesanRapi,
      pdf_generated: !!pdfResult,
      pdf_file_name: pdfResult ? pdfResult.pdfFileName : "",
      pdf_base64: pdfResult ? pdfResult.pdfBase64 : "",
      cover_letter_text: pdfResult ? pdfResult.plainText : ""
    });

  } finally {
    lock.releaseLock();
  }
}

// =========================================================
// 6. ENGINE PENGIRIM EMAIL HTML RESPONSIVE (TRIGGER JAM 10-11)
// =========================================================
function kirimEmailOtomatis() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return "Proses lain sedang berjalan, mohon tunggu.";

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Email Queue") || ss.getSheets()[0];

    var startRow = 2;
    var lastRow = sheet.getLastRow();
    if (lastRow < startRow) return "Tidak ada antrean email di sheet.";

    var numRows = lastRow - startRow + 1;
    var maxCols = Math.max(sheet.getLastColumn(), 16);
    var data = sheet.getRange(startRow, 1, numRows, maxCols).getValues();
    var config = getConfig_();

    var cachedAttachments = {};
    try { if (config.idCv) cachedAttachments.cv = DriveApp.getFileById(config.idCv).getBlob(); } catch(e){}
    try { if (config.idIjazah) cachedAttachments.ijazah = DriveApp.getFileById(config.idIjazah).getBlob(); } catch(e){}
    try { if (config.idTranskrip) cachedAttachments.transkrip = DriveApp.getFileById(config.idTranskrip).getBlob(); } catch(e){}
    try { if (config.idPkpaUpa) cachedAttachments.pkpaUpa = DriveApp.getFileById(config.idPkpaUpa).getBlob(); } catch(e){}

    function isAttachmentRequested(val) {
      return val && val.toString().trim().toLowerCase() === "lampirkan";
    }

    var countTerkirim = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowIndex = startRow + i;

      var emailHRD  = row[1] ? row[1].toString().trim() : "";
      var subjek    = row[3] ? row[3].toString().trim() : "";
      var pesan     = row[4] ? row[4].toString().trim() : "";
      var status    = row[5] ? row[5].toString().trim().toUpperCase() : "";
      var emailCC   = row[12] ? row[12].toString().trim() : "";
      var suratPdfId = row[15] ? row[15].toString().trim() : "";

      if (status === "") {
        if (!emailHRD || emailHRD === "-" || emailHRD.indexOf("@") === -1) {
          sheet.getRange(rowIndex, 6).setValue("GAGAL: Email HRD Tidak Valid");
          continue;
        }

        sheet.getRange(rowIndex, 6).setValue("SEDANG_DIPROSES");

        var lampiran = [];
        try {
          if (suratPdfId && suratPdfId !== "-") {
            try { lampiran.push(DriveApp.getFileById(suratPdfId).getBlob()); } catch (errSurat) {}
          }
          if (isAttachmentRequested(row[9]) && cachedAttachments.cv) lampiran.push(cachedAttachments.cv);
          if (isAttachmentRequested(row[6]) && cachedAttachments.ijazah) lampiran.push(cachedAttachments.ijazah);
          if (isAttachmentRequested(row[7]) && cachedAttachments.transkrip) lampiran.push(cachedAttachments.transkrip);
          if (isAttachmentRequested(row[8]) && cachedAttachments.pkpaUpa) lampiran.push(cachedAttachments.pkpaUpa);

          var optExtraDoc = row[10];
          if (optExtraDoc && optExtraDoc !== "-" && optExtraDoc.indexOf("UPLOAD_GAGAL") === -1) {
            try { lampiran.push(DriveApp.getFileById(optExtraDoc.toString().trim()).getBlob()); } catch (errDoc) {}
          }

          var formattedPesan = pesan.replace(/\n/g, "<br>");
          var htmlBody = 
            "<div style=\"font-family: Arial, sans-serif; font-size: 14px; color: #222222; line-height: 1.6; max-width: 650px; text-align: left;\">" +
              formattedPesan +
            "</div>";

          var emailOptions = { attachments: lampiran, htmlBody: htmlBody };
          if (emailCC && emailCC !== "-" && emailCC.indexOf("@") !== -1) {
            emailOptions.cc = emailCC;
          }

          GmailApp.sendEmail(emailHRD, subjek, pesan, emailOptions);
          sheet.getRange(rowIndex, 6).setValue("TERKIRIM");
          countTerkirim++;

        } catch (errEmail) {
          sheet.getRange(rowIndex, 6).setValue("GAGAL: " + errEmail.message);
        }
      }
    }

    return countTerkirim > 0 
      ? "Selesai! " + countTerkirim + " email berhasil terkirim." 
      : "Tidak ada email baru yang siap dikirim.";

  } finally {
    lock.releaseLock();
  }
}
