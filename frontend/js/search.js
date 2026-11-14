/**
 * TerraScope Search & Autocomplete Module
 * Handles debounced input, all 36 Indian states & UTs, keyboard navigation, and fuzzy geocoding.
 * Matches Technical Specification Section 3.2
 */

export const ALL_INDIAN_STATES_AND_UTS = [
  { name: "Andaman and Nicobar Islands", type: "ut", code: "IN-AN", aliases: ["andaman", "nicobar"] },
  { name: "Andhra Pradesh", type: "state", code: "IN-AP", aliases: ["ap", "andhra"] },
  { name: "Arunachal Pradesh", type: "state", code: "IN-AR", aliases: ["arunachal"] },
  { name: "Assam", type: "state", code: "IN-AS", aliases: ["asom"] },
  { name: "Bihar", type: "state", code: "IN-BR", aliases: [] },
  { name: "Chandigarh", type: "ut", code: "IN-CH", aliases: [] },
  { name: "Chhattisgarh", type: "state", code: "IN-CT", aliases: ["chattisgarh", "cg"] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "ut", code: "IN-DH", aliases: ["daman", "diu", "dadra", "nagar haveli"] },
  { name: "Delhi", type: "ut", code: "IN-DL", aliases: ["nct", "new delhi"] },
  { name: "Goa", type: "state", code: "IN-GA", aliases: [] },
  { name: "Gujarat", type: "state", code: "IN-GJ", aliases: [] },
  { name: "Haryana", type: "state", code: "IN-HR", aliases: [] },
  { name: "Himachal Pradesh", type: "state", code: "IN-HP", aliases: ["himachal", "hp"] },
  { name: "Jammu and Kashmir", type: "ut", code: "IN-JK", aliases: ["j&k", "jammu", "kashmir"] },
  { name: "Jharkhand", type: "state", code: "IN-JH", aliases: [] },
  { name: "Karnataka", type: "state", code: "IN-KA", aliases: [] },
  { name: "Kerala", type: "state", code: "IN-KL", aliases: [] },
  { name: "Ladakh", type: "ut", code: "IN-LA", aliases: ["leh"] },
  { name: "Lakshadweep", type: "ut", code: "IN-LD", aliases: [] },
  { name: "Madhya Pradesh", type: "state", code: "IN-MP", aliases: ["mp"] },
  { name: "Maharashtra", type: "state", code: "IN-MH", aliases: ["bombay", "mumbai"] },
  { name: "Manipur", type: "state", code: "IN-MN", aliases: [] },
  { name: "Meghalaya", type: "state", code: "IN-ML", aliases: [] },
  { name: "Mizoram", type: "state", code: "IN-MZ", aliases: [] },
  { name: "Nagaland", type: "state", code: "IN-NL", aliases: [] },
  { name: "Odisha", type: "state", code: "IN-OR", aliases: ["orissa"] },
  { name: "Puducherry", type: "ut", code: "IN-PY", aliases: ["pondicherry"] },
  { name: "Punjab", type: "state", code: "IN-PB", aliases: [] },
  { name: "Rajasthan", type: "state", code: "IN-RJ", aliases: [] },
  { name: "Sikkim", type: "state", code: "IN-SK", aliases: [] },
  { name: "Tamil Nadu", type: "state", code: "IN-TN", aliases: ["tn", "madras"] },
  { name: "Telangana", type: "state", code: "IN-TG", aliases: ["hyderabad"] },
  { name: "Tripura", type: "state", code: "IN-TR", aliases: [] },
  { name: "Uttar Pradesh", type: "state", code: "IN-UP", aliases: ["up"] },
  { name: "Uttarakhand", type: "state", code: "IN-UT", aliases: ["uttaranchal"] },
  { name: "West Bengal", type: "state", code: "IN-WB", aliases: ["bengal", "wb"] }
];

let debounceTimer = null;
let currentHighlightedIndex = -1;
let currentMatches = [];

/**
 * Initialize search bar and autocomplete functionality
 * @param {string} inputId - ID of input element
 * @param {string} dropdownId - ID of dropdown container element
 * @param {Function} onSelect - Callback when location is selected
 */
export function initSearch(inputId, dropdownId, onSelect) {
  const inputEl = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);

  if (!inputEl || !dropdownEl) {
    console.warn(`[TerraScope Search] Input #${inputId} or Dropdown #${dropdownId} not found.`);
    return;
  }

  // Handle typing input with 250ms debounce
  inputEl.addEventListener('input', (e) => {
    const rawValue = e.target.value.trim();
    clearTimeout(debounceTimer);
    currentHighlightedIndex = -1;

    if (rawValue.length < 2) {
      closeDropdown(dropdownEl);
      return;
    }

    debounceTimer = setTimeout(async () => {
      const query = rawValue.toLowerCase();
      
      // 1. Local search across 36 Indian states and union territories
      const localMatches = ALL_INDIAN_STATES_AND_UTS.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const aliasMatch = item.aliases && item.aliases.some(alias => alias.includes(query));
        return nameMatch || aliasMatch;
      });

      // 2. If results < 3, attempt backend query (graceful offline fallback)
      let combinedResults = [...localMatches];
      if (localMatches.length < 3) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const response = await fetch(`/api/search?q=${encodeURIComponent(rawValue)}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data && data.suggestions && Array.isArray(data.suggestions)) {
              data.suggestions.forEach(s => {
                if (!combinedResults.some(r => r.name.toLowerCase() === s.name.toLowerCase())) {
                  combinedResults.push({
                    name: s.name,
                    type: s.type || 'state',
                    code: s.code || `IN-${s.name.substring(0, 2).toUpperCase()}`
                  });
                }
              });
            }
          }
        } catch {
          // Backend offline or timed out; continue gracefully with local matches
        }
      }

      currentMatches = combinedResults.slice(0, 8);
      renderDropdownItems(currentMatches, rawValue, dropdownEl, inputEl, onSelect);
    }, 250);
  });

  // Keyboard navigation support: ArrowDown, ArrowUp, Enter, Escape
  inputEl.addEventListener('keydown', (e) => {
    if (!dropdownEl.classList.contains('active') || currentMatches.length === 0) {
      return;
    }

    const items = dropdownEl.querySelectorAll('.search-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex + 1) % items.length;
      updateHighlight(items, currentHighlightedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentHighlightedIndex = (currentHighlightedIndex - 1 + items.length) % items.length;
      updateHighlight(items, currentHighlightedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIndex = currentHighlightedIndex >= 0 ? currentHighlightedIndex : 0;
      if (currentMatches[targetIndex]) {
        selectLocation(currentMatches[targetIndex], dropdownEl, inputEl, onSelect);
      }
    } else if (e.key === 'Escape') {
      closeDropdown(dropdownEl);
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      closeDropdown(dropdownEl);
    }
  });
}

/**
 * Render matched locations in dropdown
 */
function renderDropdownItems(matches, rawQuery, dropdownEl, inputEl, onSelect) {
  dropdownEl.innerHTML = '';

  if (matches.length === 0) {
    const noRes = document.createElement('div');
    noRes.className = 'search-no-results';
    noRes.textContent = `No matching Indian state or territory for "${rawQuery}"`;
    dropdownEl.appendChild(noRes);
    dropdownEl.classList.add('active');
    return;
  }

  matches.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'search-item';
    row.setAttribute('role', 'option');
    row.id = `search-item-${index}`;

    // Substring highlight formatting
    const regex = new RegExp(`(${escapeRegExp(rawQuery)})`, 'gi');
    const highlightedName = item.name.replace(regex, '<mark class="match-highlight">$1</mark>');
    const typeLabel = item.type === 'ut' ? 'Union Territory' : 'State';

    row.innerHTML = `
      <span>${highlightedName}</span>
      <span class="item-type-badge">${typeLabel}</span>
    `;

    row.addEventListener('click', () => {
      selectLocation(item, dropdownEl, inputEl, onSelect);
    });

    row.addEventListener('mouseenter', () => {
      currentHighlightedIndex = index;
      const allItems = dropdownEl.querySelectorAll('.search-item');
      allItems.forEach((el, i) => el.classList.toggle('highlighted', i === index));
    });

    dropdownEl.appendChild(row);
  });

  dropdownEl.classList.add('active');
}

/**
 * Handle selection of an item
 */
function selectLocation(item, dropdownEl, inputEl, onSelect) {
  inputEl.value = item.name;
  closeDropdown(dropdownEl);
  if (onSelect) {
    onSelect({
      name: item.name,
      type: 'state', // Always treat as state/territory spatial polygon for map zoom
      code: item.code
    });
  }
}

/**
 * Updates highlighted element in dropdown
 */
function updateHighlight(items, targetIndex) {
  items.forEach((item, idx) => {
    if (idx === targetIndex) {
      item.classList.add('highlighted');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('highlighted');
    }
  });
}

/**
 * Close search dropdown
 */
function closeDropdown(dropdownEl) {
  dropdownEl.innerHTML = '';
  dropdownEl.classList.remove('active');
  currentHighlightedIndex = -1;
  currentMatches = [];
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
