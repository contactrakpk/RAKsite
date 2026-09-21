const isLocalDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

window.RAK_API_URL = window.RAK_API_URL || (
  isLocalDevelopment
    ? 'http://localhost:8787'
    : ''
);

window.RAK_SUPABASE_URL = window.RAK_SUPABASE_URL || 'https://yhrxpmglucstpoyddkwy.supabase.co';
window.RAK_SUPABASE_ANON_KEY = window.RAK_SUPABASE_ANON_KEY || 'sb_publishable_5kbTdqFWfjasOampdLwNEA_XLEwPtxf';