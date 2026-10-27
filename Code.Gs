
/**
 * AUTO E-MAIL & GFORM LOKER
 * Backend System - Fase 2A
 * Strict Validation
 *
 * Developer: Alfin Fadhli, S.H.
 * Target Tab: RAW-LOKER EMAIL
 *
 * SECURITY:
 * - No API keys hardcoded.
 * - No Drive IDs hardcoded.
 * - Candidate profile loaded from Script Properties.
 * - Configure private values outside this source file.
 */

function getConfig_() {
  var props = PropertiesService.getScriptProperties();

  var keysFromProps = props.getProperty("GEMINI_KEYS") || "";

  var geminiKeys = keysFromProps
    .split(",")
    .map(function (key) {
      return key.trim();
    })
    .filter(Boolean);

  return {
    geminiKeys: geminiKeys,
    geminiModel: props.getProperty("GEMINI_MODEL") || "gemini-3.8-flash",
    folderTambahanId: props.getProperty("FOLDER_TAMBAHAN_ID") || "",
    idCv: props.getProperty("ID_CV") || "",
    idIjazah: props.getProperty("ID_IJAZAH") || "",
    idTranskrip: props.getProperty("ID_TRANSKRIP") || "",
    idPkpa: props.getProperty("ID_PKPA") || "",
    profilPelamar: props.getProperty("PROFIL_PELAMAR") || ""
  };
}

function requireConfig_(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(
      "Konfigurasi belum tersedia di Script Properties: " + name
    );
  }

  return String(value).trim();
}

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Input Loker Otomatis")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function getAppLinks() {
  var config = getConfig_();

  var sheetUrl = SpreadsheetApp
    .getActiveSpreadsheet()
    .getUrl();

  var folderId = requireConfig_(
    "FOLDER_TAMBAHAN_ID",
    config.folderTambahanId
  );

  return {
    sheetUrl: sheetUrl,
    driveFolderUrl: "https://drive.google.com/drive/folders/" + folderId
  };
}

function jalankanKirimEmailManual() {
  return kirimEmailOtomatis();
}

var SYSTEM_INSTRUCTION =
  "Kamu adalah asisten penyusun lamaran kerja profesional.\n" +
  "ATURAN INTEGRITAS DAN VALIDASI DATA LOWONGAN:\n" +
  "1. Gunakan hanya fakta dari profil pelamar. Dilarang mengarang pengalaman, sertifikasi, atau gelar.\n" +
  "2. Jika input bukan lowongan kerja atau informasi perusahaan, posisi, dan kontak tidak jelas, isi perusahaan, posisi, dan email dengan '-'.\n" +
  "3. Email HRD utama harus disalin persis dari informasi lowongan. Jika tidak ada atau pendaftaran memakai Google Form, isi '-'.\n" +
  "4. Email CC hanya diisi jika lowongan meminta alamat email tambahan. Jika tidak ada, isi '-'.\n" +
  "5. is_gform bernilai true jika pendaftaran menggunakan Google Form atau formulir web.\n" +
  "6. Ekstrak URL pendaftaran ke link_gform. Jika tidak tersedia, isi '-'.\n" +
  "7. Berkas standar pelamar adalah CV, ijazah, transkrip nilai, dan sertifikat PKPA jika tercantum dalam profil.\n" +
  "8. requires_unsupported_doc bernilai true jika lowongan meminta dokumen di luar berkas standar.\n" +
  "9. missing_docs_detail harus menyebutkan nama dokumen tambahan yang diminta. Jika tidak ada, isi '-'.\n" +
  "10. Susun jawaban terstruktur untuk pertanyaan umum formulir pada gform_helper_answers.\n" +
  "11. Pesan lamaran harus berupa teks polos, 150-250 kata, dibagi menjadi 3-4 paragraf.\n" +
  "12. Tuliskan ringkasan status kritis di catatan_ai.";

function getProfilPelamar_() {
  var config = getConfig_();

  return requireConfig_(
    "PROFIL_PELAMAR",
    config.profilPelamar
  );
}

function panggilGeminiApiRotasi_(payload) {
  var config = getConfig_();
  var keys = config.geminiKeys;

  if (!keys || keys.length === 0) {
    throw new Error(
      "GEMINI_KEYS belum dikonfigurasi di Script Properties."
    );
  }

  var modelsToTry = [
    config.geminiModel,
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash"
  ].filter(function (model, index, list) {
    return model && list.indexOf(model) === index;
  });

  var lastErrorMsg = "";

  for (var m = 0; m < modelsToTry.length; m++) {
    var currentModel = modelsToTry[m];

    var url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(currentModel) +
      ":generateContent";

    for (var k = 0; k < keys.length; k++) {
      var apiKey = keys[k];

      var options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "x-goog-api-key": apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      for (var attempt = 1; attempt <= 2; attempt++) {
        var res = UrlFetchApp.fetch(url, options);
        var code = res.getResponseCode();
        var body = {};

        try {
          body = JSON.parse(res.getContentText());
        } catch (e) {
          body = {};
        }

        if (
          code === 200 &&
          body.candidates &&
          body.candidates[0] &&
          body.candidates[0].content
        ) {
          return body;
        }

        var errorMsg =
          body.error && body.error.message
            ? body.error.message
            : "HTTP Status " + code;

        // Hindari mencatat nilai API key ke log.
        lastErrorMsg =
          "[" + currentModel + "] Key #" + (k + 1) +
          " -> HTTP " + code + ": " + errorMsg;

        if (code === 429 || code === 403) {
          break;
        }

        if (
          (code === 500 ||
            code === 503 ||
            errorMsg.indexOf("high demand") !== -1) &&
          attempt < 2
        ) {
          Utilities.sleep(2500);
          continue;
        }

        if (code === 400) {
          throw new Error(
            "Permintaan tidak valid (HTTP 400): " + errorMsg
          );
        }
      }
    }
  }

  throw new Error(
    "Semua key dan model cadangan gagal diproses. " +
    "Error terakhir: " + lastErrorMsg
  );
}

function analisisDanSimpan(base64Image, mimeType, textInput, extraDoc) {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    throw new Error(
      "Proses sedang berjalan, mohon tunggu sebentar."
    );
  }

  try {
    if (
      !base64Image &&
      (!textInput || textInput.trim() === "")
    ) {
      throw new Error(
        "Input tidak boleh kosong. Masukkan gambar atau teks lowongan."
      );
    }

    var parts = [
      {
        text: "PROFIL PELAMAR:\n" + getProfilPelamar_()
      }
    ];

    if (textInput && textInput.trim() !== "") {
      var cleanText = textInput.substring(0, 10000);

      parts.push({
        text: "DESKRIPSI / LINK LOKER:\n" + cleanText
      });
    }

    if (base64Image) {
      if (base64Image.length > 10 * 1024 * 1024) {
        throw new Error(
          "Ukuran gambar terlalu besar."
        );
      }

      parts.push({
        inline_data: {
          mime_type: mimeType || "image/png",
          data: base64Image
        }
      });
    }

    parts.push({
      text:
        "Analisis lowongan kerja di atas dan buat output JSON sesuai schema."
    });

    var payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            perusahaan: { type: "STRING" },
            email: { type: "STRING" },
            email_cc: { type: "STRING" },
            posisi: { type: "STRING" },
            kategori: {
              type: "STRING",
              enum: ["Legal", "Admin", "Writing", "Umum"]
            },
            subjek: { type: "STRING" },
            pesan: { type: "STRING" },
            link_gform: { type: "STRING" },
            is_gform: { type: "BOOLEAN" },
            requires_unsupported_doc: { type: "BOOLEAN" },
            missing_docs_detail: { type: "STRING" },
            gform_helper_answers: { type: "STRING" },
            catatan_ai: { type: "STRING" }
          },
          required: [
            "perusahaan",
            "email",
            "email_cc",
            "posisi",
            "kategori",
            "subjek",
            "pesan",
            "link_gform",
            "is_gform",
            "requires_unsupported_doc",
            "missing_docs_detail",
            "gform_helper_answers",
            "catatan_ai"
          ]
        }
      }
    };

    var responseJson = panggilGeminiApiRotasi_(payload);
    var resultText =
      responseJson.candidates[0].content.parts[0].text;

    var data = JSON.parse(resultText);

    // Validasi data lowongan.
    var perusahaan = (data.perusahaan || "").trim();
    var posisi = (data.posisi || "").trim();
    var email = (data.email || "").trim();
    var linkGform = (data.link_gform || "").trim();

    var isGform =
      data.is_gform === true ||
      (
        linkGform !== "-" &&
        linkGform.indexOf("http") !== -1
      );

    if (
      !perusahaan ||
      perusahaan === "-" ||
      perusahaan.toLowerCase().indexOf("tidak diketa") !== -1 ||
      perusahaan.toLowerCase().indexOf("tidak ada") !== -1
    ) {
      throw new Error(
        "Loker ditolak: nama perusahaan tidak ditemukan atau tidak jelas."
      );
    }

    if (
      !posisi ||
      posisi === "-" ||
      posisi.toLowerCase().indexOf("tidak diketa") !== -1 ||
      posisi.toLowerCase().indexOf("tidak ada") !== -1
    ) {
      throw new Error(
        "Loker ditolak: posisi tidak ditemukan atau tidak jelas."
      );
    }

    var hasValidEmail =
      email &&
      email !== "-" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    var hasValidGform =
      isGform &&
      linkGform !== "-" &&
      /^https?:\/\/\S+$/i.test(linkGform);

    if (!hasValidEmail && !hasValidGform) {
      throw new Error(
        "Loker ditolak: email pendaftaran atau link formulir tidak valid."
      );
    }

    var pesanRapi = (data.pesan || "-")
      .replace(/\r\n/g, "\n")
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    var config = getConfig_();
    var extraDocFileId = "-";

    if (extraDoc && extraDoc.base64) {
      try {
        var allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg",
          "image/png"
        ];

        if (allowedTypes.indexOf(extraDoc.mimeType) === -1) {
          throw new Error(
            "Format dokumen harus PDF, Word, JPG, atau PNG."
          );
        }

        var folderId = requireConfig_(
          "FOLDER_TAMBAHAN_ID",
          config.folderTambahanId
        );

        var decodedBlob = Utilities.newBlob(
          Utilities.base64Decode(extraDoc.base64),
          extraDoc.mimeType,
          extraDoc.name
        );

        var folder = DriveApp.getFolderById(folderId);
        var createdFile = folder.createFile(decodedBlob);

        extraDocFileId = createdFile.getId();
      } catch (errUpload) {
        Logger.log(
          "Gagal upload dokumen tambahan: " +
          errUpload.message
        );

        extraDocFileId = "UPLOAD_GAGAL";
      }
    }

    // Hanya menggunakan tab RAW-LOKER EMAIL.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RAW-LOKER EMAIL");

    if (!sheet) {
      throw new Error(
        "Sheet 'RAW-LOKER EMAIL' tidak ditemukan."
      );
    }

    var initialStatus = "";
    var gformModeStatus = "-";

    if (hasValidGform) {
      if (data.requires_unsupported_doc) {
        initialStatus =
          "BUTUH_DOKUMEN: " +
          (data.missing_docs_detail || "Dokumen Pendukung Khusus");

        gformModeStatus = "MODE_HELPER_MISSING_DOC";
      } else {
        initialStatus = "PERLU_ISI_GFORM";
        gformModeStatus = "AUTO_SUBMIT_READY";
      }
    }

    sheet.appendRow([
      perusahaan,
      data.email || "-",
      posisi,
      data.subjek || "-",
      pesanRapi,
      initialStatus,
      "Lampirkan",
      "Lampirkan",
      "Lampirkan",
      "Lampirkan",
      extraDocFileId,
      data.kategori || "-",
      data.email_cc || "-",
      data.link_gform || "-",
      gformModeStatus + " | " + (data.catatan_ai || "-")
    ]);

    return JSON.stringify({
      status: "SUCCESS",
      message:
        "Data berhasil dianalisis dan disimpan ke sheet RAW-LOKER EMAIL.",
      is_gform: hasValidGform,
      requires_unsupported_doc: data.requires_unsupported_doc,
      missing_docs_detail: data.missing_docs_detail,
      link_gform: data.link_gform,
      gform_helper_answers: data.gform_helper_answers,
      pesan_lamaran: pesanRapi
    });

  } finally {
    lock.releaseLock();
  }
}

function kirimEmailOtomatis() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    return "Sistem sedang sibuk, silakan coba beberapa saat lagi.";
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("RAW-LOKER EMAIL");

    if (!sheet) {
      return "Sheet 'RAW-LOKER EMAIL' tidak ditemukan.";
    }

    var startRow = 2;
    var lastRow = sheet.getLastRow();

    if (lastRow < startRow) {
      return "Tidak ada data loker untuk diproses.";
    }

    var numRows = lastRow - startRow + 1;
    var data = sheet.getRange(startRow, 1, numRows, 15).getValues();
    var config = getConfig_();

    var terkirimCount = 0;
    var skippedCount = 0;
    var gagalCount = 0;

    function isAttachmentRequested(val) {
      return (
        val &&
        val.toString().trim().toLowerCase() === "lampirkan"
      );
    }

    function getFileBlobSafely(fileId) {
      if (!fileId || fileId === "-" || fileId.length < 10) {
        return null;
      }

      try {
        return DriveApp
          .getFileById(fileId.toString().trim())
          .getBlob();
      } catch (e) {
        Logger.log("Gagal mengambil lampiran: " + e.message);
        return null;
      }
    }

    function addAttachmentIfRequested(requested, propertyName, fileId, attachments) {
      if (!isAttachmentRequested(requested)) {
        return;
      }

      var validId = requireConfig_(propertyName, fileId);
      var blob = getFileBlobSafely(validId);

      if (blob) {
        attachments.push(blob);
      } else {
        throw new Error(
          "Lampiran tidak dapat diakses: " + propertyName
        );
      }
    }

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowIndex = startRow + i;

      var emailHRD = row[1]
        ? row[1].toString().trim()
        : "";

      var subjek = row[3]
        ? row[3].toString().trim()
        : "";

      var pesan = row[4]
        ? row[4].toString().trim()
        : "";

      var status = row[5]
        ? row[5].toString().trim().toUpperCase()
        : "";

      var emailCC = row[12]
        ? row[12].toString().trim()
        : "";

      if (
        status === "TERKIRIM" ||
        status.indexOf("GFORM") !== -1 ||
        status.indexOf("BUTUH_DOKUMEN") !== -1
      ) {
        skippedCount++;
        continue;
      }

      if (
        !emailHRD ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailHRD)
      ) {
        sheet
          .getRange(rowIndex, 6)
          .setValue("GAGAL: Email HRD tidak valid atau kosong");

        gagalCount++;
        continue;
      }

      sheet
        .getRange(rowIndex, 6)
        .setValue("SEDANG_DIPROSES");

      SpreadsheetApp.flush();

      try {
        var lampiran = [];

        addAttachmentIfRequested(
          row[9], "ID_CV", config.idCv, lampiran
        );

        addAttachmentIfRequested(
          row[6], "ID_IJAZAH", config.idIjazah, lampiran
        );

        addAttachmentIfRequested(
          row[7], "ID_TRANSKRIP", config.idTranskrip, lampiran
        );

        addAttachmentIfRequested(
          row[8], "ID_PKPA", config.idPkpa, lampiran
        );

        var optExtraDoc = row[10];

        if (
          optExtraDoc &&
          optExtraDoc !== "-" &&
          optExtraDoc.indexOf("UPLOAD_GAGAL") === -1
        ) {
          var bEx = getFileBlobSafely(optExtraDoc);

          if (bEx) {
            lampiran.push(bEx);
          }
        }

        var emailOptions = {
          attachments: lampiran
        };

        if (
          emailCC &&
          emailCC !== "-" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCC)
        ) {
          emailOptions.cc = emailCC;
        }

        GmailApp.sendEmail(
          emailHRD,
          subjek,
          pesan,
          emailOptions
        );

        sheet
          .getRange(rowIndex, 6)
          .setValue("TERKIRIM");

        terkirimCount++;

      } catch (errEmail) {
        sheet
          .getRange(rowIndex, 6)
          .setValue("GAGAL: " + errEmail.message);

        gagalCount++;
      }
    }

    return (
      "Pengiriman selesai: " +
      terkirimCount + " terkirim, " +
      skippedCount + " dilewati, " +
      gagalCount + " gagal."
    );

  } finally {
    lock.releaseLock();
  }
}
