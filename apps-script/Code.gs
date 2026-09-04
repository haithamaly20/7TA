/*
  Code.gs — Google Apps Script Web App
  خطة موجهي الضبعة — طبقة مزامنة اختيارية مع Google Sheets
  ------------------------------------------------------------
  هذا الملف لا يُرفع إلى GitHub Pages؛ يُلصق فقط داخل محرر
  Google Apps Script المرتبط بملف Google Sheets الخاص بك.

  يدعم عمليات: قراءة (read) / إضافة (add) / تعديل (update) /
  حذف (delete) / بحث (search) / فرز (sort) — عبر نقطة نهاية
  Web App واحدة تستقبل GET و POST بصيغة JSON فقط.

  هيكل كل صف في الشيت (الأعمدة بالترتيب):
    id | type | data (JSON نصي) | updatedAt

  حيث type تكون: "supervisor" أو "institute" أو "plan" أو "settings"
  و data تحتوي الكائن الكامل كنص JSON — هذا يسمح بحفظ أي بنية
  بيانات (موجهين، معاهد، خلايا الخطة) دون تعديل أعمدة الشيت.
*/

const SHEET_NAME = ''; // يجب أن يطابق CONFIG.SHEET_NAME في js/config.js — إن تُرك فارغاً، تُستخدم أول ورقة في الملف
const HEADERS = ['id', 'type', 'data', 'updatedAt'];

// ---------------- نقطة الدخول: GET (قراءة/بحث/فرز) ----------------
function doGet(e) {
  try {
    const sheet = getSheet_();
    const action = (e.parameter.action || 'read').toLowerCase();
    const rows = readAllRows_(sheet);

    let result;
    switch (action) {
      case 'read':
        result = e.parameter.since ? filterRowsSince_(rows, e.parameter.since) : rows;
        break;
      case 'search':
        result = searchRows_(rows, e.parameter.q || '');
        break;
      case 'sort':
        result = sortRows_(rows, e.parameter.field || 'updatedAt', e.parameter.dir || 'desc');
        break;
      default:
        return jsonError_('عملية GET غير معروفة: ' + action);
    }
    return jsonSuccess_(result);
  } catch (err) {
    return jsonError_(err.message || String(err));
  }
}

// ---------------- نقطة الدخول: POST (إضافة/تعديل/حذف) ----------------
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = (body.action || '').toLowerCase();
    const sheet = getSheet_();

    let result;
    switch (action) {
      case 'add':
        result = addRow_(sheet, body.record);
        break;
      case 'update':
        result = updateRow_(sheet, body.id, body.record);
        break;
      case 'delete':
        result = deleteRow_(sheet, body.id);
        break;
      case 'bulk_sync':
        // مزامنة دفعة كاملة: يستبدل كل الصفوف من نفس النوع (type) بالمرسلة حديثاً
        result = bulkSync_(sheet, body.type, body.records || []);
        break;
      case 'save_json_backup':
        result = saveJsonBackup_(body.fileName || 'Dabaa_Plan_Backup.json', body.jsonContent || '{}');
        break;
      default:
        return jsonError_('عملية POST غير معروفة: ' + action);
    }
    return jsonSuccess_(result);
  } catch (err) {
    return jsonError_(err.message || String(err));
  }
}

// ==================== أدوات مساعدة ====================

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME || 'Data');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function readAllRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const [id, type, data, updatedAt] = values[i];
    if (!id) continue;
    let parsed;
    try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
    rows.push({ id: String(id), type: String(type), data: parsed, updatedAt: updatedAt, _row: i + 1 });
  }
  return rows;
}

function findRowIndexById_(sheet, id) {
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // +2: يبدأ من الصف 2 بعد الترويسة
  }
  return -1;
}

function addRow_(sheet, record) {
  if (!record || !record.id) throw new Error('السجل يحتاج id');
  const now = new Date().toISOString();
  sheet.appendRow([record.id, record.type || '', JSON.stringify(record.data || {}), now]);
  return { id: record.id, updatedAt: now };
}

function updateRow_(sheet, id, record) {
  const rowIdx = findRowIndexById_(sheet, id);
  const now = new Date().toISOString();
  if (rowIdx === -1) {
    // إن لم يوجد السجل، أضفه (upsert) بدلاً من فشل العملية
    return addRow_(sheet, Object.assign({ id: id }, record));
  }
  sheet.getRange(rowIdx, 2, 1, 3).setValues([[record.type || '', JSON.stringify(record.data || {}), now]]);
  return { id: id, updatedAt: now };
}

function deleteRow_(sheet, id) {
  const rowIdx = findRowIndexById_(sheet, id);
  if (rowIdx === -1) throw new Error('السجل غير موجود: ' + id);
  sheet.deleteRow(rowIdx);
  return { id: id, deleted: true };
}

function bulkSync_(sheet, type, records) {
  const values = sheet.getDataRange().getValues();
  // احذف كل الصفوف من نفس النوع (من الأسفل للأعلى لتفادي انزياح الفهارس)
  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][1]) === String(type)) {
      sheet.deleteRow(i + 1);
    }
  }
  const now = new Date().toISOString();
  records.forEach(r => {
    sheet.appendRow([r.id, type, JSON.stringify(r.data || r), now]);
  });
  return { type: type, count: records.length, updatedAt: now };
}

function filterRowsSince_(rows, sinceIso) {
  const sinceDate = new Date(sinceIso);
  if (isNaN(sinceDate.getTime())) return rows; // تاريخ غير صالح: تجاهل الفلترة بأمان
  return rows.filter(r => {
    const updated = new Date(r.updatedAt);
    return !isNaN(updated.getTime()) && updated > sinceDate;
  });
}

function searchRows_(rows, query) {
  const q = String(query).trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(r => JSON.stringify(r.data).toLowerCase().indexOf(q) !== -1);
}

function sortRows_(rows, field, dir) {
  const sorted = rows.slice().sort((a, b) => {
    const av = field === 'id' || field === 'type' || field === 'updatedAt' ? a[field] : (a.data ? a.data[field] : undefined);
    const bv = field === 'id' || field === 'type' || field === 'updatedAt' ? b[field] : (b.data ? b.data[field] : undefined);
    if (av === bv) return 0;
    return av > bv ? 1 : -1;
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

function jsonSuccess_(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}


function saveJsonBackup_(fileName, jsonContent) {
  const safeName = String(fileName || 'Dabaa_Plan_Backup.json').replace(/[\\/:*?"<>|]/g, '_');
  const blob = Utilities.newBlob(String(jsonContent || '{}'), MimeType.JSON, safeName);
  const file = DriveApp.createFile(blob);
  return { id: file.getId(), name: file.getName(), url: file.getUrl() };
}
