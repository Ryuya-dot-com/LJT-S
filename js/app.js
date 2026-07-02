(() => {
  'use strict';

  const APP_VERSION = 'LJT-S-online-20260701';
  const CODE_VERSION = 'reference-guidance-csv-primary-20260703';
  const DEFAULTS = {
    mode: 'untimed',
    seed: 'LJT-S-20260629',
    keymap: 'counterbalanced',
    responseWindowHit: 1600,
    responseWindowCr: 2000,
    fixationMs: 500,
    postResponseMs: 700,
    maxAnswerRun: 2,
    sameWordGap: 8,
    autoPlayAudio: true
  };
  const STORAGE_LAST_KEY = 'ljts_partial_last';
  const STORAGE_PREFIX = 'ljts_partial_';
  const STORAGE_RECENT_ID_KEY = 'ljts_recent_participant_id';
  const SUBMISSION_QUEUE_KEY = 'ljts_submission_queue_v1';
  const MAX_AUDIO_RETRIES = 3;
  const AUDIO_WATCHDOG_MS = 12000;
  const UI_LANG_DEFAULT = 'en';
  const PARTICIPANT_CSV_OMIT_KEYS = new Set([
    'correct_answer',
    'target_word',
    'item_type',
    'difficulty_band',
    'discrimination',
    'difficulty',
    'p_correct_calibration',
    'item_rest_corr',
    'full_theta_mean_item_info',
    'form_position_source',
    'word_number',
    'base_id'
  ]);

  const TEXT = {
    ja: {
      langLabel: 'Language',
      resumeTitle: '途中の回答があります',
      resumeLead: 'この端末に未完了のセッションが保存されています。続きから再開できます。',
      resumeButton: '続きから再開',
      discardButton: '新しく始める',
      registrationTitle: 'LJT-S 受験情報',
      registrationLead: 'はじめに受験者情報を確認します。氏名は入力しなくても受験できます。',
      anonymousId: '匿名ID',
      anonymousIdHelp: '空欄の場合は匿名IDを自動発行します。提示順序とキー配置には小文字化したIDを使います。',
      optionalName: '氏名（任意）',
      schoolCode: '学校・所属コード（任意）',
      classCode: 'クラスコード（任意）',
      resultEmail: '結果送付先メール（任意）',
      resultEmailHelp: '入力すると、終了時に結果CSVをこの宛先へ送信します。空欄の場合は送信しません。',
      consentTitle: '参加前の確認',
      consentLead: '記録される内容を確認してください。',
      consentBody: '回答、反応時間、音声再生状況、端末情報が結果データとして記録されます。メールアドレスを入力した場合は、終了時に結果CSVの送信先として利用します。端末内にも一時保存され、終了時にCSVとして保存できます。参加は任意で、氏名は入力しなくても受験できます。',
      consentCheck: '上記を確認しました。',
      instructionsTitle: '課題の説明',
      instructionsLead: '音声チェックの前に、課題の進め方を確認してください。',
      taskNotice: '英語の文を聞き、文中の語が文脈に合って自然に使われているかを判断してください。音声が終わるまで回答は受け付けません。',
      taskNoticeTouch: '英語の文を聞き、文中の語が文脈に合って自然に使われているかを画面上のボタンで判断してください。音声が終わるまで回答は受け付けません。',
      disclosure1: '練習4問の後に本試験40問があります。所要時間は約8〜10分です。',
      disclosure2: '制限時間ありの場合、音声終了後およそ2秒以内に回答します。',
      disclosure3: '本試験中は再読み込みや別画面への移動を避けてください。',
      continueConsent: '参加前の確認へ',
      continueInstructions: '課題説明へ',
      continueSound: '音声チェックへ',
      back: '戻る',
      researcherSetup: '研究者セットアップ',
      idRequired: '匿名IDを入力するか、自動発行されたIDを使用してください。',
      emailInvalid: 'メールアドレスの形式を確認してください。',
      consentRequired: '参加前の確認にチェックを入れてください。',
      soundTitle: '音声チェック',
      soundLead: '下のボタンでテスト音声を再生し、はっきり聞こえることを確認してください。',
      playSound: 'テスト音声を再生',
      soundOk: 'はっきり聞こえた',
      soundError: '音声を再生できませんでした。音量、ブラウザ設定、ネットワークを確認してください。',
      preloadLabel: '音声ファイルの準備',
      practiceTitle: '練習',
      practiceLead: '本試験の前に4問練習します。練習では正誤のフィードバックが表示されます。',
      workedTitle: '判断の例',
      workedAppropriate: '適切例: "The company found a solution to the problem." の solution は文脈に合うため「適切 / Yes」です。',
      workedInappropriate: '不適切例: "She wore a solution to the meeting." の solution は文脈に合わないため「不適切 / No」です。',
      startPractice: '練習を始める',
      mainTitle: '本試験',
      mainLead: '練習と同じキーまたはボタンで回答します。本試験ではフィードバックは表示されません。',
      startMain: '本試験を始める',
      getReady: '準備してください。',
      listen: '聞いてください。',
      pressPlay: '再生ボタンを押してください。',
      play: '再生',
      respond: '回答してください。',
      appropriate: '適切 / Yes',
      inappropriate: '不適切 / No',
      tooLate: '時間切れです。',
      correct: '正解です。',
      incorrect: '不正解です。',
      correctAnswer: '正答',
      audioFailed: '音声エラーのため、この試行をスキップしました。',
      completeTitle: '終了しました',
      completeLead: '結果を確認してください。TOEIC ListeningとCEFRは公式スコアではなく、LJT-Sに基づく参考目安です。',
      recorded: 'CSVは信頼できる控えです。自動ダウンロードが始まらない場合は「CSVを保存」を押してください。',
      submissionNotConfigured: 'メール送信は設定されていません。CSVを保存してください。',
      submissionNoRecipient: 'メールアドレスが入力されていないため、メール送信は行いません。CSVを保存してください。',
      submissionQueued: '結果メール送信を準備しました。ネットワーク接続後に再試行できます。',
      submissionAttempted: '結果メール送信を試行しました。送信上限により届かない場合があるため、CSVを保存してください。',
      submissionFailed: '結果メール送信に失敗しました。CSVを保存し、必要に応じて再試行してください。',
      emailQuotaNotice: 'メール送信は補助機能で、1日あたり100件までの上限があります。大規模な受験では、メールアドレスを入力しても結果メールが届かないことがあります。',
      retrySubmission: 'メール送信を再試行',
      sendResultEmail: '結果メールを送信',
      rawScore: '素点',
      accuracy: '正答率',
      toeicPrediction: 'TOEIC Listening参考レンジ',
      cefrReference: 'CEFR参考バンド',
      comingSoon: '準備中',
      cefrUnavailable: 'TOEIC Listening予測の係数受領後に表示します。',
      disclaimer: '表示されるTOEIC ListeningレンジおよびCEFRバンドは、LJT-Sに基づく参考目安です。公式スコアではなく、クラス分け、合否、認定などの重要な判定に単独で使用しないでください。',
      downloadCsv: 'CSVを保存',
      downloadJson: 'バックアップJSONを保存',
      newSession: '新しいセッション',
      progressPractice: '練習',
      progressMain: '本試験'
    },
    en: {
      langLabel: 'Language',
      resumeTitle: 'Incomplete session found',
      resumeLead: 'This device has an unfinished session. You can continue from the last recorded trial.',
      resumeButton: 'Resume',
      discardButton: 'Start new',
      registrationTitle: 'LJT-S Registration',
      registrationLead: 'First, confirm the participant information. Name is optional.',
      anonymousId: 'Anonymous ID',
      anonymousIdHelp: 'If left blank, an anonymous ID is generated. The normalized lowercase ID is used for ordering and key mapping.',
      optionalName: 'Name (optional)',
      schoolCode: 'School / group code (optional)',
      classCode: 'Class code (optional)',
      resultEmail: 'Result recipient email (optional)',
      resultEmailHelp: 'If entered, the result CSV is emailed to this address after completion. Leave blank to skip email delivery.',
      consentTitle: 'Before You Start',
      consentLead: 'Confirm what will be recorded before continuing.',
      consentBody: 'Responses, response times, audio playback status, and device information are recorded as result data. If you enter an email address, it is used as the destination for the result CSV at the end. Data is also temporarily stored on this device and can be saved as CSV. Participation is voluntary; your name is optional.',
      consentCheck: 'I have read this information.',
      instructionsTitle: 'Task Instructions',
      instructionsLead: 'Review how the task works before the sound check.',
      taskNotice: 'Listen to each English sentence and judge whether the word is used naturally in context. Responses are accepted only after the audio ends.',
      taskNoticeTouch: 'Listen to each English sentence and use the on-screen buttons to judge whether the word is used naturally in context. Responses are accepted only after the audio ends.',
      disclosure1: 'There are 4 practice trials and 40 main-test trials. The session takes about 8-10 minutes.',
      disclosure2: 'In timed mode, respond within about 2 seconds after the audio ends.',
      disclosure3: 'Do not reload the page or switch away during the main test.',
      continueConsent: 'Continue to confirmation',
      continueInstructions: 'Continue to instructions',
      continueSound: 'Continue to sound check',
      back: 'Back',
      researcherSetup: 'Researcher setup',
      idRequired: 'Enter an anonymous ID or use the generated ID.',
      emailInvalid: 'Check the email address format.',
      consentRequired: 'Please confirm the participation information before continuing.',
      soundTitle: 'Sound Check',
      soundLead: 'Play the test audio below and confirm that you can hear it clearly.',
      playSound: 'Play test audio',
      soundOk: 'I heard it clearly',
      soundError: 'Audio could not be played. Check volume, browser settings, and network access.',
      preloadLabel: 'Preparing audio files',
      practiceTitle: 'Practice',
      practiceLead: 'You will complete 4 practice trials before the main test. Practice trials show feedback.',
      workedTitle: 'Examples',
      workedAppropriate: 'Appropriate example: in "The company found a solution to the problem," solution fits the context, so choose "Appropriate / Yes."',
      workedInappropriate: 'Inappropriate example: in "She wore a solution to the meeting," solution does not fit the context, so choose "Inappropriate / No."',
      startPractice: 'Start practice',
      mainTitle: 'Main Test',
      mainLead: 'Use the same keys or buttons as in practice. No feedback is shown during the main test.',
      startMain: 'Start main test',
      getReady: 'Get ready.',
      listen: 'Listen.',
      pressPlay: 'Press Play.',
      play: 'Play',
      respond: 'Respond.',
      appropriate: 'Appropriate / Yes',
      inappropriate: 'Inappropriate / No',
      tooLate: 'Too late.',
      correct: 'Correct.',
      incorrect: 'Incorrect.',
      correctAnswer: 'Correct answer',
      audioFailed: 'Audio failed, so this trial was skipped.',
      completeTitle: 'Session Complete',
      completeLead: 'Review your result. TOEIC Listening and CEFR values are reference guides from LJT-S, not official scores.',
      recorded: 'The CSV is the reliable copy. A download should start automatically; if it does not, use Download CSV.',
      submissionNotConfigured: 'Email delivery is not configured. Save the CSV file.',
      submissionNoRecipient: 'No email address was entered, so no email was sent. Save the CSV file.',
      submissionQueued: 'Result email is queued. Retry when network access is available.',
      submissionAttempted: 'Result email was attempted. Email may not arrive because of sending limits, so save the CSV file.',
      submissionFailed: 'Result email failed. Save the CSV and retry if needed.',
      emailQuotaNotice: 'Email delivery is supplemental and limited to 100 messages per day. During large administrations, the result email may not arrive even if an email address was entered.',
      retrySubmission: 'Retry email',
      sendResultEmail: 'Send result email',
      rawScore: 'Raw score',
      accuracy: 'Accuracy',
      toeicPrediction: 'TOEIC Listening reference range',
      cefrReference: 'CEFR reference band',
      comingSoon: 'Coming soon',
      cefrUnavailable: 'Available after the TOEIC Listening conversion coefficients are added.',
      disclaimer: 'The TOEIC Listening range and CEFR band shown here are reference guides from LJT-S, not official scores. Do not use them as the sole evidence for placement, certification, pass/fail, or other high-stakes decisions.',
      downloadCsv: 'Download CSV',
      downloadJson: 'Download backup JSON',
      newSession: 'New session',
      progressPractice: 'Practice',
      progressMain: 'Main test'
    }
  };

  const ITEMS = Array.isArray(window.LJT_SHORT_ITEMS) ? window.LJT_SHORT_ITEMS : [];
  const PRACTICE_ITEMS = Array.isArray(window.LJT_SHORT_PRACTICE_ITEMS)
    ? window.LJT_SHORT_PRACTICE_ITEMS
    : [];

  const app = document.getElementById('app');
  const params = new URLSearchParams(window.location.search);

  const state = {
    config: readConfigFromParams(),
    participant: null,
    sessionId: null,
    startedAtIso: null,
    completedAtIso: null,
    responseMapping: null,
    orderedItems: [],
    orderDiagnostics: null,
    practiceIndex: 0,
    trialIndex: 0,
    practiceLog: [],
    trialLog: [],
    activeTrial: null,
    responseOpen: false,
    stage: null,
    timerId: null,
    audio: null,
    audioStop: null,
    audioPreloadRefs: [],
    preload: null,
    uiLang: UI_LANG_DEFAULT,
    currentPartialKey: null,
    startedFromResearcherSetup: false,
    soundCheckPassed: false,
    submissionStatus: null,
    submissionFlushPromise: null,
    autoDownloadAttempted: false
  };
  document.documentElement.lang = state.uiLang;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function t(key) {
    return TEXT[state.uiLang]?.[key] || TEXT.ja[key] || key;
  }

  function setLanguage(lang, rerender) {
    state.uiLang = lang === 'en' ? 'en' : 'ja';
    document.documentElement.lang = state.uiLang;
    if (typeof rerender === 'function') rerender();
  }

  function languageToggleMarkup() {
    return `
      <div class="language-toggle" aria-label="${escapeHtml(t('langLabel'))}">
        <button class="lang-btn${state.uiLang === 'ja' ? ' active' : ''}" data-lang="ja" type="button">日本語</button>
        <button class="lang-btn${state.uiLang === 'en' ? ' active' : ''}" data-lang="en" type="button">EN</button>
      </div>
    `;
  }

  function bindLanguageToggle(rerender) {
    document.querySelectorAll('[data-lang]').forEach(button => {
      button.addEventListener('click', () => setLanguage(button.dataset.lang, rerender));
    });
  }

  function isResearchMode() {
    return params.get('research') === '1' || state.startedFromResearcherSetup;
  }

  function isResearcherSetupRequest() {
    return params.get('research') === '1' && params.get('take') !== '1';
  }

  function isParticipantTakeUrl() {
    return params.get('take') === '1';
  }

  function isParticipantEntryFile() {
    return /\/participant\.html$/i.test(window.location.pathname);
  }

  function isPublicMode() {
    return !isResearchMode();
  }

  function hasCoarsePointer() {
    return window.matchMedia?.('(pointer: coarse)').matches === true;
  }

  function canExportResearchMetadata() {
    return Boolean(state.startedFromResearcherSetup && !isParticipantTakeUrl() && !isParticipantEntryFile());
  }

  function shouldUseParticipantSafeCsv() {
    return !canExportResearchMetadata();
  }

  function createAnonymousParticipantId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    const random = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
    return `LJTS-${random}`;
  }

  function normalizeParticipantId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function allAudioPaths() {
    const paths = [...PRACTICE_ITEMS, ...ITEMS].map(item => item.audio_path).filter(Boolean);
    return Array.from(new Set(paths));
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return '';
    return `${Math.round(value * 1000) / 10}%`;
  }

  function getEnvironmentSnapshot() {
    const nav = window.navigator || {};
    const scr = window.screen || {};
    let inIframe = 0;
    try {
      inIframe = window.self !== window.top ? 1 : 0;
    } catch {
      inIframe = 1;
    }
    return {
      user_agent: nav.userAgent || '',
      platform: nav.platform || '',
      language: nav.language || '',
      viewport_width: window.innerWidth || '',
      viewport_height: window.innerHeight || '',
      screen_width: scr.width || '',
      screen_height: scr.height || '',
      device_pixel_ratio: window.devicePixelRatio || 1,
      pointer_coarse: hasCoarsePointer() ? 1 : 0,
      pointer_fine: window.matchMedia?.('(pointer: fine)').matches ? 1 : 0,
      standalone_display: window.matchMedia?.('(display-mode: standalone)').matches ? 1 : 0,
      in_iframe: inIframe,
      page_protocol: window.location.protocol
    };
  }

  function clampNumber(value, fallback, min, max) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeMode(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'timed' || v === 'untimed') return v;
    return DEFAULTS.mode;
  }

  function normalizeKeymap(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'f_appropriate' || v === 'j_appropriate' || v === 'counterbalanced') return v;
    return DEFAULTS.keymap;
  }

  function normalizeResearchCode(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '')
      .slice(0, 40);
  }

  function isValidEmailAddress(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function submissionSettings() {
    const cfg = window.LJT_SHORT_SUBMISSION || {};
    const endpoint = String(cfg.endpoint || '').trim();
    const enabledByConfig = cfg.enabled === true && endpoint;
    const disabledByUrl = params.get('submit') === '0';
    return {
      enabled: !disabledByUrl && Boolean(enabledByConfig),
      endpoint,
      publicResearchCode: normalizeResearchCode(cfg.publicResearchCode || 'public') || 'public',
      maxRetries: clampNumber(cfg.maxRetries, 5, 1, 20)
    };
  }

  function defaultResearchCode() {
    if (params.has('rc')) return normalizeResearchCode(params.get('rc'));
    if (params.get('research') === '1') return '';
    return submissionSettings().publicResearchCode;
  }

  function readConfigFromParams() {
    return {
      mode: normalizeMode(params.get('mode') || params.get('timing') || DEFAULTS.mode),
      seed: params.get('seed') || DEFAULTS.seed,
      keymap: normalizeKeymap(params.get('keymap') || DEFAULTS.keymap),
      researchCode: defaultResearchCode(),
      responseWindowHit: clampNumber(
        params.get('response_window_ms_hit') || params.get('response_window_hit_ms'),
        DEFAULTS.responseWindowHit,
        500,
        5000
      ),
      responseWindowCr: clampNumber(
        params.get('response_window_ms_cr') || params.get('response_window_cr_ms'),
        DEFAULTS.responseWindowCr,
        500,
        5000
      ),
      fixationMs: clampNumber(params.get('fixation_ms'), DEFAULTS.fixationMs, 0, 3000),
      postResponseMs: clampNumber(params.get('post_response_ms'), DEFAULTS.postResponseMs, 150, 5000),
      maxAnswerRun: clampNumber(params.get('max_answer_run') || params.get('max_condition_run'), DEFAULTS.maxAnswerRun, 1, 5),
      sameWordGap: clampNumber(params.get('same_word_gap'), DEFAULTS.sameWordGap, 0, 20),
      autoPlayAudio: params.get('auto_play_audio') === null ? DEFAULTS.autoPlayAudio : params.get('auto_play_audio') !== '0'
    };
  }

  function applyConfigToUrl(config, participantMode) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('take', participantMode ? '1' : '0');
    if (participantMode || isResearchMode()) {
      url.searchParams.set('research', '1');
    }
    url.searchParams.set('mode', config.mode);
    url.searchParams.set('seed', config.seed || DEFAULTS.seed);
    url.searchParams.set('keymap', config.keymap);
    if (normalizeResearchCode(config.researchCode)) {
      url.searchParams.set('rc', normalizeResearchCode(config.researchCode));
    }
    url.searchParams.set('response_window_ms_hit', String(config.responseWindowHit));
    url.searchParams.set('response_window_ms_cr', String(config.responseWindowCr));
    url.searchParams.set('fixation_ms', String(config.fixationMs));
    url.searchParams.set('post_response_ms', String(config.postResponseMs));
    url.searchParams.set('max_answer_run', String(config.maxAnswerRun));
    url.searchParams.set('same_word_gap', String(config.sameWordGap));
    url.searchParams.set('auto_play_audio', config.autoPlayAudio ? '1' : '0');
    return url.toString();
  }

  function topbar(label, options = {}) {
    const participantView = options.participantView === true;
    return `
      <div class="topbar">
        <div class="brand">
          <h1>LJT-S Online</h1>
          ${participantView ? '' : '<span>40-item Lexicosemantic Judgement Task Short Form</span>'}
        </div>
        ${participantView ? languageToggleMarkup() : `<div class="protocol-pill">${escapeHtml(label)}</div>`}
      </div>
    `;
  }

  function participantTopbar() {
    return topbar('', { participantView: true });
  }

  function renderInitial() {
    if (!ITEMS.length) {
      app.innerHTML = `${topbar('Setup error')}
        <section class="panel">
          <h2 class="section-title">Item data could not be loaded</h2>
          <p class="lead">Check that <code>data/items.js</code> is available in the published directory.</p>
        </section>`;
      return;
    }

    if (isResearcherSetupRequest()) {
      renderResearcherSetup();
    } else {
      renderParticipantRegistration();
    }
  }

  function renderResearcherSetup() {
    const c = state.config;
    const fileMode = window.location.protocol === 'file:';
    const submit = submissionSettings();
    app.innerHTML = `${topbar('Researcher setup')}
      <section class="panel">
        <h2 class="section-title">Administration settings</h2>
        <p class="lead">Create a participant URL for a fixed 40-item LJT-S session. Participant result emails attach a sanitized CSV. Local research-mode CSV files preserve analysis metadata.</p>

        <div class="grid-3">
          <div class="field">
            <label for="mode">Timing condition</label>
            <select id="mode">
              <option value="timed"${c.mode === 'timed' ? ' selected' : ''}>Timed</option>
              <option value="untimed"${c.mode === 'untimed' ? ' selected' : ''}>Untimed</option>
            </select>
            <small>Timed uses separate response windows for appropriate and inappropriate items.</small>
          </div>
          <div class="field">
            <label for="seed">Order seed</label>
            <input id="seed" type="text" value="${escapeHtml(c.seed)}" autocomplete="off">
            <small>Combined with participant ID for reproducible constrained randomization.</small>
          </div>
          <div class="field">
            <label for="keymap">F/J key mapping</label>
            <select id="keymap">
              <option value="counterbalanced"${c.keymap === 'counterbalanced' ? ' selected' : ''}>Counterbalanced by participant ID</option>
              <option value="f_appropriate"${c.keymap === 'f_appropriate' ? ' selected' : ''}>F = Appropriate / J = Inappropriate</option>
              <option value="j_appropriate"${c.keymap === 'j_appropriate' ? ' selected' : ''}>F = Inappropriate / J = Appropriate</option>
            </select>
          </div>
          <div class="field">
            <label for="research-code">Researcher code</label>
            <input id="research-code" type="text" value="${escapeHtml(c.researchCode || '')}" autocomplete="off" placeholder="e.g., lab2026">
            <small>Optional label written into result files and email attachments.</small>
          </div>
        </div>

        <div class="grid-3" style="margin-top:16px">
          <div class="field">
            <label for="auto-play">Audio playback</label>
            <select id="auto-play">
              <option value="1"${c.autoPlayAudio ? ' selected' : ''}>Auto-play after fixation</option>
              <option value="0"${!c.autoPlayAudio ? ' selected' : ''}>Manual play button</option>
            </select>
          </div>
          <div class="field">
            <label for="hit-window">Appropriate window (ms)</label>
            <input id="hit-window" type="number" min="500" max="5000" step="50" value="${escapeHtml(c.responseWindowHit)}">
          </div>
          <div class="field">
            <label for="cr-window">Inappropriate window (ms)</label>
            <input id="cr-window" type="number" min="500" max="5000" step="50" value="${escapeHtml(c.responseWindowCr)}">
          </div>
          <div class="field">
            <label for="fixation-ms">Fixation (ms)</label>
            <input id="fixation-ms" type="number" min="0" max="3000" step="50" value="${escapeHtml(c.fixationMs)}">
          </div>
        </div>

        <div class="grid-3" style="margin-top:16px">
          <div class="field">
            <label for="max-run">Max same correct-answer run</label>
            <input id="max-run" type="number" min="1" max="5" step="1" value="${escapeHtml(c.maxAnswerRun)}">
            <small>Default 2: no more than two appropriate or inappropriate correct answers in a row.</small>
          </div>
          <div class="field">
            <label for="same-gap">Repeated target-word gap</label>
            <input id="same-gap" type="number" min="0" max="20" step="1" value="${escapeHtml(c.sameWordGap)}">
            <small>Default 8: the same target word is not repeated within the next eight main trials when feasible.</small>
          </div>
          <div class="field">
            <label for="post-response-ms">Post-response delay (ms)</label>
            <input id="post-response-ms" type="number" min="150" max="5000" step="50" value="${escapeHtml(c.postResponseMs)}">
          </div>
        </div>

        <div class="notice warning">
          ${submit.enabled
            ? 'Email delivery is configured as a supplemental channel. It is quota-limited, so participants should save the CSV at completion as the primary reliable copy.'
            : 'Email delivery is not configured yet. Participants should download the CSV at completion and send it according to the study protocol.'
          }
        </div>

        <div class="actions">
          ${fileMode ? '' : '<button class="btn" id="generate-url">Generate participant URL</button>'}
          <button class="btn secondary" id="start-here">Start on this device</button>
          <button class="btn ghost" id="reset-defaults">Reset defaults</button>
        </div>
      </section>

      <section class="panel">
        <h2 class="section-title">Participant URL</h2>
        ${fileMode
          ? '<div class="notice warning">Local file paths should not be distributed. For offline zip administration, open <code>participant.html</code> on the participant machine and collect the CSV at completion.</div>'
          : `<div class="field">
              <label for="participant-url">Distribute this URL</label>
              <textarea id="participant-url" readonly>${escapeHtml(applyConfigToUrl(c, true))}</textarea>
            </div>
            <div class="actions">
              <button class="btn secondary" id="copy-url">Copy URL</button>
            </div>`
        }
      </section>

      <section class="panel">
        <h2 class="section-title">Fixed-form design</h2>
        <table class="summary-table">
          <tr><th>Main-test items</th><td>${ITEMS.length} items: 20 appropriate and 20 inappropriate.</td></tr>
          <tr><th>Practice</th><td>${PRACTICE_ITEMS.length} feedback trials before the main test.</td></tr>
          <tr><th>Ordering</th><td>Seeded constrained randomization by participant ID; correct-answer runs and repeated target-word spacing are logged in the output.</td></tr>
          <tr><th>Scoring</th><td>Raw accuracy for the 40 main-test items. Practice is excluded.</td></tr>
        </table>
      </section>
    `;

    if (!fileMode) {
      $('generate-url').addEventListener('click', () => {
        state.config = readResearcherForm();
        $('participant-url').value = applyConfigToUrl(state.config, true);
      });
    }
    $('start-here').addEventListener('click', () => {
      state.config = readResearcherForm();
      state.startedFromResearcherSetup = true;
      renderParticipantRegistration();
    });
    $('reset-defaults').addEventListener('click', () => {
      state.config = { ...DEFAULTS };
      renderResearcherSetup();
    });
    if (!fileMode) {
      $('copy-url').addEventListener('click', async () => {
        state.config = readResearcherForm();
        const url = applyConfigToUrl(state.config, true);
        $('participant-url').value = url;
        try {
          await navigator.clipboard.writeText(url);
          $('copy-url').textContent = 'Copied';
          setTimeout(() => { if ($('copy-url')) $('copy-url').textContent = 'Copy URL'; }, 1200);
        } catch {
          $('participant-url').select();
        }
      });
    }
  }

  function readResearcherForm() {
    return {
      mode: normalizeMode($('mode').value),
      seed: $('seed').value.trim() || DEFAULTS.seed,
      keymap: normalizeKeymap($('keymap').value),
      researchCode: normalizeResearchCode($('research-code').value),
      autoPlayAudio: $('auto-play').value === '1',
      responseWindowHit: clampNumber($('hit-window').value, DEFAULTS.responseWindowHit, 500, 5000),
      responseWindowCr: clampNumber($('cr-window').value, DEFAULTS.responseWindowCr, 500, 5000),
      fixationMs: clampNumber($('fixation-ms').value, DEFAULTS.fixationMs, 0, 3000),
      postResponseMs: clampNumber($('post-response-ms').value, DEFAULTS.postResponseMs, 150, 5000),
      maxAnswerRun: clampNumber($('max-run').value, DEFAULTS.maxAnswerRun, 1, 5),
      sameWordGap: clampNumber($('same-gap').value, DEFAULTS.sameWordGap, 0, 20)
    };
  }

  function readRegistrationDraft(suggestedId, suggestedWasGenerated = true) {
    return {
      suggestedId,
      suggestedWasGenerated,
      idRaw: $('participant-id')?.value.trim() || suggestedId,
      name: $('participant-name')?.value.trim() || '',
      schoolCode: $('school-code')?.value.trim() || '',
      classCode: $('class-code')?.value.trim() || '',
      resultEmail: $('result-email')?.value.trim() || '',
      requestResultEmail: Boolean($('result-email')?.value.trim()),
      consent: $('consent-check')?.checked || false
    };
  }

  function renderParticipantRegistration(draft = {}) {
    state.stage = 'registration';
    const showResearcherBack = state.startedFromResearcherSetup;
    const showResearcherLink = !isParticipantEntryFile() && !isParticipantTakeUrl() && !isResearchMode();
    const latestPartial = draft.idRaw ? null : getLatestPartialSession();
    const recentId = draft.idRaw ? '' : readRecentParticipantId();
    const suggestedId = draft.suggestedId || latestPartial?.participant?.id_raw || recentId || createAnonymousParticipantId();
    const suggestedWasGenerated = draft.suggestedWasGenerated ?? !(latestPartial || recentId);
    const currentId = draft.idRaw || suggestedId;
    const resumable = getPartialSessionForParticipantId(currentId);
    const showResultEmail = submissionSettings().enabled;
    const resultEmailMarkup = showResultEmail
      ? `
          <div class="field">
            <label for="result-email">${escapeHtml(t('resultEmail'))}</label>
            <input id="result-email" type="email" autocomplete="email" value="${escapeHtml(draft.resultEmail || '')}">
            <small>${escapeHtml(t('resultEmailHelp'))}</small>
          </div>
        `
      : '';
    const resumeMarkup = resumable
      ? `
        <section class="panel resume-panel">
          <h2 class="section-title">${escapeHtml(t('resumeTitle'))}</h2>
          <p class="lead">${escapeHtml(t('resumeLead'))}</p>
          <table class="summary-table">
            <tr><th>ID</th><td>${escapeHtml(resumable.participant?.id_raw || resumable.participant?.id || '')}</td></tr>
            <tr><th>Saved</th><td>${escapeHtml(resumable.saved_at_iso || '')}</td></tr>
            <tr><th>Progress</th><td>${escapeHtml(`${resumable.practice_log?.length || 0}/${PRACTICE_ITEMS.length} practice, ${resumable.trial_log?.length || 0}/${ITEMS.length} main`)}</td></tr>
          </table>
          <div class="actions">
            <button class="btn" id="resume-session">${escapeHtml(t('resumeButton'))}</button>
            <button class="btn secondary" id="discard-resume">${escapeHtml(t('discardButton'))}</button>
          </div>
        </section>
      `
      : '';

    app.innerHTML = `${participantTopbar()}
      ${resumeMarkup}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('registrationTitle'))}</h2>
        <p class="lead">${escapeHtml(t('registrationLead'))}</p>
        <div class="grid">
          <div class="field">
            <label for="participant-id">${escapeHtml(t('anonymousId'))}</label>
            <input id="participant-id" type="text" autocomplete="off" value="${escapeHtml(currentId)}" data-suggested-id="${escapeHtml(suggestedId)}">
            <small>${escapeHtml(t('anonymousIdHelp'))}</small>
          </div>
          <div class="field">
            <label for="participant-name">${escapeHtml(t('optionalName'))}</label>
            <input id="participant-name" type="text" autocomplete="name" value="${escapeHtml(draft.name || '')}">
          </div>
          <div class="field">
            <label for="school-code">${escapeHtml(t('schoolCode'))}</label>
            <input id="school-code" type="text" autocomplete="off" value="${escapeHtml(draft.schoolCode || '')}">
          </div>
          <div class="field">
            <label for="class-code">${escapeHtml(t('classCode'))}</label>
            <input id="class-code" type="text" autocomplete="off" value="${escapeHtml(draft.classCode || '')}">
          </div>
          ${resultEmailMarkup}
        </div>
        <div id="registration-error" class="notice error hidden"></div>
        <div class="actions">
          <button class="btn" id="continue-registration">${escapeHtml(isPublicMode() ? t('continueConsent') : t('continueInstructions'))}</button>
          ${showResearcherBack ? '<button class="btn ghost" id="back-setup">Researcher setup</button>' : ''}
          ${showResearcherLink ? `<button class="btn ghost" id="researcher-link">${escapeHtml(t('researcherSetup'))}</button>` : ''}
        </div>
      </section>
    `;

    bindLanguageToggle(() => renderParticipantRegistration(readRegistrationDraft(suggestedId, suggestedWasGenerated)));
    if (resumable) {
      $('resume-session').addEventListener('click', () => restorePartialSession(resumable));
      $('discard-resume').addEventListener('click', () => {
        removePartialSession(resumable.storage_key);
        renderParticipantRegistration();
      });
    }
    $('continue-registration').addEventListener('click', () => {
      const name = $('participant-name').value.trim();
      const typedId = $('participant-id').value.trim();
      const idRaw = typedId || suggestedId;
      const schoolCode = $('school-code').value.trim();
      const classCode = $('class-code').value.trim();
      const resultEmail = $('result-email')?.value.trim() || '';
      const requestResultEmail = Boolean(resultEmail);
      const suggestedFromInput = $('participant-id').dataset.suggestedId || suggestedId;
      const autoGenerated = suggestedWasGenerated && normalizeParticipantId(idRaw) === normalizeParticipantId(suggestedFromInput);
      if (!normalizeParticipantId(idRaw)) {
        const err = $('registration-error');
        err.textContent = t('idRequired');
        err.classList.remove('hidden');
        return;
      }
      if (resultEmail && !isValidEmailAddress(resultEmail)) {
        const err = $('registration-error');
        err.textContent = t('emailInvalid');
        err.classList.remove('hidden');
        return;
      }
      const nextDraft = {
        suggestedId,
        suggestedWasGenerated,
        idRaw,
        name,
        schoolCode,
        classCode,
        resultEmail,
        requestResultEmail,
        autoGenerated,
        consent: draft.consent || false
      };
      if (isPublicMode()) {
        renderParticipantConsent(nextDraft);
      } else {
        renderParticipantInstructions(nextDraft);
      }
    });
    if (showResearcherBack) {
      $('back-setup').addEventListener('click', renderResearcherSetup);
    }
    if (showResearcherLink) {
      $('researcher-link').addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set('research', '1');
        window.location.href = url.toString();
      });
    }
  }

  function readConsentDraft(draft) {
    return {
      ...draft,
      consent: $('consent-check')?.checked || false
    };
  }

  function renderParticipantConsent(draft = {}) {
    state.stage = 'consent_info';
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('consentTitle'))}</h2>
        <p class="lead">${escapeHtml(t('consentLead'))}</p>
        <div class="notice">
          <p>${escapeHtml(t('consentBody'))}</p>
        </div>
        <label class="check-row">
          <input id="consent-check" type="checkbox"${draft.consent ? ' checked' : ''}>
          <span>${escapeHtml(t('consentCheck'))}</span>
        </label>
        <div id="consent-error" class="notice error hidden"></div>
        <div class="actions">
          <button class="btn" id="continue-consent">${escapeHtml(t('continueInstructions'))}</button>
          <button class="btn ghost" id="back-registration">${escapeHtml(t('back'))}</button>
        </div>
      </section>`;

    bindLanguageToggle(() => renderParticipantConsent(readConsentDraft(draft)));
    $('continue-consent').addEventListener('click', () => {
      const nextDraft = readConsentDraft(draft);
      if (!nextDraft.consent) {
        const err = $('consent-error');
        err.textContent = t('consentRequired');
        err.classList.remove('hidden');
        return;
      }
      renderParticipantInstructions(nextDraft);
    });
    $('back-registration').addEventListener('click', () => renderParticipantRegistration(readConsentDraft(draft)));
  }

  function renderParticipantInstructions(draft = {}) {
    state.stage = 'task_instructions';
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('instructionsTitle'))}</h2>
        <p class="lead">${escapeHtml(t('instructionsLead'))}</p>
        <div class="notice">
          ${escapeHtml(hasCoarsePointer() ? t('taskNoticeTouch') : t('taskNotice'))}
        </div>
        <ul class="list">
          <li>${escapeHtml(t('disclosure1'))}</li>
          <li>${escapeHtml(t('disclosure2'))}</li>
          <li>${escapeHtml(t('disclosure3'))}</li>
        </ul>
        <div class="actions">
          <button class="btn" id="begin-session">${escapeHtml(t('continueSound'))}</button>
          <button class="btn ghost" id="back-before-instructions">${escapeHtml(t('back'))}</button>
        </div>
      </section>`;

    bindLanguageToggle(() => renderParticipantInstructions(draft));
    $('begin-session').addEventListener('click', () => startSession(draft));
    $('back-before-instructions').addEventListener('click', () => {
      if (isPublicMode()) {
        renderParticipantConsent(draft);
      } else {
        renderParticipantRegistration(draft);
      }
    });
  }

  function startSession(input) {
    const idRaw = input.idRaw || createAnonymousParticipantId();
    const id = normalizeParticipantId(idRaw);
    state.participant = {
      name: input.name || '',
      id,
      id_raw: idRaw,
      school_code: input.schoolCode || '',
      class_code: input.classCode || '',
      result_email: input.requestResultEmail ? input.resultEmail || '' : '',
      request_result_email: input.requestResultEmail ? 1 : 0,
      anonymous_id_generated: input.autoGenerated ? 1 : 0
    };
    state.sessionId = createSessionId();
    state.startedAtIso = new Date().toISOString();
    state.completedAtIso = null;
    state.currentPartialKey = partialStorageKeyForParticipant(id);
    state.responseMapping = makeResponseMapping(state.config.keymap, id, state.config.seed);
    const orderSeed = `${state.config.seed}|${id}|${state.config.mode}|${APP_VERSION}`;
    const orderResult = buildConstrainedOrder(ITEMS, orderSeed, state.config.maxAnswerRun, state.config.sameWordGap);
    state.orderedItems = orderResult.items;
    state.orderDiagnostics = orderResult.diagnostics;
    state.practiceIndex = 0;
    state.trialIndex = 0;
    state.practiceLog = [];
    state.trialLog = [];
    state.activeTrial = null;
    state.responseOpen = false;
    state.autoDownloadAttempted = false;
    state.soundCheckPassed = false;
    state.stage = 'sound_check';
    rememberRecentParticipantId(idRaw);
    savePartialSession();
    renderSoundCheck();
  }

  function renderSoundCheck() {
    state.stage = 'sound_check';
    savePartialSession();
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('soundTitle'))}</h2>
        <p class="lead">${escapeHtml(t('soundLead'))}</p>
        <div class="preload-box">
          <div class="preload-row">
            <span>${escapeHtml(t('preloadLabel'))}</span>
            <span id="preload-count">0 / ${allAudioPaths().length}</span>
          </div>
          <div class="progress-track" aria-hidden="true"><div id="preload-bar" class="progress-bar" style="width:0%"></div></div>
        </div>
        <div id="sound-error" class="notice error hidden"></div>
        <div class="actions">
          <button class="btn secondary" id="play-sound-check">${escapeHtml(t('playSound'))}</button>
          <button class="btn" id="sound-ok"${state.soundCheckPassed ? '' : ' disabled'}>${escapeHtml(t('soundOk'))}</button>
        </div>
      </section>`;

    bindLanguageToggle(renderSoundCheck);
    startAudioPreload();
    $('play-sound-check').addEventListener('click', async () => {
      $('sound-error').classList.add('hidden');
      try {
        await playAudio(PRACTICE_ITEMS[0]?.audio_path || ITEMS[0]?.audio_path);
        state.soundCheckPassed = true;
        $('sound-ok').disabled = false;
      } catch {
        const err = $('sound-error');
        err.textContent = t('soundError');
        err.classList.remove('hidden');
      }
    });
    $('sound-ok').addEventListener('click', renderPracticeIntro);
  }

  function renderPracticeIntro() {
    state.stage = 'practice_intro';
    savePartialSession();
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('practiceTitle'))}</h2>
        <p class="lead">${escapeHtml(t('practiceLead'))}</p>
        <div class="notice">
          <strong>${escapeHtml(t('workedTitle'))}</strong>
          <ul class="list">
            <li>${escapeHtml(t('workedAppropriate'))}</li>
            <li>${escapeHtml(t('workedInappropriate'))}</li>
          </ul>
        </div>
        <table class="summary-table">
          ${responseKeyRowsMarkup()}
        </table>
        <div class="actions">
          <button class="btn" id="start-practice">${escapeHtml(t('startPractice'))}</button>
        </div>
      </section>`;
    bindLanguageToggle(renderPracticeIntro);
    $('start-practice').addEventListener('click', () => renderTrial('practice'));
  }

  function renderMainIntro() {
    state.stage = 'main_intro';
    savePartialSession();
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('mainTitle'))}</h2>
        <p class="lead">${escapeHtml(t('mainLead'))}</p>
        <table class="summary-table">
          ${responseKeyRowsMarkup()}
        </table>
        <div class="actions">
          <button class="btn" id="start-main">${escapeHtml(t('startMain'))}</button>
        </div>
      </section>`;
    bindLanguageToggle(renderMainIntro);
    $('start-main').addEventListener('click', () => renderTrial('main'));
  }

  function currentItemsForPhase(phase) {
    return phase === 'practice' ? PRACTICE_ITEMS : state.orderedItems;
  }

  function currentIndexForPhase(phase) {
    return phase === 'practice' ? state.practiceIndex : state.trialIndex;
  }

  function responseWindowForItem(item) {
    if (state.config.mode !== 'timed') return null;
    return item.correct_answer === 'appropriate'
      ? state.config.responseWindowHit
      : state.config.responseWindowCr;
  }

  function renderTrial(phase) {
    clearTrialTimers();
    state.stage = `${phase}_trial`;
    savePartialSession();
    const items = currentItemsForPhase(phase);
    const idx = currentIndexForPhase(phase);
    const item = items[idx];

    state.activeTrial = {
      phase,
      item,
      trialNumber: idx + 1,
      audioStartedAt: null,
      audioEndedAt: null,
      audioStarting: false,
      audioAttempts: 0,
      responseOpenedAt: null,
      committed: false,
      audioError: null,
      focusEvents: [],
      invalidatedByFocusLoss: false
    };
    state.responseOpen = false;
    const progressText = phase === 'main'
      ? `${t('progressMain')} ${idx + 1} / ${items.length}`
      : `${t('progressPractice')} ${idx + 1} / ${items.length}`;

    app.innerHTML = `
      <section class="trial-shell trial-focus">
        <div class="trial-progress" aria-label="${escapeHtml(progressText)}">${escapeHtml(progressText)}</div>
        <div class="trial-center">
          <div id="fixation" class="fixation">+</div>
          <div id="status" class="status">${escapeHtml(t('getReady'))}</div>
          <button id="play-audio" class="btn secondary hidden">${escapeHtml(t('play'))}</button>
          <div id="responses" class="response-grid hidden">
            ${responseButtonsMarkup()}
          </div>
          <div id="feedback" class="feedback"></div>
        </div>
      </section>`;

    $('respond-appropriate').addEventListener('click', () => commitResponse('appropriate', 'button'));
    $('respond-inappropriate').addEventListener('click', () => commitResponse('inappropriate', 'button'));
    $('play-audio').addEventListener('click', () => beginTrialAudio());

    if (state.config.autoPlayAudio) {
      window.setTimeout(beginTrialAudio, 120);
    } else {
      $('status').textContent = t('pressPlay');
      $('play-audio').classList.remove('hidden');
      $('fixation').classList.add('hidden');
    }
  }

  async function beginTrialAudio() {
    const trial = state.activeTrial;
    if (!trial || trial.committed || trial.audioStartedAt || trial.audioStarting) return;
    trial.audioStarting = true;

    $('play-audio')?.classList.add('hidden');
    $('fixation')?.classList.remove('hidden');
    $('status').textContent = t('listen');

    const shouldShowFixation = state.config.autoPlayAudio && trial.audioAttempts === 0 && state.config.fixationMs > 0;
    if (shouldShowFixation) {
      await sleep(state.config.fixationMs);
    }
    if (!state.activeTrial || state.activeTrial.committed) {
      trial.audioStarting = false;
      return;
    }
    $('fixation')?.classList.add('hidden');
    $('status').textContent = t('listen');

    try {
      trial.audioAttempts += 1;
      trial.audioStartedAt = performance.now();
      await playAudio(trial.item.audio_path);
      trial.audioEndedAt = performance.now();
      trial.audioStarting = false;
      openResponseWindow();
    } catch (err) {
      trial.audioError = normalizeAudioError(err);
      trial.audioStarting = false;
      trial.audioStartedAt = null;
      if (trial.audioAttempts >= MAX_AUDIO_RETRIES) {
        $('status').textContent = t('audioFailed');
        commitResponse(null, 'audio_error');
        return;
      }
      $('status').textContent = t('pressPlay');
      $('play-audio').classList.remove('hidden');
    }
  }

  function openResponseWindow() {
    const trial = state.activeTrial;
    if (!trial || trial.committed) return;
    state.responseOpen = true;
    trial.responseOpenedAt = performance.now();
    $('responses')?.classList.remove('hidden');
    $('status').textContent = t('respond');

    const responseWindow = responseWindowForItem(trial.item);
    if (responseWindow) {
      state.timerId = window.setTimeout(() => {
        commitResponse(null, 'timeout');
      }, responseWindow);
    }
  }

  function commitResponse(response, modality) {
    const trial = state.activeTrial;
    if (!trial || trial.committed || (!state.responseOpen && response !== null)) return;
    trial.committed = true;
    state.responseOpen = false;
    clearTrialTimers();
    disableResponseButtons();

    const now = performance.now();
    const item = trial.item;
    const isPractice = trial.phase === 'practice';
    const timedOut = modality === 'timeout';
    const audioFailed = modality === 'audio_error';
    const rt = trial.responseOpenedAt && response !== null ? Math.round(now - trial.responseOpenedAt) : null;
    const correct = response === null ? 0 : (response === item.correct_answer ? 1 : 0);
    const responseKey = response ? keyForResponse(response) : null;
    const validForScoring = !audioFailed && !trial.invalidatedByFocusLoss;
    const row = buildResponseRow({
      phase: trial.phase,
      item,
      trialNumber: trial.trialNumber,
      response,
      correct,
      rt,
      responseKey,
      modality,
      timedOut,
      audioFailed,
      validForScoring,
      audioStartedAt: trial.audioStartedAt,
      audioEndedAt: trial.audioEndedAt,
      responseOpenedAt: trial.responseOpenedAt,
      audioError: trial.audioError,
      audioAttempts: trial.audioAttempts,
      focusEvents: trial.focusEvents,
      invalidatedByFocusLoss: trial.invalidatedByFocusLoss
    });

    if (isPractice) {
      state.practiceLog.push(row);
      showPracticeFeedback(correct, timedOut, audioFailed, item.correct_answer);
      savePartialSession();
      window.setTimeout(() => {
        state.practiceIndex += 1;
        if (state.practiceIndex < PRACTICE_ITEMS.length) {
          renderTrial('practice');
        } else {
          renderMainIntro();
        }
      }, 1400);
    } else {
      state.trialLog.push(row);
      $('feedback').textContent = '';
      savePartialSession();
      window.setTimeout(() => {
        state.trialIndex += 1;
        if (state.trialIndex < state.orderedItems.length) {
          renderTrial('main');
        } else {
          completeSession();
        }
      }, state.config.postResponseMs);
    }
  }

  function buildResponseRow(input) {
    const item = input.item;
    const responseWindow = responseWindowForItem(item);
    const base = {
      app_version: APP_VERSION,
      code_version: CODE_VERSION,
      session_id: state.sessionId,
      participant_name: state.participant.name,
      participant_id: state.participant.id,
      participant_id_raw: state.participant.id_raw || '',
      school_code: state.participant.school_code || '',
      class_code: state.participant.class_code || '',
      started_at_iso: state.startedAtIso,
      mode: state.config.mode,
      seed: state.config.seed,
      keymap_id: state.responseMapping.keymapId,
      phase: input.phase,
      trial_number: input.trialNumber,
      item_id: item.item_id || item.practice_id,
      base_id: item.base_id || '',
      word_number: item.word_number || '',
      target_word: item.target_word || '',
      item_type: item.item_type || '',
      difficulty_band: item.difficulty_band || '',
      audio_file: item.audio_file,
      correct_answer: item.correct_answer,
      response: input.response || '',
      response_key: input.responseKey || '',
      response_modality: input.modality,
      correct: input.correct,
      valid_for_scoring: input.validForScoring ? 1 : 0,
      rt_ms: input.rt,
      timed_out: input.timedOut ? 1 : 0,
      audio_failed: input.audioFailed ? 1 : 0,
      response_window_ms: responseWindow || '',
      audio_error: input.audioError || '',
      audio_attempts: input.audioAttempts || '',
      audio_started_ms: input.audioStartedAt === null || input.audioStartedAt === undefined ? '' : Math.round(input.audioStartedAt),
      audio_ended_ms: input.audioEndedAt === null || input.audioEndedAt === undefined ? '' : Math.round(input.audioEndedAt),
      audio_played_ms: input.audioStartedAt && input.audioEndedAt ? Math.round(input.audioEndedAt - input.audioStartedAt) : '',
      response_opened_ms: input.responseOpenedAt === null || input.responseOpenedAt === undefined ? '' : Math.round(input.responseOpenedAt),
      focus_loss_count: (input.focusEvents || []).filter(event => event.type === 'blur').length,
      visibility_hidden_count: (input.focusEvents || []).filter(event => event.type === 'visibility_hidden').length,
      timed_trial_invalidated: input.invalidatedByFocusLoss ? 1 : 0,
      attention_events_json: input.focusEvents?.length ? JSON.stringify(input.focusEvents) : '',
      targetword_spelling_visible_to_participant: 0
    };

    if (input.phase === 'main') {
      Object.assign(base, {
        form_position_source: item.form_position_source,
        order_position: input.trialNumber,
        discrimination: item.discrimination,
        difficulty: item.difficulty,
        p_correct_calibration: item.p_correct_calibration,
        item_rest_corr: item.item_rest_corr,
        full_theta_mean_item_info: item.full_theta_mean_item_info
      });
    }
    return base;
  }

  function showPracticeFeedback(correct, timedOut, audioFailed, answer) {
    const fb = $('feedback');
    if (!fb) return;
    fb.classList.remove('good', 'bad');
    if (audioFailed) {
      fb.textContent = t('audioFailed');
      fb.classList.add('bad');
    } else if (timedOut) {
      fb.textContent = `${t('tooLate')} ${t('correctAnswer')}: ${answerLabel(answer)}.`;
      fb.classList.add('bad');
    } else if (correct) {
      fb.textContent = t('correct');
      fb.classList.add('good');
    } else {
      fb.textContent = `${t('incorrect')} ${t('correctAnswer')}: ${answerLabel(answer)}.`;
      fb.classList.add('bad');
    }
  }

  function completeSession() {
    state.completedAtIso = new Date().toISOString();
    state.stage = 'complete';
    removePartialSession(partialStorageKey());
    state.submissionStatus = prepareSubmission();
    renderResults();
    flushQueuedSubmission();
    window.setTimeout(() => {
      if (!state.autoDownloadAttempted) {
        state.autoDownloadAttempted = true;
        downloadCsv();
      }
    }, 400);
  }

  function renderResults() {
    const showResearcherControls = canExportResearchMetadata();
    const summary = summarizeSession();
    const estimates = conversionSummary(summary);
    const accuracy = summary.n_main_scored ? summary.raw_score / summary.n_main_scored : NaN;
    const submission = submissionSettings();
    const emailQuotaNotice = submission.enabled
      ? `<div class="notice warning">${escapeHtml(t('emailQuotaNotice'))}</div>`
      : '';
    const resultEmailPanel = submission.enabled && !state.participant?.result_email
      ? `
        <div class="notice">
          <div class="field">
            <label for="result-email-final">${escapeHtml(t('resultEmail'))}</label>
            <input id="result-email-final" type="email" autocomplete="email">
            <small>${escapeHtml(t('resultEmailHelp'))}</small>
          </div>
          <div id="result-email-error" class="notice error hidden"></div>
          <div class="actions">
            <button class="btn secondary" id="send-result-email">${escapeHtml(t('sendResultEmail'))}</button>
          </div>
        </div>
      `
      : '';
    app.innerHTML = `${participantTopbar()}
      <section class="panel">
        <h2 class="section-title">${escapeHtml(t('completeTitle'))}</h2>
        <p class="lead">${escapeHtml(t('completeLead'))}</p>
        <div class="result-grid">
          <div class="result-card">
            <span>${escapeHtml(t('rawScore'))}</span>
            <strong>${summary.raw_score} / ${summary.n_main_scored}</strong>
          </div>
          <div class="result-card">
            <span>${escapeHtml(t('accuracy'))}</span>
            <strong>${escapeHtml(formatPercent(accuracy))}</strong>
          </div>
          <div class="result-card">
            <span>${escapeHtml(t('toeicPrediction'))}</span>
            <strong>${escapeHtml(estimates.toeicLabel)}</strong>
          </div>
          <div class="result-card">
            <span>${escapeHtml(t('cefrReference'))}</span>
            <strong>${escapeHtml(estimates.cefrLabel)}</strong>
          </div>
        </div>
        <p class="disclaimer">${escapeHtml(t('disclaimer'))}</p>
        <div class="notice success">${escapeHtml(t('recorded'))}</div>
        <div id="submission-status" class="notice ${escapeHtml(submissionNoticeClass())}">${escapeHtml(submissionStatusText())}</div>
        ${emailQuotaNotice}
        ${resultEmailPanel}
        <div class="actions">
          <button class="btn" id="download-csv">${escapeHtml(t('downloadCsv'))}</button>
          <button class="btn secondary" id="download-json">${escapeHtml(t('downloadJson'))}</button>
          <button class="btn secondary${submissionCanRetry() ? '' : ' hidden'}" id="retry-submit">${escapeHtml(t('retrySubmission'))}</button>
          ${showResearcherControls ? `<button class="btn ghost" id="new-session">${escapeHtml(t('newSession'))}</button>` : ''}
        </div>
      </section>`;
    bindLanguageToggle(renderResults);
    $('download-csv').addEventListener('click', downloadCsv);
    $('download-json').addEventListener('click', downloadJson);
    const sendResultEmail = $('send-result-email');
    if (sendResultEmail) {
      sendResultEmail.addEventListener('click', () => {
        const email = $('result-email-final')?.value.trim() || '';
        const err = $('result-email-error');
        if (!email || !isValidEmailAddress(email)) {
          err.textContent = t('emailInvalid');
          err.classList.remove('hidden');
          return;
        }
        err.classList.add('hidden');
        state.participant.result_email = email;
        state.participant.request_result_email = 1;
        state.submissionStatus = prepareSubmission();
        updateSubmissionStatusUi();
        sendResultEmail.disabled = true;
        flushQueuedSubmission();
      });
    }
    $('retry-submit').addEventListener('click', () => {
      state.submissionStatus = { state: 'queued' };
      updateSubmissionStatusUi();
      flushQueuedSubmission();
    });
    if (showResearcherControls) {
      $('new-session').addEventListener('click', () => {
        state.autoDownloadAttempted = false;
        renderParticipantRegistration();
      });
    }
  }

  function submissionStatusText() {
    const status = state.submissionStatus || { state: 'not_configured' };
    if (status.state === 'attempted') return t('submissionAttempted');
    if (status.state === 'failed') return t('submissionFailed');
    if (status.state === 'no_recipient') return t('submissionNoRecipient');
    if (status.state === 'queued') return t('submissionQueued');
    return t('submissionNotConfigured');
  }

  function submissionNoticeClass() {
    const status = state.submissionStatus || { state: 'not_configured' };
    if (status.state === 'attempted') return 'warning';
    if (status.state === 'failed') return 'error';
    if (status.state === 'no_recipient') return 'warning';
    if (status.state === 'queued') return 'warning';
    return 'warning';
  }

  function submissionCanRetry() {
    const status = state.submissionStatus || {};
    return submissionSettings().enabled &&
      (status.state === 'queued' || status.state === 'failed' || status.state === 'attempted') &&
      hasRetryableSubmission();
  }

  function updateSubmissionStatusUi() {
    const status = $('submission-status');
    if (status) {
      status.classList.remove('success', 'warning', 'error');
      status.classList.add(submissionNoticeClass());
      status.textContent = submissionStatusText();
    }
    const retry = $('retry-submit');
    if (retry) {
      retry.classList.toggle('hidden', !submissionCanRetry());
    }
  }

  function flushQueuedSubmission() {
    if (state.submissionStatus?.state !== 'queued') return;
    attemptFlushSubmissionQueue().then(status => {
      if (status) {
        state.submissionStatus = status;
        updateSubmissionStatusUi();
      }
    });
  }

  function summarizeSession() {
    const main = state.trialLog;
    const scoredMain = main.filter(row => Number(row.valid_for_scoring) !== 0);
    const appRows = scoredMain.filter(row => row.correct_answer === 'appropriate');
    const inappRows = scoredMain.filter(row => row.correct_answer === 'inappropriate');
    return {
      n_practice: state.practiceLog.length,
      n_main: main.length,
      n_main_scored: scoredMain.length,
      n_main_excluded: main.length - scoredMain.length,
      raw_score: sum(scoredMain, 'correct'),
      n_appropriate: appRows.length,
      appropriate_score: sum(appRows, 'correct'),
      n_inappropriate: inappRows.length,
      inappropriate_score: sum(inappRows, 'correct'),
      timeouts: main.filter(row => Number(row.timed_out) === 1).length
    };
  }

  function conversionSummary(summary) {
    const converter = window.LJT_SHORT_CONVERSION;
    const output = {
      toeic_listening_predicted: '',
      toeic_status: 'coming_soon',
      cefr_reference: '',
      toeicLabel: t('comingSoon'),
      cefrLabel: t('cefrUnavailable')
    };

    if (!converter || typeof converter.estimateToeicListening !== 'function') return output;
    const toeic = converter.estimateToeicListening({
      rawScore: summary.raw_score,
      nItems: summary.n_main_scored,
      mode: state.config.mode
    });
    if (!toeic || !toeic.available) return output;

    const numericScore = Number(toeic.score);
    const toeicLabel = toeic.toeicRange
      || toeic.scoreRange
      || (Number.isFinite(numericScore) ? String(Math.round(numericScore)) : '');
    if (!toeicLabel) return output;

    output.toeic_listening_predicted = toeicLabel;
    output.toeic_status = toeic.status || 'estimated';
    output.toeicLabel = String(toeicLabel);

    const cefr = toeic.cefr
      || toeic.cefrRange
      || (
        Number.isFinite(numericScore) && typeof converter.cefrFromToeicListening === 'function'
          ? converter.cefrFromToeicListening(numericScore)
          : ''
      );
    if (cefr) {
      output.cefr_reference = cefr;
      output.cefrLabel = cefr;
    }
    return output;
  }

  function sum(rows, key) {
    return rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
  }

  function sessionPayload() {
    const summary = summarizeSession();
    const estimates = conversionSummary(summary);
    return {
      app_version: APP_VERSION,
      code_version: CODE_VERSION,
      completed_at_iso: state.completedAtIso,
      settings: {
        ...state.config,
        research_code: normalizeResearchCode(state.config.researchCode) || '',
        targetword_spelling_visible_to_participant: false,
        fixed_form_length: ITEMS.length,
        practice_length: PRACTICE_ITEMS.length
      },
      participant: state.participant,
      session_id: state.sessionId,
      started_at_iso: state.startedAtIso,
      research_mode: isResearchMode(),
      researcher_code: normalizeResearchCode(state.config.researchCode) || '',
      source_url: window.location.href,
      environment: getEnvironmentSnapshot(),
      response_mapping: state.responseMapping,
      order_diagnostics: state.orderDiagnostics,
      summary: {
        ...summary,
        toeic_listening_predicted: estimates.toeic_listening_predicted,
        toeic_status: estimates.toeic_status,
        cefr_reference: estimates.cefr_reference
      },
      practice_log: state.practiceLog,
      trial_log: state.trialLog
    };
  }

  function prepareSubmission() {
    const settings = submissionSettings();
    if (!settings.enabled) return { state: 'not_configured' };
    if (!state.participant?.result_email) return { state: 'no_recipient' };
    const payload = {
      schema_version: 1,
      submitted_from_app_at_iso: new Date().toISOString(),
      researcher_code: normalizeResearchCode(state.config.researchCode) || settings.publicResearchCode,
      app_url: window.location.href,
      session: participantSafeSessionPayload(sessionPayload(), { preserveResultEmail: true })
    };
    const queued = enqueueSubmission(payload);
    return queued ? { state: 'queued' } : { state: 'failed' };
  }

  function enqueueSubmission(payload) {
    try {
      const queue = readSubmissionQueue();
      const id = payload.session?.session_id || createSessionId();
      const existing = queue.findIndex(item => item.id === id);
      const item = {
        id,
        created_at_iso: new Date().toISOString(),
        attempts: 0,
        last_attempt_at_iso: '',
        last_error: '',
        payload
      };
      if (existing >= 0) {
        queue[existing] = { ...queue[existing], payload };
      } else {
        queue.push(item);
      }
      writeSubmissionQueue(queue);
      return true;
    } catch {
      return false;
    }
  }

  function readSubmissionQueue() {
    try {
      const raw = localStorage.getItem(SUBMISSION_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      return Array.isArray(queue) ? queue : [];
    } catch {
      return [];
    }
  }

  function hasRetryableSubmission() {
    const settings = submissionSettings();
    return readSubmissionQueue().some(item => Number(item.attempts || 0) < settings.maxRetries);
  }

  function writeSubmissionQueue(queue) {
    localStorage.setItem(SUBMISSION_QUEUE_KEY, JSON.stringify(queue));
  }

  async function attemptFlushSubmissionQueue() {
    if (state.submissionFlushPromise) return state.submissionFlushPromise;
    state.submissionFlushPromise = flushSubmissionQueue();
    try {
      return await state.submissionFlushPromise;
    } finally {
      state.submissionFlushPromise = null;
    }
  }

  async function flushSubmissionQueue() {
    const settings = submissionSettings();
    if (!settings.enabled) return { state: 'not_configured' };
    let queue = readSubmissionQueue();
    if (!queue.length) return { state: 'attempted' };

    const remaining = [];
    let attemptedCount = 0;
    let failedCount = 0;
    for (const item of queue) {
      if (item.attempts >= settings.maxRetries) {
        failedCount += 1;
        continue;
      }
      const nextItem = {
        ...item,
        attempts: Number(item.attempts || 0) + 1,
        last_attempt_at_iso: new Date().toISOString()
      };
      try {
        await postSubmission(settings.endpoint, nextItem.payload);
        attemptedCount += 1;
      } catch (err) {
        failedCount += 1;
        if (nextItem.attempts < settings.maxRetries) {
          remaining.push({
            ...nextItem,
            last_error: String(err && err.message ? err.message : err)
          });
        }
      }
    }

    try {
      writeSubmissionQueue(remaining);
    } catch {
      return { state: 'failed' };
    }
    if (attemptedCount > 0) return { state: 'attempted', attemptedCount };
    return failedCount > 0 ? { state: 'failed' } : { state: 'attempted' };
  }

  async function postSubmission(endpoint, payload) {
    if (!endpoint) throw new Error('Submission endpoint is not configured');
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  }

  function downloadCsv() {
    const rows = [
      ...state.practiceLog,
      ...state.trialLog
    ];
    const summary = summarizeSession();
    const estimates = conversionSummary(summary);
    const environment = getEnvironmentSnapshot();
    const withSummary = rows.map(row => ({
      ...row,
      completed_at_iso: state.completedAtIso,
      main_raw_score: summary.raw_score,
      main_n_items: summary.n_main_scored,
      main_n_administered: summary.n_main,
      main_n_excluded: summary.n_main_excluded,
      main_accuracy: summary.n_main_scored ? round(summary.raw_score / summary.n_main_scored, 4) : '',
      appropriate_score: summary.appropriate_score,
      inappropriate_score: summary.inappropriate_score,
      main_timeouts: summary.timeouts,
      toeic_listening_predicted: estimates.toeic_listening_predicted,
      toeic_status: estimates.toeic_status,
      cefr_reference: estimates.cefr_reference,
      researcher_code: normalizeResearchCode(state.config.researchCode) || '',
      user_agent: environment.user_agent,
      viewport_width: environment.viewport_width,
      viewport_height: environment.viewport_height,
      screen_width: environment.screen_width,
      screen_height: environment.screen_height,
      pointer_coarse: environment.pointer_coarse,
      pointer_fine: environment.pointer_fine,
      in_iframe: environment.in_iframe,
      order_max_answer_run: state.orderDiagnostics.maxObservedRun,
      order_same_word_gap_used: state.orderDiagnostics.sameWordGapUsed,
      order_attempts: state.orderDiagnostics.attempts
    }));
    const exportRows = shouldUseParticipantSafeCsv() ? withSummary.map(stripParticipantCsvMetadata) : withSummary;
    downloadText(filenameBase() + '_trials.csv', '\ufeff' + toCsv(exportRows), 'text/csv;charset=utf-8');
  }

  function downloadJson() {
    const payload = shouldUseParticipantSafeCsv() ? participantSafeSessionPayload(sessionPayload()) : sessionPayload();
    downloadText(filenameBase() + '_session.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  }

  function filenameBase() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const id = sanitizeFilename(state.participant?.id || 'participant');
    return `LJT-S_${id}_${state.config.mode}_${stamp}`;
  }

  function sanitizeFilename(value) {
    return String(value || '')
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'participant';
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    const headers = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach(key => set.add(key));
      return set;
    }, new Set()));
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map(h => csvCell(row[h])).join(','));
    }
    return lines.join('\n') + '\n';
  }

  function stripParticipantCsvMetadata(row) {
    const output = Object.fromEntries(
      Object.entries(row).filter(([key]) => !PARTICIPANT_CSV_OMIT_KEYS.has(key))
    );
    output.item_id = neutralItemId(row);
    output.audio_file = neutralAudioId(row);
    if ('base_id' in output) delete output.base_id;
    return output;
  }

  function participantSafeSessionPayload(payload, options = {}) {
    const safe = JSON.parse(JSON.stringify(payload));
    if (safe.participant) {
      if (!options.preserveResultEmail) {
        safe.participant.result_email = safe.participant.result_email ? '[redacted]' : '';
      }
    }
    safe.practice_log = (safe.practice_log || []).map(stripParticipantCsvMetadata);
    safe.trial_log = (safe.trial_log || []).map(stripParticipantCsvMetadata);
    safe.ordered_items = (safe.ordered_items || []).map((item, index) => ({
      item_id: `main_${String(index + 1).padStart(3, '0')}`,
      order_position: index + 1
    }));
    safe.order_diagnostics = safe.order_diagnostics || {};
    return safe;
  }

  function neutralItemId(row) {
    const prefix = row.phase === 'practice' ? 'practice' : 'main';
    const number = String(row.trial_number || '').padStart(3, '0');
    return `${prefix}_${number}`;
  }

  function neutralAudioId(row) {
    const prefix = row.phase === 'practice' ? 'practice_audio' : 'main_audio';
    const number = String(row.trial_number || '').padStart(3, '0');
    return `${prefix}_${number}`;
  }

  function csvCell(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function playAudio(path) {
    const audio = getAudioElement();
    if (state.audioStop) state.audioStop(new Error('Playback interrupted'));
    audio.pause();
    try {
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // Some browsers ignore load/reset calls before a new source is attached.
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      let watchdogId = null;
      let stalledId = null;
      const cleanup = () => {
        window.clearTimeout(watchdogId);
        window.clearTimeout(stalledId);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('stalled', onStalled);
        audio.removeEventListener('playing', onProgress);
        audio.removeEventListener('timeupdate', onProgress);
        state.audioStop = null;
      };
      const finish = error => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const onEnded = () => finish(null);
      const onError = () => finish(new Error('audio_load_error'));
      const onStalled = () => {
        window.clearTimeout(stalledId);
        stalledId = window.setTimeout(() => finish(new Error('audio_stalled')), 4000);
      };
      const onProgress = () => {
        window.clearTimeout(stalledId);
      };
      state.audioStop = error => finish(error || new Error('Playback interrupted'));
      audio.preload = 'auto';
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      audio.addEventListener('stalled', onStalled);
      audio.addEventListener('playing', onProgress);
      audio.addEventListener('timeupdate', onProgress);
      watchdogId = window.setTimeout(() => finish(new Error('audio_watchdog_timeout')), AUDIO_WATCHDOG_MS);
      audio.src = path;
      try {
        audio.currentTime = 0;
      } catch {
        // Some mobile browsers disallow currentTime before metadata is ready.
      }
      try {
        audio.load();
      } catch {
        // play() below is still the authoritative attempt.
      }
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(finish);
      }
    });
  }

  function getAudioElement() {
    if (!state.audio) {
      state.audio = new Audio();
      state.audio.preload = 'auto';
    }
    return state.audio;
  }

  function normalizeAudioError(err) {
    const message = String(err && err.message ? err.message : err || '');
    if (message.includes('watchdog')) return 'audio_watchdog_timeout';
    if (message.includes('stalled')) return 'audio_stalled';
    if (message.includes('load')) return 'audio_load_error';
    if (message.includes('interrupted')) return 'playback_interrupted';
    return message.replace(/audio\/[^\s"']+/g, '[audio_file]').slice(0, 120) || 'audio_error';
  }

  function startAudioPreload() {
    if (state.preload?.started) {
      updatePreloadProgress();
      return;
    }
    const paths = allAudioPaths();
    state.preload = {
      started: true,
      total: paths.length,
      loaded: 0,
      failed: []
    };
    state.audioPreloadRefs = [];
    updatePreloadProgress();
    paths.forEach(path => {
      const audio = new Audio();
      let done = false;
      const settle = ok => {
        if (done) return;
        done = true;
        state.preload.loaded += 1;
        if (!ok) state.preload.failed.push(path);
        updatePreloadProgress();
      };
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => settle(true), { once: true });
      audio.addEventListener('loadeddata', () => settle(true), { once: true });
      audio.addEventListener('error', () => settle(false), { once: true });
      audio.src = path;
      state.audioPreloadRefs.push(audio);
      try {
        audio.load();
      } catch {
        settle(false);
      }
    });
  }

  function updatePreloadProgress() {
    const preload = state.preload;
    if (!preload) return;
    const total = preload.total || allAudioPaths().length || 1;
    const loaded = Math.min(preload.loaded || 0, total);
    const pct = Math.round((loaded / total) * 100);
    const count = $('preload-count');
    const bar = $('preload-bar');
    if (count) count.textContent = `${loaded} / ${total}`;
    if (bar) bar.style.width = `${pct}%`;
  }

  function clearTrialTimers() {
    if (state.timerId) {
      window.clearTimeout(state.timerId);
      state.timerId = null;
    }
    if (state.audio) {
      state.audio.pause();
    }
    if (state.audioStop) state.audioStop(new Error('Playback interrupted'));
  }

  function disableResponseButtons() {
    ['respond-appropriate', 'respond-inappropriate'].forEach(id => {
      const btn = $(id);
      if (btn) btn.disabled = true;
    });
  }

  function keyForResponse(response) {
    return response === 'appropriate'
      ? state.responseMapping.appropriateKey
      : state.responseMapping.inappropriateKey;
  }

  function answerLabel(answer) {
    return answer === 'appropriate' ? t('appropriate') : t('inappropriate');
  }

  function responseKeyRowsMarkup() {
    return ['F', 'J'].map(key => `
      <tr><th>${escapeHtml(key)}</th><td>${escapeHtml(answerLabel(state.responseMapping[key]))}</td></tr>
    `).join('');
  }

  function responseButtonsMarkup() {
    return ['F', 'J'].map(key => {
      const response = state.responseMapping[key];
      const className = response === 'appropriate' ? 'yes' : 'no';
      return `
        <button class="btn ${className}" id="respond-${escapeHtml(response)}">
          <span class="key">${escapeHtml(key)}</span>${escapeHtml(answerLabel(response))}
        </button>
      `;
    }).join('');
  }

  function makeResponseMapping(keymap, participantId, seed) {
    let fAppropriate = keymap === 'f_appropriate';
    if (keymap === 'counterbalanced') {
      fAppropriate = hashString(`${seed}|${participantId}|keymap`) % 2 === 0;
    }
    return fAppropriate
      ? {
          keymapId: 'F_appropriate_J_inappropriate',
          F: 'appropriate',
          J: 'inappropriate',
          appropriateKey: 'F',
          inappropriateKey: 'J'
        }
      : {
          keymapId: 'F_inappropriate_J_appropriate',
          F: 'inappropriate',
          J: 'appropriate',
          appropriateKey: 'J',
          inappropriateKey: 'F'
        };
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (key === 'f' || key === 'j') {
      if (!state.responseOpen) return;
      event.preventDefault();
      const response = state.responseMapping[key.toUpperCase()];
      commitResponse(response, 'keyboard');
    } else if (key === ' ' || key === 'enter') {
      const play = $('play-audio');
      if (play && !play.classList.contains('hidden')) {
        event.preventDefault();
        beginTrialAudio();
      }
    }
  }

  function recordAttentionEvent(type) {
    const trial = state.activeTrial;
    if (!trial || trial.committed) return;
    const duringResponse = state.responseOpen;
    const duringAudio = Boolean(trial.audioStartedAt && !trial.audioEndedAt);
    if (!duringResponse && !duringAudio) return;
    const event = {
      type,
      phase: duringAudio ? 'audio' : 'response',
      perf_ms: Math.round(performance.now()),
      trial_elapsed_ms: trial.responseOpenedAt
        ? Math.round(performance.now() - trial.responseOpenedAt)
        : Math.round(performance.now() - trial.audioStartedAt)
    };
    trial.focusEvents.push(event);
    if (trial.phase === 'main' && state.config.mode === 'timed') {
      trial.invalidatedByFocusLoss = true;
    }
  }

  function shouldGuardUnload() {
    return Boolean(
      state.sessionId &&
      !state.completedAtIso &&
      (state.activeTrial || state.practiceLog.length || state.trialLog.length)
    );
  }

  function buildConstrainedOrder(items, seed, maxRun, requestedGap) {
    const rng = mulberry32(hashString(seed));
    const appropriate = items.filter(item => item.correct_answer === 'appropriate');
    const inappropriate = items.filter(item => item.correct_answer === 'inappropriate');
    let best = null;
    for (let gap = requestedGap; gap >= 0; gap -= 1) {
      for (let attempt = 1; attempt <= 3000; attempt += 1) {
        const pattern = randomAnswerPattern(appropriate.length, inappropriate.length, rng, maxRun);
        if (!pattern) continue;
        const appItems = shuffle(appropriate.map((item, index) => ({ ...item, order_uid: `${item.item_id}_${index}` })), rng);
        const inappItems = shuffle(inappropriate.map((item, index) => ({ ...item, order_uid: `${item.item_id}_${index}` })), rng);
        let appIndex = 0;
        let inappIndex = 0;
        const candidate = pattern.map(answer => {
          if (answer === 'appropriate') {
            const item = appItems[appIndex];
            appIndex += 1;
            return item;
          }
          const item = inappItems[inappIndex];
          inappIndex += 1;
          return item;
        });
        const diagnostics = diagnoseOrder(candidate, maxRun, gap, attempt);
        if (diagnostics.maxObservedRun <= maxRun && diagnostics.sameWordGapViolations === 0) {
          diagnostics.sameWordGapRequested = requestedGap;
          diagnostics.sameWordGapUsed = gap;
          diagnostics.status = gap === requestedGap ? 'requested_constraints_satisfied' : 'gap_relaxed';
          return { items: candidate, diagnostics };
        }
        if (!best || diagnostics.score < best.diagnostics.score) {
          best = { items: candidate, diagnostics: { ...diagnostics, sameWordGapUsed: gap } };
        }
      }
    }
    best.diagnostics.sameWordGapRequested = requestedGap;
    best.diagnostics.status = 'fallback_best_available';
    return best;
  }

  function randomAnswerPattern(nAppropriate, nInappropriate, rng, maxRun) {
    const counts = { appropriate: nAppropriate, inappropriate: nInappropriate };
    const pattern = [];
    let last = null;
    let run = 0;
    const total = nAppropriate + nInappropriate;

    for (let slot = 0; slot < total; slot += 1) {
      const choices = ['appropriate', 'inappropriate'].filter(answer => {
        if (counts[answer] <= 0) return false;
        return !(answer === last && run >= maxRun);
      });
      if (!choices.length) return null;

      const totalWeight = choices.reduce((acc, answer) => acc + counts[answer], 0);
      let pick = rng() * totalWeight;
      let chosen = choices[choices.length - 1];
      for (const answer of choices) {
        pick -= counts[answer];
        if (pick <= 0) {
          chosen = answer;
          break;
        }
      }

      pattern.push(chosen);
      counts[chosen] -= 1;
      if (chosen === last) {
        run += 1;
      } else {
        last = chosen;
        run = 1;
      }
    }
    return pattern;
  }

  function diagnoseOrder(items, maxRun, gap, attempts) {
    let maxObservedRun = 0;
    let run = 0;
    let lastAnswer = null;
    let sameWordGapViolations = 0;
    const lastSeen = new Map();

    items.forEach((item, index) => {
      if (item.correct_answer === lastAnswer) {
        run += 1;
      } else {
        run = 1;
        lastAnswer = item.correct_answer;
      }
      maxObservedRun = Math.max(maxObservedRun, run);
      const word = String(item.target_word || '').toLowerCase();
      if (lastSeen.has(word) && index - lastSeen.get(word) <= gap) {
        sameWordGapViolations += 1;
      }
      lastSeen.set(word, index);
    });

    const score = Math.max(0, maxObservedRun - maxRun) * 100 + sameWordGapViolations * 10;
    return { maxObservedRun, sameWordGapViolations, attempts, score };
  }

  function shuffle(values, rng) {
    const arr = values.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function hashString(value) {
    let h = 2166136261;
    const s = String(value);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function rng() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createSessionId() {
    const random = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `ljts_${time}_${random}`;
  }

  function indexOfItem(collection, item) {
    if (!item) return -1;
    return collection.findIndex(candidate => candidate === item || candidate.item_id === item.item_id);
  }

  function toPartialResponseRow(row, phase) {
    const safe = stripParticipantCsvMetadata(row);
    const source = phase === 'practice' ? PRACTICE_ITEMS : ITEMS;
    const itemIndex = indexOfItem(source, row);
    if (itemIndex >= 0) safe.item_index = itemIndex;
    safe.partial_schema = 1;
    return safe;
  }

  function inflatePartialResponseRow(row, phase, orderedItems) {
    if (row.correct_answer && row.target_word) {
      return {
        ...row,
        audio_error: normalizeAudioError(row.audio_error)
      };
    }
    const trialNumber = Number(row.trial_number || 0);
    const item = phase === 'practice'
      ? PRACTICE_ITEMS[Number(row.item_index)] || PRACTICE_ITEMS[trialNumber - 1]
      : orderedItems[trialNumber - 1] || ITEMS[Number(row.item_index)];
    if (!item) return row;
    const focusEvents = parseAttentionEvents(row.attention_events_json);
    return buildResponseRow({
      phase,
      item,
      trialNumber,
      response: row.response || null,
      correct: Number(row.correct || 0),
      rt: optionalNumber(row.rt_ms),
      responseKey: row.response_key || '',
      modality: row.response_modality || '',
      timedOut: Number(row.timed_out || 0) === 1,
      audioFailed: Number(row.audio_failed || 0) === 1,
      validForScoring: Number(row.valid_for_scoring) !== 0,
      audioStartedAt: optionalNumber(row.audio_started_ms),
      audioEndedAt: optionalNumber(row.audio_ended_ms),
      responseOpenedAt: optionalNumber(row.response_opened_ms),
      audioError: normalizeAudioError(row.audio_error),
      audioAttempts: row.audio_attempts || '',
      focusEvents,
      invalidatedByFocusLoss: Number(row.timed_trial_invalidated || 0) === 1
    });
  }

  function parseAttentionEvents(value) {
    if (!value) return [];
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function optionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function rememberRecentParticipantId(idRaw) {
    try {
      const value = String(idRaw || '').trim();
      if (value) localStorage.setItem(STORAGE_RECENT_ID_KEY, value);
    } catch {
      // Best-effort only.
    }
  }

  function readRecentParticipantId() {
    try {
      return localStorage.getItem(STORAGE_RECENT_ID_KEY) || '';
    } catch {
      return '';
    }
  }

  function savePartialSession() {
    if (!state.participant || !state.sessionId) return;
    const key = partialStorageKey();
    const snapshot = {
      saved_at_iso: new Date().toISOString(),
      app_version: APP_VERSION,
      session_id: state.sessionId,
      config: state.config,
      participant: state.participant,
      mode: state.config.mode,
      session_started_at_iso: state.startedAtIso,
      started_at_iso: state.startedAtIso,
      response_mapping: state.responseMapping,
      ordered_item_indices: state.orderedItems.map(item => indexOfItem(ITEMS, item)),
      order_diagnostics: state.orderDiagnostics,
      practice_log: state.practiceLog.map(row => toPartialResponseRow(row, 'practice')),
      trial_log: state.trialLog.map(row => toPartialResponseRow(row, 'main')),
      stage: state.stage,
      ui_lang: state.uiLang,
      started_from_researcher_setup: state.startedFromResearcherSetup,
      environment: getEnvironmentSnapshot()
    };
    try {
      localStorage.setItem(key, JSON.stringify(snapshot));
      localStorage.setItem(STORAGE_LAST_KEY, key);
      rememberRecentParticipantId(state.participant.id_raw || state.participant.id);
    } catch {
      // Local storage is best-effort only.
    }
  }

  function partialStorageKey() {
    if (state.currentPartialKey) return state.currentPartialKey;
    return partialStorageKeyForParticipant(state.participant?.id || state.sessionId || 'none');
  }

  function partialStorageKeyForParticipant(participantId) {
    return `${STORAGE_PREFIX}${normalizeParticipantId(participantId) || 'none'}`;
  }

  function getLatestPartialSession() {
    const snapshots = [];
    try {
      const lastKey = localStorage.getItem(STORAGE_LAST_KEY);
      const keys = new Set();
      if (lastKey) keys.add(lastKey);
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) keys.add(key);
      }
      keys.forEach(key => {
        const snapshot = parsePartialSnapshot(localStorage.getItem(key), key);
        if (snapshot) snapshots.push(snapshot);
      });
    } catch {
      return null;
    }
    snapshots.sort((a, b) => String(b.saved_at_iso || '').localeCompare(String(a.saved_at_iso || '')));
    return snapshots[0] || null;
  }

  function getPartialSessionForParticipantId(participantId) {
    const normalized = normalizeParticipantId(participantId);
    if (!normalized) return null;
    try {
      const snapshot = parsePartialSnapshot(
        localStorage.getItem(partialStorageKeyForParticipant(normalized)),
        partialStorageKeyForParticipant(normalized)
      );
      if (snapshot) return snapshot;
    } catch {
      return null;
    }
    return null;
  }

  function parsePartialSnapshot(raw, storageKey) {
    if (!raw) return null;
    try {
      const snapshot = JSON.parse(raw);
      if (!snapshot || snapshot.app_version !== APP_VERSION || !snapshot.session_id || !snapshot.participant) return null;
      return {
        ...snapshot,
        storage_key: storageKey,
        practice_log: Array.isArray(snapshot.practice_log) ? snapshot.practice_log : [],
        trial_log: Array.isArray(snapshot.trial_log) ? snapshot.trial_log : [],
        ordered_items: Array.isArray(snapshot.ordered_items) ? snapshot.ordered_items : [],
        ordered_item_indices: Array.isArray(snapshot.ordered_item_indices) ? snapshot.ordered_item_indices : []
      };
    } catch {
      return null;
    }
  }

  function restorePartialSession(snapshot) {
    state.config = {
      ...DEFAULTS,
      ...(snapshot.config || {})
    };
    state.participant = snapshot.participant;
    state.sessionId = snapshot.session_id;
    state.startedAtIso = snapshot.started_at_iso || snapshot.session_started_at_iso || new Date().toISOString();
    state.completedAtIso = snapshot.completed_at_iso || null;
    state.responseMapping = snapshot.response_mapping || makeResponseMapping(state.config.keymap, state.participant.id, state.config.seed);
    state.orderedItems = snapshot.ordered_item_indices.length
      ? snapshot.ordered_item_indices.map(index => ITEMS[Number(index)]).filter(Boolean)
      : snapshot.ordered_items.length
      ? snapshot.ordered_items
      : buildConstrainedOrder(
          ITEMS,
          `${state.config.seed}|${state.participant.id}|${state.config.mode}|${APP_VERSION}`,
          state.config.maxAnswerRun,
          state.config.sameWordGap
        ).items;
    state.orderDiagnostics = snapshot.order_diagnostics || diagnoseOrder(state.orderedItems, state.config.maxAnswerRun, state.config.sameWordGap, 0);
    state.practiceLog = snapshot.practice_log.map(row => inflatePartialResponseRow(row, 'practice', state.orderedItems));
    state.trialLog = snapshot.trial_log.map(row => inflatePartialResponseRow(row, 'main', state.orderedItems));
    state.practiceIndex = Math.min(state.practiceLog.length, PRACTICE_ITEMS.length);
    state.trialIndex = Math.min(state.trialLog.length, state.orderedItems.length);
    state.activeTrial = null;
    state.responseOpen = false;
    state.currentPartialKey = snapshot.storage_key || partialStorageKeyForParticipant(state.participant.id);
    state.startedFromResearcherSetup = snapshot.started_from_researcher_setup === true;
    state.uiLang = snapshot.ui_lang === 'ja' ? 'ja' : UI_LANG_DEFAULT;
    document.documentElement.lang = state.uiLang;
    state.stage = snapshot.stage || null;
    savePartialSession();

    if (state.stage === 'sound_check') {
      renderSoundCheck();
    } else if (state.stage === 'practice_intro') {
      renderPracticeIntro();
    } else if (state.stage === 'main_intro') {
      renderMainIntro();
    } else if (state.practiceIndex < PRACTICE_ITEMS.length) {
      renderTrial('practice');
    } else if (state.trialIndex < state.orderedItems.length) {
      renderTrial('main');
    } else {
      completeSession();
    }
  }

  function removePartialSession(key) {
    try {
      const removeKey = key || partialStorageKey();
      localStorage.removeItem(removeKey);
      if (localStorage.getItem(STORAGE_LAST_KEY) === removeKey) {
        localStorage.removeItem(STORAGE_LAST_KEY);
      }
    } catch {
      // Local storage is best-effort only.
    }
  }

  function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function round(value, digits) {
    const scale = Math.pow(10, digits);
    return Math.round(value * scale) / scale;
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('blur', () => recordAttentionEvent('blur'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') recordAttentionEvent('visibility_hidden');
  });
  window.addEventListener('beforeunload', event => {
    if (shouldGuardUnload()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  window.addEventListener('pagehide', () => clearTrialTimers());
  attemptFlushSubmissionQueue().catch(() => {});
  renderInitial();
})();
