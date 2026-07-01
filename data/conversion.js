window.LJT_SHORT_CONVERSION = (() => {
  'use strict';

  const TOEIC_LISTENING_COEFFICIENTS = {
    timed: null,
    untimed: null
  };

  const CEFR_LISTENING_CUTS = [
    { level: 'C1', min: 490 },
    { level: 'B2', min: 400 },
    { level: 'B1', min: 275 },
    { level: 'A2', min: 110 },
    { level: 'A1', min: 60 }
  ];

  function estimateToeicListening({ rawScore, nItems, mode }) {
    const coefficients = TOEIC_LISTENING_COEFFICIENTS[mode] || null;
    if (!coefficients) {
      return {
        available: false,
        status: 'coming_soon'
      };
    }

    const raw = Number(rawScore);
    const n = Number(nItems);
    if (!Number.isFinite(raw) || !Number.isFinite(n) || n <= 0) {
      return {
        available: false,
        status: 'invalid_input'
      };
    }

    const accuracy = raw / n;
    const score = coefficients.intercept + coefficients.raw_score * raw + coefficients.accuracy * accuracy;
    return {
      available: true,
      status: 'estimated',
      score: clamp(score, 5, 495)
    };
  }

  function cefrFromToeicListening(score) {
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore)) return '';
    const match = CEFR_LISTENING_CUTS.find(cut => numericScore >= cut.min);
    return match ? match.level : 'Below A1';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return {
    estimateToeicListening,
    cefrFromToeicListening,
    TOEIC_LISTENING_COEFFICIENTS,
    CEFR_LISTENING_CUTS
  };
})();
