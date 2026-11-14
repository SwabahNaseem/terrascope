/**
 * TerraScope Search & Autocomplete Module
 * Handles debounced typing, local fuzzy suggestions, geocoding selection,
 * and keyboard navigation for Indian states, union territories, and districts.
 */

const LOCAL_INDIAN_LOCATIONS = [
  // 28 States
  { name: "Andhra Pradesh", type: "state", code: "IN-AP", coordinates: [15.9129, 79.7400] },
  { name: "Arunachal Pradesh", type: "state", code: "IN-AR", coordinates: [28.2180, 94.7278] },
  { name: "Assam", type: "state", code: "IN-AS", coordinates: [26.2006, 92.9376] },
  { name: "Bihar", type: "state", code: "IN-BR", coordinates: [25.0961, 85.3131] },
  { name: "Chhattisgarh", type: "state", code: "IN-CT", coordinates: [21.2787, 81.8661] },
  { name: "Goa", type: "state", code: "IN-GA", coordinates: [15.2993, 74.1240] },
  { name: "Gujarat", type: "state", code: "IN-GJ", coordinates: [22.2587, 71.1924] },
  { name: "Haryana", type: "state", code: "IN-HR", coordinates: [29.0588, 76.0856] },
  { name: "Himachal Pradesh", type: "state", code: "IN-HP", coordinates: [31.1048, 77.1734] },
  { name: "Jharkhand", type: "state", code: "IN-JH", coordinates: [23.6102, 85.2799] },
  { name: "Karnataka", type: "state", code: "IN-KA", coordinates: [15.3173, 75.7139] },
  { name: "Kerala", type: "state", code: "IN-KL", coordinates: [10.8505, 76.2711] },
  { name: "Madhya Pradesh", type: "state", code: "IN-MP", coordinates: [22.9734, 78.6569] },
  { name: "Maharashtra", type: "state", code: "IN-MH", coordinates: [19.7515, 75.7139] },
  { name: "Manipur", type: "state", code: "IN-MN", coordinates: [24.6637, 93.9063] },
  { name: "Meghalaya", type: "state", code: "IN-ML", coordinates: [25.4670, 91.3662] },
  { name: "Mizoram", type: "state", code: "IN-MZ", coordinates: [23.1645, 92.9376] },
  { name: "Nagaland", type: "state", code: "IN-NL", coordinates: [26.1584, 94.5624] },
  { name: "Odisha", type: "state", code: "IN-OR", coordinates: [20.9517, 85.0985] },
  { name: "Punjab", type: "state", code: "IN-PB", coordinates: [31.1471, 75.3412] },
  { name: "Rajasthan", type: "state", code: "IN-RJ", coordinates: [27.0238, 74.2179] },
  { name: "Sikkim", type: "state", code: "IN-SK", coordinates: [27.5330, 88.5122] },
  { name: "Tamil Nadu", type: "state", code: "IN-TN", coordinates: [11.1271, 78.6569] },
  { name: "Telangana", type: "state", code: "IN-TG", coordinates: [18.1124, 79.0193] },
  { name: "Tripura", type: "state", code: "IN-TR", coordinates: [23.9408, 91.9882] },
  { name: "Uttar Pradesh", type: "state", code: "IN-UP", coordinates: [26.8467, 80.9462] },
  { name: "Uttarakhand", type: "state", code: "IN-UT", coordinates: [30.0668, 79.0193] },
  { name: "West Bengal", type: "state", code: "IN-WB", coordinates: [22.9868, 87.8550] },

  // 8 Union Territories
  { name: "Andaman and Nicobar Islands", type: "ut", code: "IN-AN", coordinates: [11.7401, 92.6586] },
  { name: "Chandigarh", type: "ut", code: "IN-CH", coordinates: [30.7333, 76.7794] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", code: "IN-DH", coordinates: [20.4283, 72.8397] },
  { name: "Delhi", type: "ut", code: "IN-DL", coordinates: [28.7041, 77.1025] },
  { name: "Jammu and Kashmir", type: "ut", code: "IN-JK", coordinates: [33.7782, 76.5762] },
  { name: "Ladakh", type: "ut", code: "IN-LA", coordinates: [34.1526, 77.5771] },
  { name: "Lakshadweep", type: "ut", code: "IN-LD", coordinates: [10.5667, 72.6417] },
  { name: "Puducherry", type: "ut", code: "IN-PY", coordinates: [11.9416, 79.8083] },

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
  { name: "Kolkata", type: "district", parent: "West Bengal", code: "IN-WB", coordinates: [22.5726, 88.3639] },
  { name: "Hyderabad", type: "district", parent: "Telangana", code: "IN-TG", coordinates: [17.3850, 78.4867] }
];

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
    console.warn('[TerraScope Search] Input or dropdown element not found.');
    return;
  }

  // Accessibility attributes
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
          const match = LOCAL_INDIAN_LOCATIONS.find(loc =>
            loc.name.toLowerCase() === query.toLowerCase()
          );
          if (match) {
            selectLocation(match, inputEl, dropdownEl, onSelect);
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
 * Executes fuzzy search across local database and optionally queries backend
 */
async function performSearch(query, inputEl, dropdownEl, onSelect) {
  const lowerQuery = query.toLowerCase();

  // 1. Prioritize exact prefix match, then substring match
  const matches = LOCAL_INDIAN_LOCATIONS.filter(loc => {
    return loc.name.toLowerCase().includes(lowerQuery) ||
           (loc.parent && loc.parent.toLowerCase().includes(lowerQuery));
  }).sort((a, b) => {
    const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
    const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.name.localeCompare(b.name);
  });

  currentResults = matches.slice(0, 8);

  // 2. If results < 3, attempt backend search query if available
  if (currentResults.length < 3) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const backendSuggestions = (data.suggestions || []).map(item => ({
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
    typeBadge.style.fontSize = '0.75rem';
    typeBadge.style.padding = '2px 6px';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.backgroundColor = 'rgba(47, 93, 58, 0.12)';
    typeBadge.style.color = 'var(--primary, #2F5D3A)';
    typeBadge.style.fontWeight = '600';
    typeBadge.textContent = loc.type.toUpperCase();

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
      type: location.type,
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
      item.style.backgroundColor = 'var(--bg-card-hover, #E7DDCA)';
      item.setAttribute('aria-selected', 'true');
      item.scrollIntoView({ block: 'nearest' });
    } else {
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
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
