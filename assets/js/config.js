const isLocalDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

window.RAK_API_URL = window.RAK_API_URL || (
  isLocalDevelopment
    ? 'http://localhost:8787'
    : ''
);