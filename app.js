// Collegamento comune a tutte le schermate: sessione, richieste allo script, foto.
(function () {
  const K_SESSIONE = 'ss-sessione';   // { utente, password, nome }
  const K_DATI = 'ss-dati';           // { partecipanti, coppie, dataSerata }
  const K_FOTO = 'ss-foto';           // { Nome: 'data:image/jpeg;base64,...' }

  const leggi = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const scrivi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // Sagoma mostrata al primissimo avvio, prima che le foto arrivino (dopo il login).
  const SAGOMA = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#3a2a22"/>' +
    '<circle cx="50" cy="40" r="19" fill="#8a6a50"/><path d="M14 100c4-24 18-34 36-34s32 10 36 34z" fill="#8a6a50"/></svg>');

  const NOMI_PREDEFINITI = ['Davide', 'Angelica', 'Enza', 'Daniele', 'Francesco', 'Alessandra', 'Andrea', 'Chiara'];

  async function api(azione, dati) {
    const url = (window.SS_CONFIG || {}).URL_SCRIPT;
    if (!url || url.indexOf('http') !== 0) throw Object.assign(new Error('Manca l’indirizzo dello script in config.js.'), { codice: 'config' });
    const s = leggi(K_SESSIONE) || {};
    const corpo = Object.assign({ azione, utente: s.utente, password: s.password }, dati || {});
    let r;
    try {
      r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo) });
    } catch (e) {
      throw Object.assign(new Error('Connessione assente. Riprova tra poco.'), { codice: 'rete' });
    }
    const j = await r.json();
    if (!j.ok) {
      if (j.codice === 'credenziali' && azione !== 'login') esci();
      throw Object.assign(new Error(j.errore || 'Errore'), { codice: j.codice });
    }
    return j;
  }

  async function accedi(utente, password) {
    const j = await api('login', { utente: utente.trim(), password });
    scrivi(K_SESSIONE, { utente: utente.trim(), password, nome: j.nome });
    scrivi(K_DATI, { partecipanti: j.partecipanti, coppie: j.coppie, dataSerata: j.dataSerata });
    if (j.foto && Object.keys(j.foto).length) scrivi(K_FOTO, j.foto);
    return j;
  }

  function esci() {
    try { localStorage.removeItem(K_SESSIONE); } catch (e) {}
    location.replace('citofono.html');
  }

  function sessione() { return leggi(K_SESSIONE); }
  function dati() { return leggi(K_DATI) || { partecipanti: NOMI_PREDEFINITI, coppie: {}, dataSerata: null }; }
  function foto(nome) { const f = leggi(K_FOTO) || {}; return f[nome] || SAGOMA; }
  function haFoto() { const f = leggi(K_FOTO); return !!(f && Object.keys(f).length); }

  // Nelle schermate riservate: se non sei entrato, torni al citofono.
  function richiediAccesso() {
    const s = sessione();
    if (!s || !s.nome) { location.replace('citofono.html'); return null; }
    return s;
  }

  window.SS = { api, accedi, esci, sessione, dati, foto, haFoto, richiediAccesso, SAGOMA };

  // Registrazione per l'installazione sul telefono (funziona solo online, in https).
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
