const CONFIG = {
  fromName: 'LJT-S Online',
  // Safe default: resolve a research code to recipients stored in Script
  // Properties. See gas/README.md before updating an existing deployment.
  recipientMode: 'research-code',
  recipientMapProperty: 'LJTS_RESEARCH_RECIPIENTS',
  maxRecipients: 3,
  allowedRecipientDomains: [],
  duplicateCacheSeconds: 21600,
  maxRequestChars: 750000,
  maxSessionIdChars: 160,
  maxRecipientFieldChars: 512,
  maxStringChars: 10000,
  maxObjectKeys: 120,
  maxArrayLength: 200,
  maxPracticeRows: 20,
  maxTrialRows: 80,
  maxTotalRows: 100,
  maxValidationDepth: 8,
  maxValidationNodes: 10000
};

const PARTICIPANT_CSV_OMIT_KEYS = {
  correct_answer: true,
  target_word: true,
  item_type: true,
  difficulty_band: true,
  discrimination: true,
  difficulty: true,
  p_correct_calibration: true,
  item_rest_corr: true,
  full_theta_mean_item_info: true,
  form_position_source: true,
  word_number: true,
  base_id: true
};

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '';
    if (!raw) throw new Error('Empty request body');
    if (raw.length > CONFIG.maxRequestChars) throw new Error('Request body is too large');

    const envelope = JSON.parse(raw);
    if (!isRecord(envelope)) throw new Error('Request body must be a JSON object');
    validateJsonValue(envelope, 'payload', 0, { count: 0 });

    const session = envelope.session || envelope;
    validateSessionPayload(session);

    const participant = session.participant || {};
    const routing = resolveRecipients(envelope, session);
    const recipients = routing.recipients;
    const blocked = recipients.filter(function(email) {
      return !isAllowedRecipient(email);
    });
    if (blocked.length) throw new Error('Recipient domain is not allowed');

    const cache = CacheService.getScriptCache();
    const key = duplicateCacheKey(session.session_id, recipients);
    if (cache.get(key)) {
      return jsonResponse({
        ok: true,
        duplicate: true,
        service: 'LJT-S email delivery endpoint',
        session_id: session.session_id
      });
    }

    const csv = '\ufeff' + toCsv(resultRows(session, routing.researchCode));
    const filename = filenameBase(session) + '_trials.csv';
    const subject = 'LJT-S results: ' + sanitizeMailText(participant.id_raw || participant.id || session.session_id);
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: subject,
      body: resultEmailBody(session),
      name: CONFIG.fromName,
      attachments: [
        Utilities.newBlob(csv, 'text/csv;charset=utf-8', filename)
      ]
    });
    cache.put(key, '1', CONFIG.duplicateCacheSeconds);
    return jsonResponse({
      ok: true,
      emailed: true,
      service: 'LJT-S email delivery endpoint',
      session_id: session.session_id,
      recipient_count: recipients.length
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      service: 'LJT-S email delivery endpoint',
      error: String(err && err.message ? err.message : err)
    });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'LJT-S email delivery endpoint',
    recipient_mode: CONFIG.recipientMode
  });
}

function resultEmailBody(session) {
  const participant = session.participant || {};
  const summary = session.summary || {};
  const settings = session.settings || {};
  const accuracy = summary.n_main_scored
    ? Math.round((Number(summary.raw_score || 0) / Number(summary.n_main_scored || 1)) * 1000) / 10 + '%'
    : '';
  const lines = [
    'An LJT-S session has been completed. The result CSV is attached.',
    '',
    'Participant ID: ' + sanitizeMailText(participant.id_raw || participant.id || ''),
    participant.name ? 'Name: ' + sanitizeMailText(participant.name) : '',
    participant.school_code ? 'School/group code: ' + sanitizeMailText(participant.school_code) : '',
    participant.class_code ? 'Class code: ' + sanitizeMailText(participant.class_code) : '',
    'Session ID: ' + (session.session_id || ''),
    'Mode: ' + (settings.mode || ''),
    'Raw score: ' + (summary.raw_score || 0) + ' / ' + (summary.n_main_scored || ''),
    'Accuracy: ' + accuracy,
    'TOEIC Listening reference range: ' + (summary.toeic_listening_predicted || 'Coming soon'),
    'CEFR reference band: ' + (summary.cefr_reference || 'Coming soon'),
    'Completed at: ' + (session.completed_at_iso || ''),
    '',
    'TOEIC Listening and CEFR values are reference guides from LJT-S, not official scores.',
    'Do not use them as the sole evidence for placement, certification, pass/fail, or other high-stakes decisions.',
    'This message was generated automatically by LJT-S Online.'
  ];
  return lines.filter(String).join('\n');
}

function resultRows(session, resolvedResearchCode) {
  const rows = []
    .concat(session.practice_log || [])
    .concat(session.trial_log || []);
  const summary = session.summary || {};
  const environment = session.environment || {};
  const diagnostics = session.order_diagnostics || {};
  const settings = session.settings || {};
  return rows.map(function(row) {
    return stripParticipantCsvMetadata(Object.assign({}, row, {
      completed_at_iso: session.completed_at_iso || '',
      main_raw_score: summary.raw_score || 0,
      main_n_items: valueOrBlank(summary.n_main_scored),
      main_n_administered: valueOrBlank(summary.n_main),
      main_n_excluded: summary.n_main_excluded || 0,
      scoring_status: summary.n_main_scored === 40 && Number(summary.n_main_excluded || 0) === 0
        ? 'complete'
        : 'incomplete_form',
      main_accuracy: summary.n_main_scored ? round(Number(summary.raw_score || 0) / Number(summary.n_main_scored), 4) : '',
      appropriate_score: valueOrBlank(summary.appropriate_score),
      appropriate_items_scored: valueOrBlank(summary.n_appropriate),
      appropriate_items_administered: valueOrBlank(summary.n_appropriate_administered),
      appropriate_items_excluded: valueOrBlank(summary.n_appropriate_excluded),
      inappropriate_score: valueOrBlank(summary.inappropriate_score),
      inappropriate_items_scored: valueOrBlank(summary.n_inappropriate),
      inappropriate_items_administered: valueOrBlank(summary.n_inappropriate_administered),
      inappropriate_items_excluded: valueOrBlank(summary.n_inappropriate_excluded),
      main_timeouts: summary.timeouts || 0,
      toeic_listening_predicted: summary.toeic_listening_predicted || '',
      toeic_status: summary.toeic_status || '',
      cefr_reference: summary.cefr_reference || '',
      researcher_code: resolvedResearchCode || session.researcher_code || settings.research_code || '',
      user_agent: environment.user_agent || '',
      viewport_width: valueOrBlank(environment.viewport_width),
      viewport_height: valueOrBlank(environment.viewport_height),
      screen_width: valueOrBlank(environment.screen_width),
      screen_height: valueOrBlank(environment.screen_height),
      pointer_coarse: valueOrBlank(environment.pointer_coarse),
      pointer_fine: valueOrBlank(environment.pointer_fine),
      in_iframe: valueOrBlank(environment.in_iframe),
      order_max_answer_run: valueOrBlank(diagnostics.maxObservedRun),
      order_same_word_gap_used: valueOrBlank(diagnostics.sameWordGapUsed),
      order_attempts: valueOrBlank(diagnostics.attempts)
    }));
  });
}

function valueOrBlank(value) {
  return value === null || value === undefined ? '' : value;
}

function stripParticipantCsvMetadata(row) {
  const output = {};
  Object.keys(row || {}).forEach(function(key) {
    if (!PARTICIPANT_CSV_OMIT_KEYS[key]) output[key] = row[key];
  });
  output.item_id = neutralItemId(row);
  output.audio_file = neutralAudioId(row);
  delete output.base_id;
  return output;
}

function neutralItemId(row) {
  const prefix = row && row.phase === 'practice' ? 'practice' : 'main';
  const number = String((row && row.trial_number) || '').padStart(3, '0');
  return prefix + '_' + number;
}

function neutralAudioId(row) {
  const prefix = row && row.phase === 'practice' ? 'practice_audio' : 'main_audio';
  const number = String((row && row.trial_number) || '').padStart(3, '0');
  return prefix + '_' + number;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = [];
  rows.forEach(function(row) {
    Object.keys(row).forEach(function(key) {
      if (headers.indexOf(key) === -1) headers.push(key);
    });
  });
  const lines = [headers.map(csvCell).join(',')];
  rows.forEach(function(row) {
    lines.push(headers.map(function(header) {
      return csvCell(row[header]);
    }).join(','));
  });
  return lines.join('\n') + '\n';
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Quoting alone does not stop spreadsheet applications from evaluating a
  // CSV cell as a formula. Keep real JSON numbers numeric, but neutralize
  // formula-like strings (including strings with leading whitespace).
  if (typeof value === 'string' && (/^\s*[=+\-@]/.test(s) || /^[\t\r]/.test(s))) {
    s = "'" + s;
  }
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function validateSessionPayload(session) {
  if (!isRecord(session)) throw new Error('Missing or invalid session');
  requireBoundedString(session.session_id, 'session_id', CONFIG.maxSessionIdChars);

  [
    'participant',
    'settings',
    'summary',
    'environment',
    'order_diagnostics'
  ].forEach(function(key) {
    if (session[key] !== undefined && session[key] !== null && !isRecord(session[key])) {
      throw new Error(key + ' must be an object');
    }
  });

  const participant = session.participant || {};
  if (participant.result_email !== undefined && participant.result_email !== null) {
    if (typeof participant.result_email !== 'string') {
      throw new Error('result_email must be a string');
    }
    if (participant.result_email.length > CONFIG.maxRecipientFieldChars) {
      throw new Error('result_email is too long');
    }
  }

  const practiceRows = validateLog(session.practice_log, 'practice_log', CONFIG.maxPracticeRows);
  const trialRows = validateLog(session.trial_log, 'trial_log', CONFIG.maxTrialRows);
  if (practiceRows + trialRows > CONFIG.maxTotalRows) {
    throw new Error('Too many session rows');
  }
}

function validateLog(value, label, maximum) {
  if (value === undefined || value === null) return 0;
  if (!Array.isArray(value)) throw new Error(label + ' must be an array');
  if (value.length > maximum) throw new Error(label + ' has too many rows');
  value.forEach(function(row, index) {
    if (!isRecord(row)) throw new Error(label + '[' + index + '] must be an object');
  });
  return value.length;
}

function validateJsonValue(value, path, depth, state) {
  state.count += 1;
  if (state.count > CONFIG.maxValidationNodes) throw new Error('Payload has too many values');
  if (depth > CONFIG.maxValidationDepth) throw new Error('Payload is nested too deeply');

  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(path + ' contains an invalid number');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > CONFIG.maxStringChars) throw new Error(path + ' contains an oversized string');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > CONFIG.maxArrayLength) throw new Error(path + ' has too many entries');
    value.forEach(function(entry, index) {
      validateJsonValue(entry, path + '[' + index + ']', depth + 1, state);
    });
    return;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length > CONFIG.maxObjectKeys) throw new Error(path + ' has too many fields');
    keys.forEach(function(key) {
      if (key.length > 100) throw new Error(path + ' contains an oversized field name');
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new Error(path + ' contains a forbidden field name');
      }
      validateJsonValue(value[key], path + '.' + key, depth + 1, state);
    });
    return;
  }
  throw new Error(path + ' contains an unsupported value');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireBoundedString(value, label, maximum) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing ' + label);
  if (value.length > maximum) throw new Error(label + ' is too long');
}

function resolveRecipients(envelope, session) {
  const mode = String(CONFIG.recipientMode || '').trim().toLowerCase();
  const researchCode = researchCodeFromPayload(envelope, session);

  if (mode === 'research-code') {
    return {
      researchCode: researchCode,
      recipients: registeredRecipientsForCode(researchCode)
    };
  }

  if (mode === 'research-code-or-legacy') {
    const registered = researchCode ? registeredRecipientMap()[researchCode] : null;
    if (registered && registered.length) {
      return { researchCode: researchCode, recipients: registered };
    }
    return {
      researchCode: researchCode,
      recipients: legacyParticipantRecipients(session)
    };
  }

  if (mode === 'legacy-participant-email') {
    return {
      researchCode: researchCode,
      recipients: legacyParticipantRecipients(session)
    };
  }

  throw new Error('Invalid server recipient mode');
}

function researchCodeFromPayload(envelope, session) {
  const settings = isRecord(session.settings) ? session.settings : {};
  const candidates = [
    envelope && envelope.session ? envelope.researcher_code : '',
    session.researcher_code,
    settings.research_code
  ].filter(function(value) {
    return value !== undefined && value !== null && String(value).trim();
  }).map(function(value) {
    if (typeof value !== 'string' || value.length > 40) throw new Error('Invalid research code');
    const normalized = normalizeResearchCode(value);
    if (!normalized) throw new Error('Invalid research code');
    return normalized;
  });

  const unique = candidates.filter(function(code, index) {
    return candidates.indexOf(code) === index;
  });
  if (unique.length > 1) throw new Error('Conflicting research codes');
  return unique[0] || '';
}

function normalizeResearchCode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(normalized) ? normalized : '';
}

function registeredRecipientsForCode(researchCode) {
  if (!researchCode) throw new Error('Missing research code');
  const recipients = registeredRecipientMap()[researchCode];
  if (!recipients || !recipients.length) throw new Error('Unknown research code');
  return recipients;
}

function registeredRecipientMap() {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG.recipientMapProperty);
  if (!raw) return {};

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('Server recipient map is not valid JSON');
  }
  if (!isRecord(parsed)) throw new Error('Server recipient map must be an object');

  const output = {};
  Object.keys(parsed).forEach(function(rawCode) {
    const code = normalizeResearchCode(rawCode);
    if (!code) throw new Error('Server recipient map contains an invalid research code');
    if (output[code]) throw new Error('Server recipient map contains duplicate research codes');
    output[code] = parseRegisteredRecipients(parsed[rawCode], code);
  });
  return output;
}

function parseRegisteredRecipients(value, researchCode) {
  const parts = Array.isArray(value)
    ? value
    : String(value === undefined || value === null ? '' : value).split(/[,\s;]+/);
  if (!parts.length || parts.length > CONFIG.maxRecipients) {
    throw new Error('Invalid recipient count for research code ' + researchCode);
  }

  const seen = {};
  const recipients = [];
  parts.forEach(function(part) {
    if (typeof part !== 'string') throw new Error('Invalid recipient for research code ' + researchCode);
    const email = part.trim().toLowerCase();
    if (!isEmail(email)) throw new Error('Invalid recipient for research code ' + researchCode);
    if (!seen[email]) {
      seen[email] = true;
      recipients.push(email);
    }
  });
  if (!recipients.length || recipients.length > CONFIG.maxRecipients) {
    throw new Error('Invalid recipient count for research code ' + researchCode);
  }
  return recipients;
}

function legacyParticipantRecipients(session) {
  const participant = session.participant || {};
  const recipients = parseRecipients(participant.result_email);
  if (!recipients.length) throw new Error('Missing result recipient email');
  return recipients;
}

function parseRecipients(value) {
  const seen = {};
  return String(value || '')
    .split(/[,\s;]+/)
    .map(function(part) { return part.trim().toLowerCase(); })
    .filter(function(email) {
      if (!isEmail(email) || seen[email]) return false;
      seen[email] = true;
      return true;
    })
    .slice(0, CONFIG.maxRecipients);
}

function isAllowedRecipient(email) {
  if (!CONFIG.allowedRecipientDomains.length) return true;
  const domain = String(email || '').split('@').pop().toLowerCase();
  return CONFIG.allowedRecipientDomains.some(function(allowed) {
    return domain === String(allowed || '').toLowerCase().replace(/^@/, '');
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function duplicateCacheKey(sessionId, recipients) {
  const raw = String(sessionId || '') + '|' + recipients.join(',');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return 'ljts_' + digest.map(function(byte) {
    const n = byte < 0 ? byte + 256 : byte;
    return ('0' + n.toString(16)).slice(-2);
  }).join('').slice(0, 64);
}

function filenameBase(session) {
  const participant = session.participant || {};
  const settings = session.settings || {};
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const id = sanitizeFilename(participant.id || participant.id_raw || 'participant');
  const mode = sanitizeFilename(settings.mode || 'session');
  return 'LJT-S_' + id + '_' + mode + '_' + stamp;
}

function sanitizeFilename(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'participant';
}

function sanitizeMailText(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 160);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function round(value, digits) {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}
