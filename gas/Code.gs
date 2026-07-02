const CONFIG = {
  fromName: 'LJT-S Online',
  maxRecipients: 3,
  allowedRecipientDomains: [],
  duplicateCacheSeconds: 21600
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
    const envelope = JSON.parse(raw);
    const session = envelope.session || envelope;
    if (!session || !session.session_id) throw new Error('Missing session_id');

    const participant = session.participant || {};
    const recipients = parseRecipients(participant.result_email);
    if (!recipients.length) throw new Error('Missing result recipient email');
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

    const csv = '\ufeff' + toCsv(resultRows(session));
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
    service: 'LJT-S email delivery endpoint'
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

function resultRows(session) {
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
      main_n_items: summary.n_main_scored || '',
      main_n_administered: summary.n_main || '',
      main_n_excluded: summary.n_main_excluded || 0,
      main_accuracy: summary.n_main_scored ? round(Number(summary.raw_score || 0) / Number(summary.n_main_scored), 4) : '',
      appropriate_score: summary.appropriate_score || '',
      inappropriate_score: summary.inappropriate_score || '',
      main_timeouts: summary.timeouts || 0,
      toeic_listening_predicted: summary.toeic_listening_predicted || '',
      toeic_status: summary.toeic_status || '',
      cefr_reference: summary.cefr_reference || '',
      researcher_code: session.researcher_code || settings.research_code || '',
      user_agent: environment.user_agent || '',
      viewport_width: environment.viewport_width || '',
      viewport_height: environment.viewport_height || '',
      screen_width: environment.screen_width || '',
      screen_height: environment.screen_height || '',
      pointer_coarse: environment.pointer_coarse || '',
      pointer_fine: environment.pointer_fine || '',
      in_iframe: environment.in_iframe || '',
      order_max_answer_run: diagnostics.maxObservedRun || '',
      order_same_word_gap_used: diagnostics.sameWordGapUsed || '',
      order_attempts: diagnostics.attempts || ''
    }));
  });
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
  const lines = [headers.join(',')];
  rows.forEach(function(row) {
    lines.push(headers.map(function(header) {
      return csvCell(row[header]);
    }).join(','));
  });
  return lines.join('\n') + '\n';
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
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
