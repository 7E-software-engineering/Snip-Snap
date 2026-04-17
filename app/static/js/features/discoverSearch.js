// File overview: Implements feature-level frontend workflows and interactions.

async function fetchSearchItems(endpoint) {
  const res = await fetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch search items: ${res.status}`);
  }
  return await res.json();
}

function dedupeAdd(tagList, item) {
  const existing = tagList.get_items();
  const found = existing.some((x) => x.type === item.type && x.id === item.id);
  if (!found) tagList.add_item({ id: item.id, type: item.type, label: item.label });
}

export async function initDiscoverSearch({ mountEl, outEl, tagList, config }) {
  const endpoint = (config && config.endpoint) || "/api/discover/search_items";

  const data = await fetchSearchItems(endpoint);
  const all_items = Array.isArray(data.items) ? data.items : [];

  function onSelect(item) {
    if (outEl) {
      outEl.textContent = `Selected: ${item.label}  (type: ${item.type}, id: ${item.id})`;
    }
    dedupeAdd(tagList, item);
  }

  window.createSearchBarAutocomplete(mountEl, onSelect, all_items, {
    placeholder: "Search tags, barbers, or shops…",
  });
}
