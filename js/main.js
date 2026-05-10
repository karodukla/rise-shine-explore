/**
 * Rise Shine Explore — Main Script
 * - Nav: scroll shadow + hamburger
 * - Active nav link highlighting
 * - Retreat card rendering (from inline data, with JSON fetch fallback)
 * - Scroll-triggered fade-in animations
 */
(function () {
  'use strict';

  /* ================================================================
     Retreat Data — inline copy mirrors retreats.json
     (ensures cards render when the page is opened from the filesystem)
     ================================================================ */
  var RETREATS = [
    {
      id: 'sedona-2026',
      location: 'Sedona',
      park: 'Arizona: Sedona',
      state: 'Arizona',
      dateEN: 'March 5–8, 2026',
      datePL: '5–8 marca 2026',
      status: 'soldout',
      descriptionEN: 'Four transformative days among Sedona\'s legendary red rock formations. We explored sacred vortex sites, practiced sunrise yoga at Cathedral Rock, and gathered for evening sound healing ceremonies. This retreat sold out within days — a testament to the magic we create together.',
      descriptionPL: 'Cztery transformujące dni wśród legendarnych czerwonych skał Sedony. Odkrywałyśmy święte miejsca vortexów, praktykowałyśmy jogę o wschodzie słońca przy Cathedral Rock i gromadziłyśmy się na wieczornych ceremoniach uzdrawiania dźwiękiem. Ten retreat wyprzedał się w ciągu kilku dni — to dowód na magię, którą razem tworzymy.',
      highlights: {
        en: ['Vortex meditation sessions', 'Sunrise yoga at Cathedral Rock', 'Red rock hiking trails', 'Evening sound healing ceremony', 'Guided spiritual reflection'],
        pl: ['Medytacje przy vortexach', 'Joga o wschodzie słońca przy Cathedral Rock', 'Wędrówki szlakami czerwonych skał', 'Wieczorna ceremonia uzdrawiania dźwiękiem', 'Prowadzona refleksja duchowa']
      },
      gradClass: 'grad-sedona',
      icon: '🏜️',
      image: 'images/sedona1/sedona1-01.jpg'
    },
    {
      id: 'zion-2026',
      location: 'Zion',
      park: 'Zion National Park',
      state: 'Utah',
      dateEN: 'May 14–17, 2026',
      datePL: '14–17 maja 2026',
      status: 'upcoming',
      descriptionEN: 'Join us in the breathtaking canyons of Zion National Park. We\'ll hike through narrow slot canyons, practice yoga with towering canyon walls as our sacred backdrop, and spend evenings in deep reflection under a star-filled desert sky. Limited to 12 women.',
      descriptionPL: 'Dołącz do nas w zapierających dech w piersiach kanionach Parku Narodowego Zion. Będziemy wędrować przez wąskie szczeliny skalne, praktykować jogę z majestatycznymi ścianami kanionu jako naszym sakralnym tłem i spędzać wieczory na głębokiej refleksji pod gwiazdami pustynnego nieba. Ograniczone do 12 kobiet.',
      highlights: {
        en: ['Narrows slot canyon hike', 'Angels Landing trail (optional)', 'Morning yoga in the canyon', 'Stargazing & journaling', 'Group intention-setting ceremony'],
        pl: ['Wędrówka Narrows przez szczelinę skalną', 'Szlak Angels Landing (opcjonalnie)', 'Poranna joga w kanionie', 'Obserwacja gwiazd i journaling', 'Grupowa ceremonia intencji']
      },
      gradClass: 'grad-zion',
      icon: '🏔️',
      image: 'images/zion.jpg'
    },
    {
      id: 'olympic-2026',
      location: 'Olympic',
      park: 'Olympic National Park',
      state: 'Washington',
      dateEN: 'June 11–14, 2026',
      datePL: '11–14 czerwca 2026',
      status: 'upcoming',
      descriptionEN: 'Experience the ancient temperate rainforests, dramatic Pacific coastlines, and snow-capped peaks of Olympic National Park. A journey through one of America\'s most biodiverse landscapes — from sea to summit, with yoga, mindfulness, and deep nature connection woven throughout each day.',
      descriptionPL: 'Doświadcz pradawnych lasów deszczowych strefy umiarkowanej, dramatycznych wybrzeży Pacyfiku i ośnieżonych szczytów Parku Narodowego Olympic. Podróż przez jeden z najbardziej bioróżnorodnych krajobrazów Ameryki — od morza po szczyt, z jogą, uważnością i głębokim połączeniem z naturą wplecionymi w każdy dzień.',
      highlights: {
        en: ['Hoh Rainforest immersion walk', 'Sunrise yoga on Ruby Beach', 'Coastal tide pool exploration', 'Forest bathing (Shinrin-yoku)', 'Mountain meadow meditation'],
        pl: ['Spacer immersyjny w lesie deszczowym Hoh', 'Joga o wschodzie słońca na plaży Ruby Beach', 'Eksploracja przybrzeżnych basenów pływowych', 'Kąpiel leśna (Shinrin-yoku)', 'Medytacja na górskiej polanie']
      },
      gradClass: 'grad-olympic',
      icon: '🌲',
      image: 'images/olympic.jpg'
    },
    {
      id: 'tba-2026',
      location: 'TBA',
      park: 'Coming Soon',
      state: '',
      dateEN: 'Fall 2026 — To Be Announced',
      datePL: 'Jesień 2026 — Do ogłoszenia',
      status: 'tba',
      descriptionEN: 'Our next adventure is being planned. We\'re scouting spectacular locations across the American West. Sign up to our newsletter to be the first to know when our next retreat is announced.',
      descriptionPL: 'Planujemy kolejną przygodę. Poszukujemy spektakularnych lokalizacji na zachodzie Ameryki. Zapisz się do naszego newslettera, aby jako pierwsza dowiedzieć się o ogłoszeniu następnego retreatu.',
      highlights: {
        en: ['Location announcement coming soon', 'Newsletter subscribers notified first', 'Limited spots available'],
        pl: ['Wkrótce ogłoszenie lokalizacji', 'Subskrybenci newslettera powiadomieni pierwsi', 'Ograniczona liczba miejsc']
      },
      gradClass: 'grad-tba',
      icon: '✨',
      image: 'images/oahu/oahu-01.jpg'
    }
  ];

  /* ================================================================
     Helpers
     ================================================================ */
  function getLang() {
    return window.RSELang ? window.RSELang.get() : 'pl';
  }

  var STATUS_LABELS = {
    soldout:  { en: 'Sold Out',   pl: 'Wyprzedane' },
    upcoming: { en: 'Upcoming',   pl: 'Nadchodzi'  },
    waitlist: { en: 'Waitlist',   pl: 'Lista rezerwowa' },
    tba:      { en: 'Coming Soon',pl: 'Wkrótce'    }
  };
  var CTA_LABELS = {
    soldout:  { en: 'Sold Out',        pl: 'Wyprzedane'       },
    upcoming: { en: 'Sign Up',         pl: 'Zapisz się'       },
    waitlist: { en: 'Join Waitlist',   pl: 'Lista rezerwowa'  },
    tba:      { en: 'Stay Tuned',      pl: 'Bądź w kontakcie' }
  };

  /* ================================================================
     Render retreat cards into a container element
     ================================================================ */
  function renderCards(retreats, container, lang) {
    if (!container) return;
    var isEN = lang === 'en';

    container.innerHTML = retreats.map(function (r) {
      var date     = isEN ? r.dateEN : r.datePL;
      var location = r.state ? r.park + ', ' + r.state : r.park;

      var imgEl = r.image
        ? '<img src="' + r.image + '" alt="' + r.location + '" loading="lazy">'
        : '<div class="' + r.gradClass + '" style="width:100%;height:100%;"></div>';

      return '<article class="retreat-card animate-fade-up">' +
        '<div class="retreat-card__image">' + imgEl + '</div>' +
        '<div class="retreat-card__info">' +
          '<h3 class="retreat-card__title">' + location + '</h3>' +
          '<p class="retreat-card__date">' + date + '</p>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ================================================================
     Nav: shadow on scroll
     ================================================================ */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 16); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================================================================
     Nav: hamburger
     ================================================================ */
  function initHamburger() {
    var btn   = document.getElementById('hamburger');
    var links = document.getElementById('navLinks');
    if (!btn || !links) return;

    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) {
        links.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ================================================================
     Active nav link
     ================================================================ */
  function setActiveNav() {
    var page = (window.location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.nav__links a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href === page || (page === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  /* ================================================================
     Home page: retreat preview (3 non-soldout)
     ================================================================ */
  function initHomePage() {
    var grid = document.getElementById('retreatPreview');
    if (!grid) return;

    var preview = RETREATS;
    renderCards(preview, grid, getLang());

    document.addEventListener('languageChanged', function (e) {
      renderCards(preview, grid, e.detail.lang);
    });
  }

  /* ================================================================
     Retreats page: full list
     ================================================================ */
  function initRetreatsPage() {
    var grid = document.getElementById('retreatGrid');
    if (!grid) return;

    renderCards(RETREATS, grid, getLang());

    document.addEventListener('languageChanged', function (e) {
      renderCards(RETREATS, grid, e.detail.lang);
    });
  }

  /* ================================================================
     Scroll-triggered fade-in (IntersectionObserver)
     ================================================================ */
  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  /* ================================================================
     Init
     ================================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initHamburger();
    setActiveNav();
    initHomePage();
    initRetreatsPage();
    initScrollAnimations();
  });
}());
