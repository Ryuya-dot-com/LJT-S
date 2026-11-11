window.LJT_PUBLIC = {
  long: false,
  items: window.LJT_SHORT_ITEMS.map(item => ({ ...item, audio_path: '../' + item.audio_path, reference: true })),
  practice: window.LJT_SHORT_PRACTICE_ITEMS.map(item => ({ ...item, audio_path: '../' + item.audio_path })),
  order: window.LJT_PUBLIC_ORDER
};
