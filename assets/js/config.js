const hostname = window.location.hostname || '';
const isLocalDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
const isPagesDev = hostname.includes('raksite.pages.dev');
const productionApiUrl = 'https://raksite-api.onrender.com';

window.RAK_API_URL = window.RAK_API_URL || (
  isLocalDevelopment
    ? 'http://localhost:8787'
    : (isPagesDev ? productionApiUrl : productionApiUrl)
);

window.API_BASE_URL = window.API_BASE_URL || window.RAK_API_URL;

window.RAK_SUPABASE_URL = window.RAK_SUPABASE_URL || 'https://yhrxpmglucstpoyddkwy.supabase.co';
window.RAK_SUPABASE_ANON_KEY = window.RAK_SUPABASE_ANON_KEY || 'sb_publishable_5kbTdqFWfjasOampdLwNEA_XLEwPtxf';