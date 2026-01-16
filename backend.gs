
/**
 * Smart Scholar Library - Backend Script (Database Only)
 * FOKUS: Hanya menangani Spreadsheet & Drive. Tidak ada request eksternal (No UrlFetchApp).
 */

const FOLDER_ID = "PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";
const SPREADSHEET_NAME = "Smart Scholar Library DB";

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
  "Tips For You": "tipsForYou",
  "Extracted Text": "extractedText"
};

function authorize() {
  DriveApp.getRootFolder();
  SpreadsheetApp.getActiveSpreadsheet();
  // TIDAK MEMANGGIL UrlFetchApp di sini agar tidak repot izin
  console.log("Otorisasi Database Berhasil!");
}

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
      headers.forEach((header, i) => {
        let key = HEADER_MAP[header] || header;
        let val = row[i];
        if (key === 'isFavourite' || key === 'isBookmarked') val = (val === true || val === 'TRUE' || val === 'true');
        obj[key] = val;
      });
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

    // ACTION: GET FILE DATA (Drive Only)
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

    // ACTION: CREATE
    if (action === 'create') {
      const data = payload.data;
      let fileUrl = data.sourceValue;
      if (data.sourceMethod === 'upload' && data.fileData) {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData.split(',')[1]), data.fileMimeType, data.fileName || "File");
        fileUrl = folder.createFile(blob).getUrl();
      }
      ensureHeadersExist(sheet, Object.keys(data));
      const headers = sheet.getDataRange().getValues()[0];
      const rowToAppend = headers.map(h => {
        const k = HEADER_MAP[h] || h;
        if (k === 'sourceValue' && data.sourceMethod === 'upload') return fileUrl;
        return data[k] !== undefined ? data[k] : "";
      });
      sheet.appendRow(rowToAppend);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", url: fileUrl })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    // ACTION: DELETE
    if (action === 'delete') {
      const ids = payload.ids;
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (ids.indexOf(data[i][0].toString()) !== -1) sheet.deleteRow(i + 1);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION: UPDATE
    if (action === 'update_field' || action === 'update_entry') {
      const id = payload.id;
      const updates = action === 'update_field' ? { [payload.field]: payload.value } : payload.updates;
      ensureHeadersExist(sheet, Object.keys(updates));
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) { if (data[i][0].toString() === id.toString()) { rowIndex = i + 1; break; } }
      if (rowIndex > 0) {
        for (const [key, value] of Object.entries(updates)) {
          const headerName = Object.keys(HEADER_MAP).find(k => HEADER_MAP[k] === key) || key;
          const colIndex = headers.indexOf(headerName) + 1;
          if (colIndex > 0) {
            let val = value;
            if (typeof value === 'object' && value !== null) val = JSON.stringify(val);
            sheet.getRange(rowIndex, colIndex).setValue(val);
          }
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
