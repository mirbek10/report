// ============================================================
// Onchet → Google Sheets sync script
// Deploy → Manage deployments → Edit → New version → Deploy
// ============================================================

var SHEET_META = 'Мета';
var COLS = 7;

var RU_MONTHS_SHORT = ['янв','февр','март','апр','май','июнь','июль','авг','сент','окт','нояб','дек'];
var RU_MONTHS_FULL  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function doGet(e) {
  var type = e && e.parameter && e.parameter.type;
  if (type === 'ping') return jsonResponse({ ok: true, message: 'pong' });
  return jsonResponse({ ok: true, message: 'Onchet GAS is running' });
}

function doPost(e) {
  try {
    var raw = null;
    if (e.postData && e.postData.contents && e.postData.contents.trim()) {
      raw = e.postData.contents.trim();
    } else if (e.parameter && e.parameter.data) {
      raw = e.parameter.data;
    }

    Logger.log('doPost raw length=' + (raw ? raw.length : 0));

    if (!raw) return jsonResponse({ ok: false, error: 'Empty body' });

    var body;
    try { body = JSON.parse(raw); }
    catch (err) { return jsonResponse({ ok: false, error: 'JSON error: ' + err }); }

    Logger.log('type=' + body.type);

    if (body.type === 'sync_all') return syncAll(body.students);
    if (body.type === 'sync_day') return syncDay(body.date, body.records);
    if (body.type === 'ping')     return jsonResponse({ ok: true, message: 'pong' });

    return jsonResponse({ ok: false, error: 'Unknown type: ' + body.type });
  } catch (err) {
    Logger.log('Exception: ' + err);
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ── helpers ──────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseDMY(dmy) {
  var p = String(dmy).split('.');
  if (p.length !== 3) return new Date(0);
  return new Date(2000 + parseInt(p[2],10), parseInt(p[1],10)-1, parseInt(p[0],10));
}

function monthKey(dmy) {
  var p = String(dmy).split('.');
  return p.length === 3 ? p[1] + '.' + p[2] : 'unknown';
}

function monthLabel(key) {
  var p = key.split('.');
  if (p.length !== 2) return key;
  return RU_MONTHS_FULL[parseInt(p[0],10)-1] + ' ' + (2000+parseInt(p[1],10));
}

function dayLabel(dmy) {
  var p = String(dmy).split('.');
  if (p.length !== 3) return dmy;
  return parseInt(p[0],10) + ' ' + RU_MONTHS_SHORT[parseInt(p[1],10)-1];
}

function getOrCreate(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function resetSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (sh) { sh.clearContents(); sh.clearFormats(); return sh; }
  return ss.insertSheet(name);
}

function writeHeader(sheet) {
  sheet.getRange(1,1,1,COLS)
    .setValues([['Дата','Имя','Группа','Приход','Уход','Тип','Тема']])
    .setFontWeight('bold').setBackground('#1e293b').setFontColor('#e2e8f0');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1,80); sheet.setColumnWidth(2,180); sheet.setColumnWidth(3,120);
  sheet.setColumnWidth(4,65); sheet.setColumnWidth(5,65);
  sheet.setColumnWidth(6,80); sheet.setColumnWidth(7,160);
}

function writeSeparator(sheet, row, label) {
  sheet.getRange(row,1,1,COLS).merge()
    .setValue(label)
    .setFontWeight('bold').setBackground('#334155').setFontColor('#94a3b8')
    .setHorizontalAlignment('left');
}

function writeRow(sheet, row, rec) {
  sheet.getRange(row,1,1,COLS)
    .setValues([[
      rec.date, rec.name||'', rec.groupName||'',
      rec.time_start||'', rec.time_finish||'',
      rec.lesson_type==='online'?'Онлайн':'Оффлайн',
      rec.currentTopic||''
    ]])
    .setBackground(row%2===0?'#0f172a':'#1e293b')
    .setFontColor('#e2e8f0');
}

// ── Записывает массив entries на лист по месяцам ──────────────
function writeEntries(entries, studentCount) {
  if (!entries || !entries.length) {
    return jsonResponse({ ok: false, error: 'No entries' });
  }

  // Группируем по месяцам
  var byMonth = {}, monthOrder = [];
  entries.forEach(function(e) {
    var k = monthKey(e.date);
    if (!byMonth[k]) { byMonth[k] = []; monthOrder.push(k); }
    byMonth[k].push(e);
  });

  // Сортируем месяцы
  monthOrder.sort(function(a,b) {
    var pa=a.split('.'), pb=b.split('.');
    var ya=2000+parseInt(pa[1],10), yb=2000+parseInt(pb[1],10);
    var ma=parseInt(pa[0],10),      mb=parseInt(pb[0],10);
    return ya!==yb ? ya-yb : ma-mb;
  });

  Logger.log('Months: ' + monthOrder.join(', '));

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Удаляем старые листы журнала
  ss.getSheets().forEach(function(sh) {
    var name = sh.getName();
    for (var i=0; i<RU_MONTHS_FULL.length; i++) {
      if (name.indexOf(RU_MONTHS_FULL[i])===0 && ss.getSheets().length>1) {
        ss.deleteSheet(sh); break;
      }
    }
  });

  var total = 0;

  monthOrder.forEach(function(key) {
    var label = monthLabel(key);
    var sheet = resetSheet(label);
    writeHeader(sheet);

    // Группируем по датам внутри месяца
    var byDate = {}, dateOrder = [];
    byMonth[key].forEach(function(e) {
      if (!byDate[e.date]) { byDate[e.date]=[]; dateOrder.push(e.date); }
      byDate[e.date].push(e);
    });
    dateOrder.sort(function(a,b) { return parseDMY(a)-parseDMY(b); });

    var row = 2;
    dateOrder.forEach(function(date) {
      writeSeparator(sheet, row, dayLabel(date));
      row++;
      byDate[date]
        .sort(function(a,b){ return (a.time_start||'').localeCompare(b.time_start||''); })
        .forEach(function(rec) { writeRow(sheet, row, rec); row++; total++; });
    });

    Logger.log('Sheet "'+label+'": '+(row-2)+' rows');
  });

  // Мета
  var meta = getOrCreate(SHEET_META);
  meta.clearContents();
  meta.getRange(1,1,4,2).setValues([
    ['Последняя синхронизация', new Date().toLocaleString('ru-RU')],
    ['Студентов',               studentCount||0],
    ['Записей',                 total],
    ['Месяцев',                 monthOrder.length],
  ]);

  return jsonResponse({ ok:true, message:'Synced '+total+' entries in '+monthOrder.length+' months' });
}

// ── sync_all ─────────────────────────────────────────────────
function syncAll(students) {
  Logger.log('syncAll: '+(students?students.length:0)+' students');
  if (!students || !students.length) return jsonResponse({ ok:false, error:'No students' });

  var entries = [];
  students.forEach(function(s) {
    if (!Array.isArray(s.come)) return;
    s.come.forEach(function(e) {
      if (!e.date) return;
      entries.push({
        date: e.date, name: s.name||'', groupName: s.groupName||'',
        time_start: e.time_start||'', time_finish: e.time_finish||'',
        lesson_type: e.lesson_type||'offline', currentTopic: s.currentTopic||''
      });
    });
  });

  Logger.log('Total entries: '+entries.length);
  return writeEntries(entries, students.length);
}

// ── sync_day ─────────────────────────────────────────────────
function syncDay(date, records) {
  Logger.log('syncDay: '+date+' records='+(records?records.length:0));
  if (!date || !records) return jsonResponse({ ok:false, error:'Missing params' });

  var key   = monthKey(date);
  var label = monthLabel(key);
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(label) || ss.insertSheet(label);

  if (sheet.getLastRow() === 0) writeHeader(sheet);

  // Удаляем строки этого дня
  var last = sheet.getLastRow();
  if (last > 1) {
    var col = sheet.getRange(2,1,last-1,1).getValues();
    for (var i=col.length-1; i>=0; i--) {
      var v = String(col[i][0]).trim();
      if (v===date || v===dayLabel(date)) sheet.deleteRow(i+2);
    }
  }

  // Вставляем в конец
  var insertAt = sheet.getLastRow()+1;
  writeSeparator(sheet, insertAt, dayLabel(date));
  records
    .sort(function(a,b){ return (a.time_start||'').localeCompare(b.time_start||''); })
    .forEach(function(r,i) {
      writeRow(sheet, insertAt+1+i, {
        date:date, name:r.name||'', groupName:r.groupName||'',
        time_start:r.time_start||'', time_finish:r.time_finish||'',
        lesson_type:r.lesson_type||'offline', currentTopic:r.currentTopic||''
      });
    });

  // Обновить мета
  var meta = getOrCreate(SHEET_META);
  if (meta.getLastRow()>0) meta.getRange(1,2).setValue(new Date().toLocaleString('ru-RU'));

  return jsonResponse({ ok:true, message:'Day '+date+': '+records.length+' records on "'+label+'"' });
}
