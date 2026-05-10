/**
 * Rise Shine Explore — Language Toggle (EN / PL)
 * Default language: Polish (pl)
 * Persists preference in localStorage
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rse_lang';
  var DEFAULT     = 'pl';
  var currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT;

  /**
   * Apply a language to all [data-en][data-pl] elements on the page.
   * Fires a 'languageChanged' CustomEvent so other scripts can re-render
   * dynamic content.
   */
  function applyLanguage(lang, silent) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    // Plain-text elements
    document.querySelectorAll('[data-en][data-pl]').forEach(function (el) {
      var text = el.dataset[lang];
      if (text === undefined) return;

      var tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });

    // HTML-content elements  data-en-html / data-pl-html
    document.querySelectorAll('[data-en-html]').forEach(function (el) {
      var html = lang === 'en' ? el.getAttribute('data-en-html') : el.getAttribute('data-pl-html');
      if (html !== null) el.innerHTML = html;
    });

    // Update toggle button label
    var btn = document.getElementById('langToggle');
    if (btn) btn.textContent = lang === 'pl' ? 'EN' : 'PL';

    // Update html lang attribute
    document.documentElement.lang = lang;

    // Notify other scripts
    if (!silent) {
      document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    }
  }

  function toggleLanguage() {
    applyLanguage(currentLang === 'pl' ? 'en' : 'pl', false);
  }

  // Public API
  window.RSELang = {
    toggle: toggleLanguage,
    set:    applyLanguage,
    get:    function () { return currentLang; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('langToggle');
    if (btn) btn.addEventListener('click', toggleLanguage);
    applyLanguage(currentLang, true);
  });
}());
