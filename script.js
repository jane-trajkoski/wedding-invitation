document.body.classList.add('js-enabled');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fadeTargets = document.querySelectorAll('.fade-target');
const parallaxItems = Array.from(document.querySelectorAll('.parallax'));

const revealElement = (element) => {
  element.style.opacity = '1';
  element.style.transform = 'none';
};

if (!prefersReducedMotion && parallaxItems.length) {
  let ticking = false;
  const parallaxActivationDistance = 160;

  parallaxItems.forEach((item) => item.style.setProperty('--parallax-y', '0px'));

  const updateParallax = () => {
    const scrollY = Math.max(window.scrollY, 0);

    if (scrollY <= 0) {
      parallaxItems.forEach((item) => item.style.setProperty('--parallax-y', '0px'));
      ticking = false;
      return;
    }

    const activation = Math.min(1, scrollY / parallaxActivationDistance);
    const activationEase = Math.pow(activation, 1.8);
    const viewportCenter = scrollY + window.innerHeight * 0.5;

    parallaxItems.forEach((item) => {
      const speed = parseFloat(item.dataset.speed || '0.12');
      const maxShift = parseFloat(item.dataset.maxShift || '180');
      const rect = item.getBoundingClientRect();
      const offsetTop = rect.top + scrollY;
      const elementCenter = offsetTop + rect.height * 0.5;
      const distance = viewportCenter - elementCenter;
      const translate = Math.max(-maxShift, Math.min(maxShift, distance * speed)) * activationEase;

      item.style.setProperty('--parallax-y', `${translate}px`);
    });
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
} else {
  parallaxItems.forEach((item) => item.style.setProperty('--parallax-y', '0px'));
}

if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
  fadeTargets.forEach((target) => {
    revealElement(target);
    if (target.classList.contains('story-card--float')) {
      target.classList.add('text-visible');
    }
  });
} else {
  const fadeObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        if (window.gsap) {
          gsap.to(entry.target, {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power2.out'
          });
        } else {
          revealElement(entry.target);
        }

        if (entry.target.classList.contains('story-card--float')) {
          entry.target.classList.add('text-visible');
        }

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
  );

  fadeTargets.forEach((target) => fadeObserver.observe(target));
}

const openMapBtn = document.getElementById('openMapBtn');
const closeMapBtn = document.getElementById('closeMapBtn');
const mapSheet = document.getElementById('mapSheet');
const mapBackdrop = document.getElementById('mapBackdrop');

let mapInstance = null;
let mapMarker = null;
let mapMarkerClickBound = false;

const venueFallbackPosition = [41.33277, 21.53917];
const venueQueries = ['8GMQ+7R Prilep', 'Ла каса гранде Prilep'];
const venueLabel = 'Ла каса гранде, 8GMQ+7R Prilep';
const venueAppleAddress = 'Aleksandar Makedonski 7513 Prilep North Macedonia';

const isIOSDevice = () => {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const buildGoogleMapsDirectionsUrl = (position) =>
  `https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`;

const buildAppleMapsDirectionsUrl = () =>
  `https://maps.apple.com/?daddr=${encodeURIComponent(venueAppleAddress)}`;

const openExternalMaps = (position) => {
  const url = isIOSDevice() ? buildAppleMapsDirectionsUrl() : buildGoogleMapsDirectionsUrl(position);
  window.open(url, '_blank', 'noopener');
};

const resolveVenuePosition = async () => {
  for (const query of venueQueries) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
      );
      if (!response.ok) continue;

      const results = await response.json();
      if (!Array.isArray(results) || !results.length) continue;

      const lat = parseFloat(results[0].lat);
      const lon = parseFloat(results[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return [lat, lon];
      }
    } catch (error) {
      // Keep fallback behavior if geocoding is unavailable.
    }
  }

  return venueFallbackPosition;
};

const setVenueMarker = (position) => {
  if (!mapInstance) return;

  mapInstance.setView(position, 17);

  if (!mapMarker) {
    mapMarker = L.marker(position).addTo(mapInstance);
  } else {
    mapMarker.setLatLng(position);
  }

  mapMarker.bindPopup(
    `<strong>${venueLabel}</strong><br><a href="${buildGoogleMapsDirectionsUrl(position)}" target="_blank" rel="noopener">Google Maps</a> · <a href="${buildAppleMapsDirectionsUrl()}" target="_blank" rel="noopener">Apple Maps</a>`
  );

  if (!mapMarkerClickBound) {
    mapMarker.on('click', () => {
      const current = mapMarker.getLatLng();
      openExternalMaps([current.lat, current.lng]);
    });
    mapMarkerClickBound = true;
  }
};

const initMap = () => {
  if (mapInstance || !window.L) return;

  mapInstance = L.map('map', { scrollWheelZoom: false }).setView(
    venueFallbackPosition,
    16
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  setVenueMarker(venueFallbackPosition);
  resolveVenuePosition().then((resolvedPosition) => {
    setVenueMarker(resolvedPosition);
  });
};

const openMap = () => {
  if (!mapSheet || !mapBackdrop) return;

  mapBackdrop.hidden = false;
  requestAnimationFrame(() => mapBackdrop.classList.add('is-visible'));
  mapSheet.classList.add('is-open');
  mapSheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('map-open');

  if (openMapBtn) {
    openMapBtn.setAttribute('aria-expanded', 'true');
  }

  initMap();
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 220);
};

const closeMap = () => {
  if (!mapSheet || !mapBackdrop) return;

  mapSheet.classList.remove('is-open');
  mapSheet.setAttribute('aria-hidden', 'true');
  mapBackdrop.classList.remove('is-visible');
  document.body.classList.remove('map-open');

  if (openMapBtn) {
    openMapBtn.setAttribute('aria-expanded', 'false');
  }

  setTimeout(() => {
    if (!mapBackdrop.classList.contains('is-visible')) {
      mapBackdrop.hidden = true;
    }
  }, 280);
};

if (openMapBtn) {
  openMapBtn.addEventListener('click', openMap);
  openMapBtn.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMap();
    }
  });
}

if (closeMapBtn) {
  closeMapBtn.addEventListener('click', closeMap);
}

if (mapBackdrop) {
  mapBackdrop.addEventListener('click', closeMap);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMap();
  }
});

// --- RSVP ---
const rsvpBtn = document.getElementById('rsvpBtn');
const rsvpStatus = document.getElementById('rsvpStatus');

if (rsvpBtn && rsvpStatus) {
  rsvpBtn.addEventListener('click', () => {
    rsvpStatus.textContent = '🎉 Thank you! Your attendance is confirmed.';
    rsvpBtn.disabled = true;
    rsvpBtn.style.opacity = '0.6';
  });
}
