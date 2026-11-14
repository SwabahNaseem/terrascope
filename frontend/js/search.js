/**
 * TerraScope Search & Autocomplete Module
 * Handles debounced typing, local fuzzy suggestions, aliases, geocoding selection,
 * and keyboard navigation for Indian states, union territories, and districts.
 * Matches Technical Specification Section 3.2
 */

export const LOCAL_INDIAN_LOCATIONS = [
  // 28 States
  { name: "Andhra Pradesh", type: "state", code: "IN-AP", coordinates: [15.9129, 79.7400], aliases: ["ap", "andhra"] },
  { name: "Arunachal Pradesh", type: "state", code: "IN-AR", coordinates: [28.2180, 94.7278], aliases: ["arunachal"] },
  { name: "Assam", type: "state", code: "IN-AS", coordinates: [26.2006, 92.9376], aliases: ["asom"] },
  { name: "Bihar", type: "state", code: "IN-BR", coordinates: [25.0961, 85.3131], aliases: [] },
  { name: "Chhattisgarh", type: "state", code: "IN-CT", coordinates: [21.2787, 81.8661], aliases: ["chattisgarh", "cg"] },
  { name: "Goa", type: "state", code: "IN-GA", coordinates: [15.2993, 74.1240], aliases: [] },
  { name: "Gujarat", type: "state", code: "IN-GJ", coordinates: [22.2587, 71.1924], aliases: [] },
  { name: "Haryana", type: "state", code: "IN-HR", coordinates: [29.0588, 76.0856], aliases: [] },
  { name: "Himachal Pradesh", type: "state", code: "IN-HP", coordinates: [31.1048, 77.1734], aliases: ["himachal", "hp"] },
  { name: "Jharkhand", type: "state", code: "IN-JH", coordinates: [23.6102, 85.2799], aliases: [] },
  { name: "Karnataka", type: "state", code: "IN-KA", coordinates: [15.3173, 75.7139], aliases: [] },
  { name: "Kerala", type: "state", code: "IN-KL", coordinates: [10.8505, 76.2711], aliases: [] },
  { name: "Madhya Pradesh", type: "state", code: "IN-MP", coordinates: [22.9734, 78.6569], aliases: ["mp"] },
  { name: "Maharashtra", type: "state", code: "IN-MH", coordinates: [19.7515, 75.7139], aliases: ["bombay", "mumbai"] },
  { name: "Manipur", type: "state", code: "IN-MN", coordinates: [24.6637, 93.9063], aliases: [] },
  { name: "Meghalaya", type: "state", code: "IN-ML", coordinates: [25.4670, 91.3662], aliases: [] },
  { name: "Mizoram", type: "state", code: "IN-MZ", coordinates: [23.1645, 92.9376], aliases: [] },
  { name: "Nagaland", type: "state", code: "IN-NL", coordinates: [26.1584, 94.5624], aliases: [] },
  { name: "Odisha", type: "state", code: "IN-OR", coordinates: [20.9517, 85.0985], aliases: ["orissa"] },
  { name: "Punjab", type: "state", code: "IN-PB", coordinates: [31.1471, 75.3412], aliases: [] },
  { name: "Rajasthan", type: "state", code: "IN-RJ", coordinates: [27.0238, 74.2179], aliases: [] },
  { name: "Sikkim", type: "state", code: "IN-SK", coordinates: [27.5330, 88.5122], aliases: [] },
  { name: "Tamil Nadu", type: "state", code: "IN-TN", coordinates: [11.1271, 78.6569], aliases: ["tn", "madras"] },
  { name: "Telangana", type: "state", code: "IN-TG", coordinates: [18.1124, 79.0193], aliases: ["hyderabad"] },
  { name: "Tripura", type: "state", code: "IN-TR", coordinates: [23.9408, 91.9882], aliases: [] },
  { name: "Uttar Pradesh", type: "state", code: "IN-UP", coordinates: [26.8467, 80.9462], aliases: ["up"] },
  { name: "Uttarakhand", type: "state", code: "IN-UT", coordinates: [30.0668, 79.0193], aliases: ["uttaranchal"] },
  { name: "West Bengal", type: "state", code: "IN-WB", coordinates: [22.9868, 87.8550], aliases: ["bengal", "wb"] },

  // 8 Union Territories
  { name: "Andaman and Nicobar Islands", type: "ut", code: "IN-AN", coordinates: [11.7401, 92.6586], aliases: ["andaman", "nicobar"] },
  { name: "Chandigarh", type: "ut", code: "IN-CH", coordinates: [30.7333, 76.7794], aliases: [] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", code: "IN-DH", coordinates: [20.4283, 72.8397], aliases: ["daman", "diu", "dadra", "nagar haveli"] },
  { name: "Delhi", type: "ut", code: "IN-DL", coordinates: [28.7041, 77.1025], aliases: ["nct", "new delhi"] },
  { name: "Jammu and Kashmir", type: "ut", code: "IN-JK", coordinates: [33.7782, 76.5762], aliases: ["j&k", "jammu", "kashmir"] },
  { name: "Ladakh", type: "ut", code: "IN-LA", coordinates: [34.1526, 77.5771], aliases: ["leh"] },
  { name: "Lakshadweep", type: "ut", code: "IN-LD", coordinates: [10.5667, 72.6417], aliases: [] },
  { name: "Puducherry", type: "ut", code: "IN-PY", coordinates: [11.9416, 79.8083], aliases: ["pondicherry"] },

  // Key Districts / Hubs mapped to parent states
  { name: "Kochi", type: "district", parent: "Kerala", code: "IN-KL", coordinates: [9.9312, 76.2673] },
  { name: "Thiruvananthapuram", type: "district", parent: "Kerala", code: "IN-KL", coordinates: [8.5241, 76.9366] },
  { name: "Kozhikode", type: "district", parent: "Kerala", code: "IN-KL", coordinates: [11.2588, 75.7804] },
  { name: "Wayanad", type: "district", parent: "Kerala", code: "IN-KL", coordinates: [11.6854, 76.1320] },
  { name: "Chennai", type: "district", parent: "Tamil Nadu", code: "IN-TN", coordinates: [13.0827, 80.2707] },
  { name: "Coimbatore", type: "district", parent: "Tamil Nadu", code: "IN-TN", coordinates: [11.0168, 76.9558] },
  { name: "Madurai", type: "district", parent: "Tamil Nadu", code: "IN-TN", coordinates: [9.9252, 78.1198] },
  { name: "Bengaluru", type: "district", parent: "Karnataka", code: "IN-KA", coordinates: [12.9716, 77.5946] },
  { name: "Mysuru", type: "district", parent: "Karnataka", code: "IN-KA", coordinates: [12.2958, 76.6394] },
  { name: "Mumbai", type: "district", parent: "Maharashtra", code: "IN-MH", coordinates: [19.0760, 72.8777] },
  { name: "Pune", type: "district", parent: "Maharashtra", code: "IN-MH", coordinates: [18.5204, 73.8567] },
  { name: "Jaipur", type: "district", parent: "Rajasthan", code: "IN-RJ", coordinates: [26.9124, 75.7873] },
  { name: "Ahmedabad", type: "district", parent: "Gujarat", code: "IN-GJ", coordinates: [23.0225, 72.5714] },
  { name: "Lucknow", type: "district", parent: "Uttar Pradesh", code: "IN-UP", coordinates: [26.8467, 80.9462] },
  { name: "Varanasi", type: "district", parent: "Uttar Pradesh", code: "IN-UP", coordinates: [25.3176, 82.9739] },
  { name: "Patna", type: "district", parent: "Bihar", code: "IN-BR", coordinates: [25.5941, 85.1376] },
  { name: "Kolkata", type: "district", parent: "West Bengal", code: "IN-WB", coordinates: [22.5726, 88.3639] },
  { name: "Srinagar", type: "district", parent: "Jammu and Kashmir", code: "IN-JK", coordinates: [34.0837, 74.7973] },
  { name: "Leh", type: "district", parent: "Ladakh", code: "IN-LA", coordinates: [34.1526, 77.5771] },
  { name: "Shimla", type: "district", parent: "Himachal Pradesh", code: "IN-HP", coordinates: [31.1048, 77.1734] },
  { name: "Guwahati", type: "district", parent: "Assam", code: "IN-AS", coordinates: [26.1445, 91.7362] }
];

export const ALL_INDIAN_STATES_AND_UTS = LOCAL_INDIAN_LOCATIONS;

let debounceTimer = null;
let currentHighlightedIndex = -1;
let currentResults = [];

/**
 * Initialize Search & Autocomplete
 * @param {string} inputId - Search input element ID
 * @param {string} dropdownId - Dropdown container element ID
 * @param {Function} onSelect - Callback when location is selected
 */
export function initSearch(inputId, dropdownId, onSelect) {
  const inputEl = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);

  if (!inputEl || !dropdownEl) {
    console.warn(`[TerraScope Search] Input #${inputId} or Dropdown #${dropdownId} not found.`);
    return;
  }

  // Accessibility attributes
  inputEl.setAttribute('role', 'combobox');
  inputEl.setAttribute('aria-autocomplete', 'list');
  inputEl.setAttribute('aria-expanded', 'false');
  dropdownEl.setAttribute('role', 'listbox');

  // Input event with 250ms debounce
  inputEl.addEventListener('input', (e) => {
    const rawValue = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (rawValue.length < 2) {
      closeDropdown(inputEl, dropdownEl);
      return;
    }

    debounceTimer = setTimeout(() => {
      executeSearch(rawValue, inputEl, dropdownEl, onSelect);
    }, 250);
  });

  // Keyboard navigation
  inputEl.addEventListener('keydown', (e) => {
    if (!dropdownEl.classList.contains('active') || currentResults.length === 0) {
      if (e.key === 'Enter') {
        const query = inputEl.value.trim().toLowerCase();
        const match = LOCAL_INDIAN_LOCATIONS.find(loc =>
          loc.name.toLowerCase() === query || (loc.aliases && loc.aliases.includes(query))
        );
        if (match) {
          selectLocation(match, inputEl, dropdownEl, onSelect);
        }
      }
      return;
    }

    const items = dropdownEl.querySelectorAll('.search-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex + 1) % items.length;
      updateHighlight(dropdownEl);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex - 1 + items.length) % items.length;
      updateHighlight(dropdownEl);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = currentHighlightedIndex >= 0 ? currentHighlightedIndex : 0;
      if (currentResults[targetIndex]) {
        selectLocation(currentResults[targetIndex], inputEl, dropdownEl, onSelect);
      }
    } else if (e.key === 'Escape') {
      closeDropdown(inputEl, dropdownEl);
    }
  });

  // Click outside listener
  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      closeDropdown(inputEl, dropdownEl);
    }
  });
}

/**
 * Searches local Indian locations and cascades to backend if necessary
 */
async function executeSearch(query, inputEl, dropdownEl, onSelect) {
  const qLower = query.toLowerCase();

  // 1. Local matching: prefix, aliases, substring, and Levenshtein similarity
  const scored = [];
  LOCAL_INDIAN_LOCATIONS.forEach(loc => {
    const nameLower = loc.name.toLowerCase();
    let score = 0;

    if (nameLower === qLower) {
      score = 1.0;
    } else if (loc.aliases && loc.aliases.includes(qLower)) {
      score = 0.95;
    } else if (nameLower.startsWith(qLower)) {
      score = 0.9;
    } else if (loc.aliases && loc.aliases.some(a => a.startsWith(qLower))) {
      score = 0.85;
    } else if (nameLower.includes(qLower)) {
      score = 0.75;
    } else if (loc.aliases && loc.aliases.some(a => a.includes(qLower))) {
      score = 0.7;
    } else {
      const lev = calculateLevenshtein(nameLower, qLower);
      const maxLen = Math.max(nameLower.length, qLower.length);
      const similarity = 1 - lev / maxLen;
      if (similarity >= 0.6) {
        score = similarity * 0.6;
      }
    }

    if (score > 0) {
      scored.push({ loc, score });
    }
  });

  scored.sort((a, b) => b.score - a.score);
  currentResults = scored.slice(0, 8).map(s => s.loc);

  // 2. Cascade to backend search API if local matches < 3
  if (currentResults.length < 3) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      // Try /api/location/search then /api/search
      let res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });
      if (!res.ok) {
        res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const suggestions = data.results || data.suggestions || [];
        const backendSuggestions = suggestions.map(item => ({
          name: item.name,
          type: item.type || 'place',
          coordinates: [item.latitude || item.lat, item.longitude || item.lon],
          code: item.code || null
        }));

        backendSuggestions.forEach(backendItem => {
          if (!currentResults.some(r => r.name.toLowerCase() === backendItem.name.toLowerCase())) {
            currentResults.push(backendItem);
          }
        });
      }
    } catch {
      // Gracefully fall back to local results on network failure / offline
    }
  }

  currentHighlightedIndex = -1;
  renderSuggestions(currentResults, query, inputEl, dropdownEl, onSelect);
}

/**
 * Renders suggestion dropdown items with highlighted matching text
 */
function renderSuggestions(results, query, inputEl, dropdownEl, onSelect) {
  dropdownEl.innerHTML = '';

  if (results.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'search-no-results';
    noResults.style.padding = '10px 14px';
    noResults.style.fontSize = '0.9rem';
    noResults.style.color = 'var(--text-muted, #6B7052)';
    noResults.textContent = `No Indian state or district matching "${query}"`;
    dropdownEl.appendChild(noResults);
    openDropdown(inputEl, dropdownEl);
    return;
  }

  results.forEach((loc, index) => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.setAttribute('role', 'option');
    item.setAttribute('id', `search-opt-${index}`);
    item.style.padding = '9px 14px';
    item.style.cursor = 'pointer';
    item.style.borderBottom = '1px solid rgba(214, 204, 169, 0.4)';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.fontSize = '0.9rem';

    const labelContainer = document.createElement('div');
    const highlightedName = highlightMatch(loc.name, query);
    labelContainer.innerHTML = highlightedName;

    if (loc.parent) {
      const parentSpan = document.createElement('span');
      parentSpan.style.fontSize = '0.75rem';
      parentSpan.style.color = 'var(--text-muted, #6B7052)';
      parentSpan.style.marginLeft = '6px';
      parentSpan.textContent = `(${loc.parent})`;
      labelContainer.appendChild(parentSpan);
    }

    const typeBadge = document.createElement('span');
    typeBadge.className = 'item-type-badge';
    typeBadge.style.fontSize = '0.75rem';
    typeBadge.style.padding = '2px 6px';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.backgroundColor = 'rgba(47, 93, 58, 0.12)';
    typeBadge.style.color = 'var(--primary, #2F5D3A)';
    typeBadge.style.fontWeight = '600';
    typeBadge.textContent = loc.type === 'ut' ? 'UNION TERRITORY' : loc.type.toUpperCase();

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
      name: location.parent ? location.parent : location.name,
      displayName: location.name,
      type: location.type === 'ut' ? 'state' : location.type, // Map zoom expects state
      code: location.code,
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
      item.style.backgroundColor = 'var(--bg-card-hover, #E7DDCA)';
      item.setAttribute('aria-selected', 'true');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('highlighted');
      item.style.backgroundColor = 'transparent';
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

  return `${before}<strong style="color: var(--accent, #C8643B); text-decoration: underline;">${match}</strong>${after}`;
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
  currentResults = [];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function calculateLevenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
