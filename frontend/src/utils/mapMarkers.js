const TREE_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dceee6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L7 12h3.5L8 19h8l-2.5-7H17L12 3z"/></svg>`

const PIN_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" stroke-width="2"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5" fill="white" stroke="none"/></svg>`

export function siteMarkerHtml() {
  return `<div class="bg-[#1f5645] rounded-full w-7 h-7 border-2 border-white shadow-lg flex items-center justify-center">${TREE_SVG}</div>`
}

export function punchMarkerHtml() {
  return `<div class="bg-[#34856a] rounded-full w-7 h-7 border-2 border-white shadow-lg flex items-center justify-center">${PIN_SVG}</div>`
}