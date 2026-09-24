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
window.RAK_SUPABASE_ANON_KEY = window.RAK_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlocnhwbWdsdWNzdHBveWRka3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODA5MTEsImV4cCI6MjEwNTQ1NjkxMX0.acjMPUcnrYwPhj2SQJj9h6plN0naKftw3mgDI31XS-U';