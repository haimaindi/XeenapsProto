
/**
 * Smart Scholar Library - Backend Script (Database Only)
 * FOKUS: Menangani pemecahan teks panjang (Chunking) untuk limit 50k karakter.
 */

const FOLDER_ID = "PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";
const SPREADSHEET_NAME = "Smart Scholar Library DB";
const CHUNK_SIZE = 45000; // Aman di bawah limit 50.000

const HEADER_MAP = {
  "ID": "id",
  "Created At": "createdDateTime",
  "Type": "type",
  "Category": "category",
  "Topic": "topic",
  "Sub Topic": "subTopic",
  "Author Name": "authorName",
  "Title": "title",
  "Publisher": "publisher",
  "Year": "year",
  "Keyword": "keyword",
  "Tags": "tagLabel",
  "Source Method": "sourceMethod",
  "Source Value/URL": "sourceValue",
  "isFavourite": "isFavourite",
  "isBookmarked": "isBookmarked",
  "In Text Citation": "inTextCitation",
  "In Reference Citation": "inReferenceCitation",
  "Research Methodology": "researchMethodology",
  "Abstract": "abstract",
  "Summary": "summary",
  "Strength": "strength",
  "Weakness": "weakness",
  "Unfamiliar Terminology": "unfamiliarTerminology",
  "Supporting References": "supportingReferences", 
  "Tips For You": "tipsForYou"
  // "Extracted Text" akan ditangani secara dinamis (Chunking)
};

function doGet(e) {
  try {
    const ss = getOrCreateSpreadsheet();
    const sheet = getOrCreateSheet(ss);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);

    const headers = data[0];
    const rows = data.slice(1);
    
    const collections = rows.map(row => {
      let obj = {};
      let fullExtractedText = "";
      let textChunks = {};

      headers.forEach((header, i) => {
        let val = row[i];
        
        // Cek jika ini adalah kolom chunk teks ekstraksi
        if (header.indexOf("Extracted Text") === 0) {
          textChunks[header] = val;
        } else {
          let key = HEADER_MAP[header] || header;
          if (key === 'isFavourite' || key === 'isBookmarked') val = (val === true || val === 'TRUE' || val === 'true');
          obj[key] = val;
        }
      });

      // Gabungkan semua chunk teks berdasarkan urutan numerik (Extracted Text 1, 2, dst)
      const sortedChunkHeaders = Object.keys(textChunks).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      obj['extractedText'] = sortedChunkHeaders.map(h => textChunks[h]).join("");
      
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(collections)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'create';
    const ss = getOrCreateSpreadsheet();
    const sheet = getOrCreateSheet(ss);

    if (action === 'get_file_data') {
      const fileId = extractIdFromUrl(payload.url);
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob(); 
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        fileName: file.getName(),
        mimeType: blob.getContentType(),
        data: `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}` 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'create' || action === 'update_entry') {
      const data = payload.data || payload.updates;
      const id = payload.id;
      
      let fileUrl = data.sourceValue;
      if (action === 'create' && data.sourceMethod === 'upload' && data.fileData) {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData.split(',')[1]), data.fileMimeType, data.fileName || "File");
        fileUrl = folder.createFile(blob).getUrl();
      }

      // Handle Chunking untuk extractedText
      let chunks = [];
      if (data.extractedText) {
        const fullText = data.extractedText;
        for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
          chunks.push(fullText.substring(i, i + CHUNK_SIZE));
        }
      }

      // Pastikan kolom chunk tersedia di sheet
      const chunkHeaderNames = chunks.map((_, i) => `Extracted Text ${i + 1}`);
      ensureHeadersExist(sheet, [...Object.keys(data), ...chunkHeaderNames]);

      const headers = sheet.getDataRange().getValues()[0];
      
      if (action === 'create') {
        const rowToAppend = headers.map(h => {
          if (h.indexOf("Extracted Text") === 0) {
            const index = parseInt(h.replace(/\D/g, '')) - 1;
            return chunks[index] || "";
          }
          const k = HEADER_MAP[h] || h;
          if (k === 'sourceValue' && data.sourceMethod === 'upload') return fileUrl;
          return data[k] !== undefined ? data[k] : "";
        });
        sheet.appendRow(rowToAppend);
      } else {
        // Update logic
        const allData = sheet.getDataRange().getValues();
        let rowIndex = -1;
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][0].toString() === id.toString()) { rowIndex = i + 1; break; }
        }
        
        if (rowIndex > 0) {
          headers.forEach((h, colIdx) => {
            const colIndex = colIdx + 1;
            if (h.indexOf("Extracted Text") === 0) {
              const chunkIdx = parseInt(h.replace(/\D/g, '')) - 1;
              if (data.extractedText !== undefined) {
                sheet.getRange(rowIndex, colIndex).setValue(chunks[chunkIdx] || "");
              }
            } else {
              const k = HEADER_MAP[h] || h;
              if (data[k] !== undefined) {
                let val = data[k];
                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                sheet.getRange(rowIndex, colIndex).setValue(val);
              }
            }
          });
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    if (action === 'delete') {
      const ids = payload.ids;
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (ids.indexOf(data[i][0].toString()) !== -1) sheet.deleteRow(i + 1);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update_field') {
      const id = payload.id;
      const ssData = sheet.getDataRange().getValues();
      const headers = ssData[0];
      let rowIndex = -1;
      for (let i = 1; i < ssData.length; i++) { if (ssData[i][0].toString() === id.toString()) { rowIndex = i + 1; break; } }
      
      if (rowIndex > 0) {
        const headerName = Object.keys(HEADER_MAP).find(k => HEADER_MAP[k] === payload.field) || payload.field;
        const colIndex = headers.indexOf(headerName) + 1;
        if (colIndex > 0) {
          sheet.getRange(rowIndex, colIndex).setValue(payload.value);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function extractIdFromUrl(url) {
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) return dMatch[1];
  const qMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (qMatch) return qMatch[1];
  return url;
}

function getOrCreateSpreadsheet() {
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  return SpreadsheetApp.create(SPREADSHEET_NAME);
}

function getOrCreateSheet(ss) {
  let s = ss.getSheetByName("Collections");
  if (!s) {
    s = ss.insertSheet("Collections");
    const h = Object.keys(HEADER_MAP);
    h.push("Extracted Text 1"); // Minimal satu kolom chunk
    s.appendRow(h);
    s.getRange(1, 1, 1, h.length).setFontWeight("bold").setBackground("#E8FBFF");
  }
  return s;
}

function ensureHeadersExist(sheet, keys) {
  const current = sheet.getDataRange().getValues()[0] || [];
  keys.forEach(k => {
    const h = Object.keys(HEADER_MAP).find(key => HEADER_MAP[key] === k) || k;
    if (current.indexOf(h) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight("bold").setBackground("#E8FBFF");
      current.push(h);
    }
  });
}
