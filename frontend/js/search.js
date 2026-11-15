/**
 * TerraScope Search & Autocomplete Module - Worldwide & National Edition
 * Handles debounced typing, global fuzzy matching, Maps.co API live resolution,
 * and keyboard navigation for any city, state, or country worldwide.
 */

const PRESET_GLOBAL_LOCATIONS = [
  // 28 Indian States
  { name: "Andhra Pradesh", type: "state", code: "IN-AP", country: "India", coordinates: [15.9129, 79.7400] },
  { name: "Arunachal Pradesh", type: "state", code: "IN-AR", country: "India", coordinates: [28.2180, 94.7278] },
  { name: "Assam", type: "state", code: "IN-AS", country: "India", coordinates: [26.2006, 92.9376] },
  { name: "Bihar", type: "state", code: "IN-BR", country: "India", coordinates: [25.0961, 85.3131] },
  { name: "Chhattisgarh", type: "state", code: "IN-CT", country: "India", coordinates: [21.2787, 81.8661] },
  { name: "Goa", type: "state", code: "IN-GA", country: "India", coordinates: [15.2993, 74.1240] },
  { name: "Gujarat", type: "state", code: "IN-GJ", country: "India", coordinates: [22.2587, 71.1924] },
  { name: "Haryana", type: "state", code: "IN-HR", country: "India", coordinates: [29.0588, 76.0856] },
  { name: "Himachal Pradesh", type: "state", code: "IN-HP", country: "India", coordinates: [31.1048, 77.1734] },
  { name: "Jharkhand", type: "state", code: "IN-JH", country: "India", coordinates: [23.6102, 85.2799] },
  { name: "Karnataka", type: "state", code: "IN-KA", country: "India", coordinates: [15.3173, 75.7139] },
  { name: "Kerala", type: "state", code: "IN-KL", country: "India", coordinates: [10.8505, 76.2711] },
  { name: "Madhya Pradesh", type: "state", code: "IN-MP", country: "India", coordinates: [22.9734, 78.6569] },
  { name: "Maharashtra", type: "state", code: "IN-MH", country: "India", coordinates: [19.7515, 75.7139] },
  { name: "Manipur", type: "state", code: "IN-MN", country: "India", coordinates: [24.6637, 93.9063] },
  { name: "Meghalaya", type: "state", code: "IN-ML", country: "India", coordinates: [25.4670, 91.3662] },
  { name: "Mizoram", type: "state", code: "IN-MZ", country: "India", coordinates: [23.1645, 92.9376] },
  { name: "Nagaland", type: "state", code: "IN-NL", country: "India", coordinates: [26.1584, 94.5624] },
  { name: "Odisha", type: "state", code: "IN-OR", country: "India", coordinates: [20.9517, 85.0985] },
  { name: "Punjab", type: "state", code: "IN-PB", country: "India", coordinates: [31.1471, 75.3412] },
  { name: "Rajasthan", type: "state", code: "IN-RJ", country: "India", coordinates: [27.0238, 74.2179] },
  { name: "Sikkim", type: "state", code: "IN-SK", country: "India", coordinates: [27.5330, 88.5122] },
  { name: "Tamil Nadu", type: "state", code: "IN-TN", country: "India", coordinates: [11.1271, 78.6569] },
  { name: "Telangana", type: "state", code: "IN-TG", country: "India", coordinates: [18.1124, 79.0193] },
  { name: "Tripura", type: "state", code: "IN-TR", country: "India", coordinates: [23.9408, 91.9882] },
  { name: "Uttar Pradesh", type: "state", code: "IN-UP", country: "India", coordinates: [26.8467, 80.9462] },
  { name: "Uttarakhand", type: "state", code: "IN-UT", country: "India", coordinates: [30.0668, 79.0193] },
  { name: "West Bengal", type: "state", code: "IN-WB", country: "India", coordinates: [22.9868, 87.8550] },

  // 8 Indian Union Territories
  { name: "Andaman and Nicobar Islands", type: "ut", code: "IN-AN", country: "India", coordinates: [11.7401, 92.6586] },
  { name: "Chandigarh", type: "ut", code: "IN-CH", country: "India", coordinates: [30.7333, 76.7794] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", code: "IN-DH", country: "India", coordinates: [20.4283, 72.8397] },
  { name: "Delhi", type: "ut", code: "IN-DL", country: "India", coordinates: [28.7041, 77.1025] },
  { name: "Jammu and Kashmir", type: "ut", code: "IN-JK", country: "India", coordinates: [33.7782, 76.5762] },
  { name: "Ladakh", type: "ut", code: "IN-LA", country: "India", coordinates: [34.1526, 77.5771] },
  { name: "Lakshadweep", type: "ut", code: "IN-LD", country: "India", coordinates: [10.5667, 72.6417] },
  { name: "Puducherry", type: "ut", code: "IN-PY", country: "India", coordinates: [11.9416, 79.8083] },

  // Key Districts / Metropolises (India)
  { name: "Kochi", type: "city", parent: "Kerala", country: "India", coordinates: [9.9312, 76.2673] },
  { name: "Thiruvananthapuram", type: "city", parent: "Kerala", country: "India", coordinates: [8.5241, 76.9366] },
  { name: "Kozhikode", type: "city", parent: "Kerala", country: "India", coordinates: [11.2588, 75.7804] },
  { name: "Wayanad", type: "district", parent: "Kerala", country: "India", coordinates: [11.6854, 76.1320] },
  { name: "Mumbai", type: "city", parent: "Maharashtra", country: "India", coordinates: [19.0760, 72.8777] },
  { name: "Pune", type: "city", parent: "Maharashtra", country: "India", coordinates: [18.5204, 73.8567] },
  { name: "Bengaluru", type: "city", parent: "Karnataka", country: "India", coordinates: [12.9716, 77.5946] },
  { name: "Chennai", type: "city", parent: "Tamil Nadu", country: "India", coordinates: [13.0827, 80.2707] },
  { name: "Hyderabad", type: "city", parent: "Telangana", country: "India", coordinates: [17.3850, 78.4867] },
  { name: "Kolkata", type: "city", parent: "West Bengal", country: "India", coordinates: [22.5726, 88.3639] },
  { name: "Ahmedabad", type: "city", parent: "Gujarat", country: "India", coordinates: [23.0225, 72.5714] },
  { name: "Jaipur", type: "city", parent: "Rajasthan", country: "India", coordinates: [26.9124, 75.7873] },
  { name: "Lucknow", type: "city", parent: "Uttar Pradesh", country: "India", coordinates: [26.8467, 80.9462] },
  { name: "Shimla", type: "city", parent: "Himachal Pradesh", country: "India", coordinates: [31.1048, 77.1734] },
  { name: "Srinagar", type: "city", parent: "Jammu and Kashmir", country: "India", coordinates: [34.0837, 74.7973] },

  // Major Countries Worldwide
  { name: "United States", type: "country", code: "USA", country: "United States", coordinates: [37.0902, -95.7129] },
  { name: "United Kingdom", type: "country", code: "GBR", country: "United Kingdom", coordinates: [55.3781, -3.4360] },
  { name: "France", type: "country", code: "FRA", country: "France", coordinates: [46.2276, 2.2137] },
  { name: "Germany", type: "country", code: "DEU", country: "Germany", coordinates: [51.1657, 10.4515] },
  { name: "Japan", type: "country", code: "JPN", country: "Japan", coordinates: [36.2048, 138.2529] },
  { name: "Australia", type: "country", code: "AUS", country: "Australia", coordinates: [-25.2744, 133.7751] },
  { name: "Brazil", type: "country", code: "BRA", country: "Brazil", coordinates: [-14.2350, -51.9253] },
  { name: "Canada", type: "country", code: "CAN", country: "Canada", coordinates: [56.1304, -106.3468] },
  { name: "China", type: "country", code: "CHN", country: "China", coordinates: [35.8617, 104.1954] },
  { name: "Italy", type: "country", code: "ITA", country: "Italy", coordinates: [41.8719, 12.5674] },
  { name: "Spain", type: "country", code: "ESP", country: "Spain", coordinates: [40.4637, -3.7492] },
  { name: "Egypt", type: "country", code: "EGY", country: "Egypt", coordinates: [26.8206, 30.8025] },
  { name: "South Africa", type: "country", code: "ZAF", country: "South Africa", coordinates: [-30.5595, 22.9375] },
  { name: "Kenya", type: "country", code: "KEN", country: "Kenya", coordinates: [-0.0236, 37.9062] },
  { name: "Saudi Arabia", type: "country", code: "SAU", country: "Saudi Arabia", coordinates: [23.8859, 45.0792] },
  { name: "Indonesia", type: "country", code: "IDN", country: "Indonesia", coordinates: [-0.7893, 113.9213] },
  { name: "Mexico", type: "country", code: "MEX", country: "Mexico", coordinates: [23.6345, -102.5528] },
  { name: "Argentina", type: "country", code: "ARG", country: "Argentina", coordinates: [-38.4161, -63.6167] },

  // Major Global Metropolises & Capitals Worldwide
  { name: "Tokyo", type: "city", country: "Japan", coordinates: [35.6762, 139.6503] },
  { name: "London", type: "city", country: "United Kingdom", coordinates: [51.5074, -0.1278] },
  { name: "New York", type: "city", country: "United States", coordinates: [40.7128, -74.0060] },
  { name: "Paris", type: "city", country: "France", coordinates: [48.8566, 2.3522] },
  { name: "Singapore", type: "country", country: "Singapore", coordinates: [1.3521, 103.8198] },
  { name: "Sydney", type: "city", country: "Australia", coordinates: [-33.8688, 151.2093] },
  { name: "Dubai", type: "city", country: "United Arab Emirates", coordinates: [25.2048, 55.2708] },
  { name: "Berlin", type: "city", country: "Germany", coordinates: [52.5200, 13.4050] },
  { name: "Rome", type: "city", country: "Italy", coordinates: [41.9028, 12.4964] },
  { name: "Madrid", type: "city", country: "Spain", coordinates: [40.4168, -3.7038] },
  { name: "Toronto", type: "city", country: "Canada", coordinates: [43.6532, -79.3832] },
  { name: "Beijing", type: "city", country: "China", coordinates: [39.9042, 116.4074] },
  { name: "Seoul", type: "city", country: "South Korea", coordinates: [37.5665, 126.9780] },
  { name: "Bangkok", type: "city", country: "Thailand", coordinates: [13.7563, 100.5018] },
  { name: "Cairo", type: "city", country: "Egypt", coordinates: [30.0444, 31.2357] },
  { name: "Nairobi", type: "city", country: "Kenya", coordinates: [-1.2921, 36.8219] },
  { name: "São Paulo", type: "city", country: "Brazil", coordinates: [-23.5505, -46.6333] },
  { name: "Buenos Aires", type: "city", country: "Argentina", coordinates: [-34.6037, -58.3816] },
  { name: "Cape Town", type: "city", country: "South Africa", coordinates: [-33.9249, 18.4241] },
  { name: "San Francisco", type: "city", country: "United States", coordinates: [37.7749, -122.4194] },
  { name: "Los Angeles", type: "city", country: "United States", coordinates: [34.0522, -118.2437] },
  { name: "Moscow", type: "city", country: "Russia", coordinates: [55.7558, 37.6173] },
  { name: "Istanbul", type: "city", country: "Turkey", coordinates: [41.0082, 28.9784] }
];

let debounceTimer = null;
let currentHighlightedIndex = -1;
let currentResults = [];

/**
 * Initialize Search & Autocomplete
 */
export function initSearch(inputId, dropdownId, onSelect) {
  const inputEl = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);

  if (!inputEl || !dropdownEl) {
    console.warn('[TerraScope Search] Input or dropdown element not found.');
    return;
  }

  inputEl.setAttribute('role', 'combobox');
  inputEl.setAttribute('aria-autocomplete', 'list');
  inputEl.setAttribute('aria-expanded', 'false');
  dropdownEl.setAttribute('role', 'listbox');

  // Input event with 250ms debounce
  inputEl.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      closeDropdown(inputEl, dropdownEl);
      return;
    }

    debounceTimer = setTimeout(() => {
      performSearch(query, inputEl, dropdownEl, onSelect);
    }, 250);
  });

  // Keyboard navigation
  inputEl.addEventListener('keydown', (e) => {
    if (!dropdownEl.classList.contains('active') || currentResults.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = inputEl.value.trim();
        if (query.length >= 2) {
          const match = PRESET_GLOBAL_LOCATIONS.find(loc =>
            loc.name.toLowerCase() === query.toLowerCase()
          );
          if (match) {
            selectLocation(match, inputEl, dropdownEl, onSelect);
          } else {
            // Live resolve via Maps.co API
            resolveAndSelectQuery(query, inputEl, dropdownEl, onSelect);
          }
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex + 1) % currentResults.length;
      updateHighlight(dropdownEl);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex - 1 + currentResults.length) % currentResults.length;
      updateHighlight(dropdownEl);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentHighlightedIndex >= 0 && currentHighlightedIndex < currentResults.length) {
        selectLocation(currentResults[currentHighlightedIndex], inputEl, dropdownEl, onSelect);
      } else if (currentResults.length > 0) {
        selectLocation(currentResults[0], inputEl, dropdownEl, onSelect);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(inputEl, dropdownEl);
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      closeDropdown(inputEl, dropdownEl);
    }
  });
}

/**
 * Executes fuzzy search across local presets and live backend Maps.co geocoder
 */
async function performSearch(query, inputEl, dropdownEl, onSelect) {
  const lowerQuery = query.toLowerCase();

  // 1. Search local preset global & Indian locations
  const matches = PRESET_GLOBAL_LOCATIONS.filter(loc => {
    return loc.name.toLowerCase().includes(lowerQuery) ||
           (loc.country && loc.country.toLowerCase().includes(lowerQuery)) ||
           (loc.parent && loc.parent.toLowerCase().includes(lowerQuery));
  }).sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(lowerQuery);
    const bStarts = b.name.toLowerCase().startsWith(lowerQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  currentResults = matches.slice(0, 8);

  // 2. Query backend Maps.co geocoding for international & local places
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const backendSuggestions = (data.suggestions || []).map(item => ({
        name: item.name,
        displayName: item.display_name || item.name,
        type: item.type || 'place',
        country: item.country || (item.display_name && item.display_name.split(',').pop().trim()) || '',
        coordinates: [parseFloat(item.latitude || item.lat), parseFloat(item.longitude || item.lon)],
        code: item.code || null
      })).filter(item => !isNaN(item.coordinates[0]) && !isNaN(item.coordinates[1]));

      backendSuggestions.forEach(bItem => {
        if (!currentResults.some(r => r.name.toLowerCase() === bItem.name.toLowerCase())) {
          currentResults.push(bItem);
        }
      });
    }
  } catch {
    // Local results remain available
  }

  currentHighlightedIndex = -1;
  renderSuggestions(currentResults.slice(0, 8), query, inputEl, dropdownEl, onSelect);
}

/**
 * Direct geocode and select for enter key presses
 */
async function resolveAndSelectQuery(query, inputEl, dropdownEl, onSelect) {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.coordinates) {
        selectLocation({
          name: query,
          displayName: data.details?.display_name || query,
          type: 'city',
          coordinates: data.coordinates
        }, inputEl, dropdownEl, onSelect);
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Renders suggestion dropdown items
 */
function renderSuggestions(results, query, inputEl, dropdownEl, onSelect) {
  dropdownEl.innerHTML = '';

  if (results.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.style.padding = '10px 14px';
    noResults.style.fontSize = '0.9rem';
    noResults.style.color = 'var(--text-muted, #6B7052)';
    noResults.textContent = `No location found matching "${query}"`;
    dropdownEl.appendChild(noResults);
    openDropdown(inputEl, dropdownEl);
    return;
  }

  results.forEach((loc, index) => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.setAttribute('role', 'option');
    item.setAttribute('id', `search-opt-${index}`);

    const labelContainer = document.createElement('div');
    labelContainer.className = 'search-label-box';
    const highlightedName = highlightMatch(loc.name, query);
    labelContainer.innerHTML = highlightedName;

    const subText = loc.parent ? `${loc.parent}, India` : (loc.country ? loc.country : '');
    if (subText) {
      const parentSpan = document.createElement('span');
      parentSpan.className = 'search-subtext';
      parentSpan.textContent = ` (${subText})`;
      labelContainer.appendChild(parentSpan);
    }

    const typeBadge = document.createElement('span');
    typeBadge.className = `search-badge badge-${(loc.type || 'place').toLowerCase()}`;
    typeBadge.textContent = (loc.type || 'place').toUpperCase();

    item.appendChild(labelContainer);
    item.appendChild(typeBadge);

    item.addEventListener('mouseenter', () => {
      currentHighlightedIndex = index;
      updateHighlight(dropdownEl);
    });

    item.addEventListener('click', () => {
      selectLocation(loc, inputEl, dropdownEl, onSelect);
    });

    dropdownEl.appendChild(item);
  });

  openDropdown(inputEl, dropdownEl);
}

/**
 * Handles selection of a location item
 */
function selectLocation(location, inputEl, dropdownEl, onSelect) {
  inputEl.value = location.name;
  closeDropdown(inputEl, dropdownEl);

  if (onSelect) {
    onSelect({
      name: location.name,
      displayName: location.displayName || location.name,
      type: location.type || 'city',
      parent: location.parent || null,
      country: location.country || null,
      code: location.code || null,
      coordinates: location.coordinates
    });
  }
}

/**
 * Updates visual highlight across dropdown items based on keyboard / mouse focus
 */
function updateHighlight(dropdownEl) {
  const items = dropdownEl.querySelectorAll('.search-item');
  items.forEach((item, idx) => {
    if (idx === currentHighlightedIndex) {
      item.classList.add('highlighted');
      item.setAttribute('aria-selected', 'true');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('highlighted');
      item.setAttribute('aria-selected', 'false');
    }
  });
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + query.length));
  const after = escapeHtml(text.slice(idx + query.length));

  return `${before}<strong style="color: var(--accent, #C8643B);">${match}</strong>${after}`;
}

function openDropdown(inputEl, dropdownEl) {
  dropdownEl.classList.add('active');
  inputEl.setAttribute('aria-expanded', 'true');
}

function closeDropdown(inputEl, dropdownEl) {
  dropdownEl.classList.remove('active');
  dropdownEl.innerHTML = '';
  inputEl.setAttribute('aria-expanded', 'false');
  currentHighlightedIndex = -1;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
