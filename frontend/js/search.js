/**
 * TerraScope Search & Autocomplete Module
 * Handles debounced typing, local fuzzy suggestions, and geocoding selection.
 */

const LOCAL_INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

let debounceTimer = null;

export function initSearch(inputId, dropdownId, onSelect) {
  const inputEl = document.getElementById(inputId);
  const dropdownEl = document.getElementById(dropdownId);

  if (!inputEl || !dropdownEl) return;

  inputEl.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    clearTimeout(debounceTimer);

    if (val.length < 2) {
      dropdownEl.innerHTML = '';
      dropdownEl.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(() => {
      const matches = LOCAL_INDIAN_STATES.filter(s => s.toLowerCase().includes(val));
      renderSuggestions(matches, dropdownEl, onSelect);
    }, 250);
  });
}

function renderSuggestions(matches, dropdownEl, onSelect) {
  dropdownEl.innerHTML = '';
  if (matches.length === 0) {
    dropdownEl.classList.remove('active');
    return;
  }

  matches.slice(0, 6).forEach(stateName => {
    const item = document.createElement('div');
    item.className = 'search-item';
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.textContent = `${stateName} (State)`;

    item.addEventListener('click', () => {
      dropdownEl.classList.remove('active');
      onSelect({ name: stateName, type: 'state' });
    });

    dropdownEl.appendChild(item);
  });

  dropdownEl.classList.add('active');
}
