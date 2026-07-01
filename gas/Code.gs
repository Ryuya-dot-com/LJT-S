const CONFIG = {
  sessionsSheet: 'sessions',
  trialsSheet: 'trials',
  codesSheet: 'codes',
  errorsSheet: 'errors',
  publicCode: 'public',
  allowParticipantEmailCopy: false,
  fromName: 'LJT-S Online'
};

function doPost(e) {
  const receivedAt = new Date();
  const lock = LockService.getScriptLock();
  let locked = false;
  let response = null;
  let researcherMail = null;
  let participantMail = null;
  try {
    lock.waitLock(30000);
    locked = true;
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw) throw new Error('Empty request body');
    const envelope = JSON.parse(raw);
    const session = envelope.session || envelope;
    const researcherCode = normalizeCode(envelope.researcher_code || session.researcher_code || CONFIG.publicCode);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureWorkbook(ss);
    const codeRow = resolveResearcherCode(ss, researcherCode);
    const sessionId = session.session_id || '';
    const hasSession = sessionExists(ss, sessionId);
    const hasTrials = trialSessionExists(ss, sessionId);

    if (hasSession && hasTrials) {
      response = {
        ok: true,
        duplicate: true,
        session_id: sessionId,
        researcher_code: researcherCode
      };
    } else {
      if (!hasTrials) appendTrials(ss, session, researcherCode, codeRow, receivedAt);
      if (!hasSession) appendSession(ss, envelope, session, researcherCode, codeRow, receivedAt);
      if (!codeRow.valid) logCodeIssue(ss, researcherCode, codeRow.status, receivedAt);
      if (!hasSession) {
        researcherMail = { session: session, researcherCode: researcherCode, codeRow: codeRow };
        participantMail = { session: session };
      }
      response = {
        ok: true,
        repaired: hasSession && !hasTrials,
        session_id: sessionId,
        researcher_code: researcherCode,
        researcher_code_status: codeRow.status
      };
    }
  } catch (err) {
    logError(err, receivedAt, e);
    response = {
      ok: false,
      error: String(err && err.message ? err.message : err)
    };
  } finally {
    if (locked) lock.releaseLock();
  }
  if (response && response.ok) {
    sendMailOutsideLock(researcherMail, participantMail);
  }
  return jsonResponse(response);
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'LJT-S submission endpoint'
  });
}

function ensureWorkbook(ss) {
  ensureSheet(ss, CONFIG.sessionsSheet);
  ensureSheet(ss, CONFIG.trialsSheet);
  const codes = ensureSheet(ss, CONFIG.codesSheet);
  ensureSheet(ss, CONFIG.errorsSheet);
  if (codes.getLastRow() === 0) {
    codes.appendRow(['code', 'email', 'active', 'notify_mode', 'notes']);
    codes.appendRow([CONFIG.publicCode, '', true, 'none', 'Public page default code']);
  }
}

function ensureSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function appendSession(ss, envelope, session, researcherCode, codeRow, receivedAt) {
  const summary = session.summary || {};
  const participant = session.participant || {};
  const settings = session.settings || {};
  const environment = session.environment || {};
  const row = {
    received_at_iso: receivedAt.toISOString(),
    schema_version: envelope.schema_version || '',
    researcher_code: researcherCode,
    researcher_code_status: codeRow.status || '',
    session_id: session.session_id || '',
    app_version: session.app_version || '',
    code_version: session.code_version || '',
    mode: settings.mode || session.mode || '',
    participant_id: participant.id || '',
    participant_id_raw: participant.id_raw || '',
    participant_name: participant.name || '',
    school_code: participant.school_code || '',
    class_code: participant.class_code || '',
    result_email_present: participant.result_email ? 1 : 0,
    request_result_email: participant.request_result_email ? 1 : 0,
    started_at_iso: session.started_at_iso || '',
    completed_at_iso: session.completed_at_iso || '',
    n_practice: summary.n_practice || '',
    n_main: summary.n_main || '',
    n_main_scored: summary.n_main_scored || '',
    n_main_excluded: summary.n_main_excluded || 0,
    raw_score: summary.raw_score || 0,
    main_accuracy: summary.n_main_scored ? round(summary.raw_score / summary.n_main_scored, 4) : '',
    timeouts: summary.timeouts || 0,
    toeic_listening_predicted: summary.toeic_listening_predicted || '',
    toeic_status: summary.toeic_status || '',
    cefr_reference: summary.cefr_reference || '',
    user_agent: environment.user_agent || '',
    viewport_width: environment.viewport_width || '',
    viewport_height: environment.viewport_height || '',
    pointer_coarse: environment.pointer_coarse || '',
    in_iframe: environment.in_iframe || '',
    source_url: session.source_url || envelope.app_url || '',
    session_json: JSON.stringify(redactSession(session))
  };
  appendObject(ss.getSheetByName(CONFIG.sessionsSheet), row);
}

function appendTrials(ss, session, researcherCode, codeRow, receivedAt) {
  const trials = []
    .concat(session.practice_log || [])
    .concat(session.trial_log || []);
  const sheet = ss.getSheetByName(CONFIG.trialsSheet);
  const rows = trials.map(function(trial) {
    return Object.assign({
      received_at_iso: receivedAt.toISOString(),
      researcher_code: researcherCode,
      researcher_code_status: codeRow.status || ''
    }, trial);
  });
  appendObjects(sheet, rows);
}

function appendObject(sheet, obj) {
  appendObjects(sheet, [obj]);
}

function appendObjects(sheet, objects) {
  if (!objects.length) return;
  const allKeys = [];
  objects.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
      if (allKeys.indexOf(key) === -1) allKeys.push(key);
    });
  });
  const headers = ensureHeaders(sheet, allKeys);
  const rows = objects.map(function(obj) {
    return headers.map(function(key) {
      const value = obj[key];
      if (value === undefined || value === null) return '';
      return value;
    });
  });
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
}

function appendObjectLegacy(sheet, obj) {
  const headers = ensureHeaders(sheet, Object.keys(obj));
  const row = headers.map(function(key) {
    const value = obj[key];
    if (value === undefined || value === null) return '';
    return value;
  });
  sheet.appendRow(row);
}

function ensureHeaders(sheet, keys) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(keys);
    return keys;
  }
  const width = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(function(header, index) {
    const normalized = String(header || '').trim();
    return normalized || '_blank_' + (index + 1);
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const missing = keys.filter(function(key) {
    return headers.indexOf(key) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    return headers.concat(missing);
  }
  return headers;
}

function sendResearcherNotification(session, researcherCode, codeRow) {
  if (!researcherCode || researcherCode === CONFIG.publicCode) return;
  if (!codeRow || !codeRow.active || !codeRow.email || codeRow.notify_mode === 'none') return;
  if (codeRow.notify_mode && codeRow.notify_mode !== 'immediate') return;

  const summary = session.summary || {};
  const participant = session.participant || {};
  const subject = '[LJT-S] Session complete: ' + sanitizeMailText(participant.id_raw || participant.id || session.session_id || '');
  const body = [
    'An LJT-S session has been completed.',
    '',
    'Researcher code: ' + researcherCode,
    'Session ID: ' + (session.session_id || ''),
    'Participant ID: ' + sanitizeMailText(participant.id_raw || participant.id || ''),
    'Mode: ' + ((session.settings && session.settings.mode) || ''),
    'Raw score: ' + (summary.raw_score || 0) + ' / ' + (summary.n_main_scored || ''),
    'Completed at: ' + (session.completed_at_iso || ''),
    '',
    'Open the Sheet and filter by researcher_code to retrieve your rows.'
  ].join('\n');
  MailApp.sendEmail({
    to: codeRow.email,
    subject: subject,
    body: body,
    name: CONFIG.fromName
  });
}

function sendParticipantResultCopy(session) {
  if (!CONFIG.allowParticipantEmailCopy) return;
  const participant = session.participant || {};
  if (!participant.request_result_email || !isEmail(participant.result_email)) return;
  const summary = session.summary || {};
  const subject = 'LJT-S result copy';
  const body = [
    'This is a copy of your LJT-S result.',
    '',
    'Session ID: ' + (session.session_id || ''),
    'Raw score: ' + (summary.raw_score || 0) + ' / ' + (summary.n_main_scored || ''),
    'Accuracy: ' + (summary.n_main_scored ? Math.round((summary.raw_score / summary.n_main_scored) * 1000) / 10 + '%' : ''),
    'TOEIC Listening prediction: ' + (summary.toeic_listening_predicted || 'Coming soon'),
    'CEFR reference: ' + (summary.cefr_reference || 'Coming soon'),
    '',
    'These values are reference estimates from LJT-S, not official scores.'
  ].join('\n');
  MailApp.sendEmail({
    to: participant.result_email,
    subject: subject,
    body: body,
    name: CONFIG.fromName
  });
}

function sendMailOutsideLock(researcherMail, participantMail) {
  if (researcherMail) {
    try {
      sendResearcherNotification(researcherMail.session, researcherMail.researcherCode, researcherMail.codeRow);
    } catch (err) {
      logError(err, new Date(), { context: 'researcher_notification' });
    }
  }
  if (participantMail) {
    try {
      sendParticipantResultCopy(participantMail.session);
    } catch (err) {
      logError(err, new Date(), { context: 'participant_result_copy' });
    }
  }
}

function lookupCode(ss, code) {
  const sheet = ss.getSheetByName(CONFIG.codesSheet);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(h) {
    return String(h).trim();
  });
  for (let i = 1; i < values.length; i += 1) {
    const row = objectFromRow(headers, values[i]);
    if (normalizeCode(row.code) === code) {
      return {
        code: code,
        email: String(row.email || '').trim(),
        active: row.active === true || String(row.active).toLowerCase() === 'true' || row.active === 1,
        notify_mode: String(row.notify_mode || 'immediate').trim().toLowerCase()
      };
    }
  }
  return null;
}

function resolveResearcherCode(ss, code) {
  if (!code || code === CONFIG.publicCode) {
    return {
      code: CONFIG.publicCode,
      email: '',
      active: true,
      notify_mode: 'none',
      valid: true,
      status: 'public'
    };
  }
  const codeRow = lookupCode(ss, code);
  if (!codeRow) {
    return {
      code: code,
      email: '',
      active: false,
      notify_mode: 'none',
      valid: false,
      status: 'unknown'
    };
  }
  if (!codeRow.active) {
    codeRow.valid = false;
    codeRow.status = 'inactive';
    codeRow.notify_mode = 'none';
    return codeRow;
  }
  codeRow.valid = true;
  codeRow.status = 'active';
  return codeRow;
}

function sessionExists(ss, sessionId) {
  return sheetHasSessionId(ss.getSheetByName(CONFIG.sessionsSheet), sessionId);
}

function trialSessionExists(ss, sessionId) {
  return sheetHasSessionId(ss.getSheetByName(CONFIG.trialsSheet), sessionId);
}

function sheetHasSessionId(sheet, sessionId) {
  if (!sessionId) return false;
  if (!sheet || sheet.getLastRow() < 2) return false;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
    return String(header || '').trim();
  });
  const index = headers.indexOf('session_id');
  if (index === -1) return false;
  const values = sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).getValues();
  return values.some(function(row) {
    return String(row[0] || '') === String(sessionId);
  });
}

function redactSession(session) {
  const copy = JSON.parse(JSON.stringify(session || {}));
  if (copy.participant) {
    copy.participant.result_email = copy.participant.result_email ? '[redacted]' : '';
  }
  return copy;
}

function objectFromRow(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });
  return obj;
}

function logError(err, receivedAt, e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureWorkbook(ss);
    appendObject(ss.getSheetByName(CONFIG.errorsSheet), {
      received_at_iso: receivedAt.toISOString(),
      error: String(err && err.stack ? err.stack : err),
      context_json: JSON.stringify(safeErrorContext(e))
    });
  } catch (ignored) {
    // Avoid recursive failure in doPost.
  }
}

function logCodeIssue(ss, code, status, receivedAt) {
  appendObject(ss.getSheetByName(CONFIG.errorsSheet), {
    received_at_iso: receivedAt.toISOString(),
    error: 'Researcher code ' + status,
    researcher_code: code,
    context_json: JSON.stringify({ researcher_code_status: status })
  });
}

function safeErrorContext(e) {
  if (!e) return {};
  if (e.context) return { context: String(e.context).slice(0, 120) };
  const body = e.postData && e.postData.contents ? e.postData.contents : '';
  if (!body) return {};
  try {
    const parsed = JSON.parse(body);
    const session = parsed.session || parsed;
    return {
      schema_version: parsed.schema_version || '',
      researcher_code: normalizeCode(parsed.researcher_code || session.researcher_code || ''),
      session_id: session.session_id || '',
      app_version: session.app_version || '',
      code_version: session.code_version || '',
      participant_id: session.participant && session.participant.id ? session.participant.id : '',
      payload_keys: Object.keys(parsed).slice(0, 20)
    };
  } catch {
    return {
      body_length: body.length,
      body_prefix_redacted: redactText(body.slice(0, 500))
    };
  }
}

function redactText(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/"result_email"\s*:\s*"[^"]*"/gi, '"result_email":"[redacted]"')
    .replace(/"name"\s*:\s*"[^"]*"/gi, '"name":"[redacted]"');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 40);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function sanitizeMailText(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 160);
}

function round(value, digits) {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}
