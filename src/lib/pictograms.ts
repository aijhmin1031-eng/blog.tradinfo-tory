// 용어 사전 픽토그램, Term 칩과 /glossary/ 페이지가 공유하는 선화 아이콘 (24×24 viewBox)
export const PICTOGRAMS: Record<string, string> = {
  spread:
    '<path d="M4 6.5 H20 M4 17.5 H20 M12 9 V15 M9.5 11 L12 8.5 L14.5 11 M9.5 13 L12 15.5 L14.5 13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  rate: '<circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="16" r="2.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M17.5 5.5 L6.5 18.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  bond: '<rect x="4" y="6" width="16" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 9.5 V14.5 M17 9.5 V14.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  benchmark:
    '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  wire: '<path d="M3.5 8 L12 3.5 L20.5 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5 V18 M12 9.5 V18 M18.5 9.5 V18 M3.5 20 H20.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M13.2 6 L10.8 9 H13.2 L10.8 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
  hedge:
    '<path d="M3.5 12 A8.5 8.5 0 0 1 20.5 12 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 12 V18.5 Q12 20.5 10 20.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 3.5 V5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  forward:
    '<rect x="4" y="5.5" width="16" height="14" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 9.5 H20 M8 3.5 V7 M16 3.5 V7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M9 14.2 L11.2 16.4 L15.4 12.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  premium:
    '<path d="M12.8 3.5 L20.5 11.2 L11.2 20.5 L3.5 12.8 V3.5 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/>',
  bp: '<path d="M3.5 15 H20.5 M6 15 V11.5 M9.5 15 V13 M13 15 V11.5 M16.5 15 V13 M20 15 V11.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6 8 L9 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  provisional:
    '<path d="M14.5 4.5 L19.5 9.5 L9 20 H4 V15 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12.5 6.5 L17.5 11.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  profitability:
    '<ellipse cx="12" cy="8" rx="6.5" ry="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.5 8 V12 C5.5 13.5 8.4 14.6 12 14.6 C15.6 14.6 18.5 13.5 18.5 12 V8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 18.5 L12 21 L15 18.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  liquidity:
    '<path d="M12 3.5 C12 3.5 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3.5 12 3.5 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 14.5 A2.8 2.8 0 0 0 12 17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  maturity:
    '<path d="M6.5 3.5 H17.5 M6.5 20.5 H17.5 M7.5 3.5 C7.5 9 16.5 9.5 16.5 3.5 M7.5 20.5 C7.5 15 16.5 14.5 16.5 20.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M10.5 18.5 H13.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  lc: '<path d="M6 3.5 H14 L18 7.5 V20.5 H6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 3.5 V7.5 H18" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="13" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.8 15.2 L9.8 18.2 M13.2 15.2 L14.2 18.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  customs:
    '<path d="M4 20.5 V8 M4 9 L19 13.5 M4 12.5 L19 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="4" cy="6.5" r="1.6" fill="currentColor"/>',
  doc: '<path d="M6 3 H14 L18 7 V21 H6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 3 V7 H18 M9 12 H15 M9 16 H15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  coin: '<ellipse cx="12" cy="7" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 7 V13 C5 14.7 8.1 16 12 16 C15.9 16 19 14.7 19 13 V7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5 13 V17 C5 18.7 8.1 20 12 20 C15.9 20 19 18.7 19 17 V13" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  ship: '<path d="M4 13 H20 L18 19 H6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 13 V5 M12 5 L17 8 L12 9.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  scale:
    '<path d="M12 4 V20 M7 20 H17 M5 8 H19 M5 8 L3 13 H7 Z M19 8 L17 13 H21 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
  chartline:
    '<path d="M4 20 V6 M4 20 H20 M8 16 L12 11 L15 14 L20 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  anchor:
    '<circle cx="12" cy="5.5" r="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5 V19 M8.5 10 H15.5 M5 14 C5 17.5 8 19.5 12 19.5 C16 19.5 19 17.5 19 14 M5 14 L3.5 12.5 M5 14 L6.8 13 M19 14 L20.5 12.5 M19 14 L17.2 13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  bank: '<path d="M4 9.5 L12 3.5 L20 9.5 H4 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.5 12 V17.5 M12 12 V17.5 M17.5 12 V17.5 M4 20.5 H20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  shield:
    '<path d="M12 3 L19 6 V12 C19 16.8 15.5 19.8 12 21 C8.5 19.8 5 16.8 5 12 V6 Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 11.8 L11.3 14.1 L15.3 9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  gavel:
    '<path d="M8 6 L12.5 10.5 M10.5 3.5 L15 8 M9.2 4.8 L13.7 9.3 L11.2 11.8 L6.7 7.3 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.8 11 L19.5 17.7 L17.7 19.5 L11 12.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.5 20.5 H11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  globe:
    '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><ellipse cx="12" cy="12" rx="3.8" ry="8.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 12 H20.5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  flags:
    '<path d="M5 20.5 V3.5 M5 4.5 H11.5 L10 7 L11.5 9.5 H5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 20.5 V6.5 M19 7.5 H13.5 L15 10 L13.5 12.5 H19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  container:
    '<rect x="3.5" y="7" width="17" height="10.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.5 9 V15.5 M12 9 V15.5 M16.5 9 V15.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  warehouse:
    '<path d="M3.5 20.5 V9 L12 4 L20.5 9 V20.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/><path d="M8 20.5 V13 H16 V20.5 M8 16.5 H16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  stamp:
    '<path d="M9.5 10.5 C9.5 8 8.5 7 8.5 5.5 A3.5 3.5 0 0 1 15.5 5.5 C15.5 7 14.5 8 14.5 10.5 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M5.5 14.5 C5.5 12.5 7.5 10.5 12 10.5 C16.5 10.5 18.5 12.5 18.5 14.5 V16 H5.5 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4.5 20 H19.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  refund:
    '<path d="M19 12 A7 7 0 1 1 15.5 5.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M15.5 2.5 V6.2 H11.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/><path d="M9 7 V3.5 M12 7 V3.5 M15 7 V3.5 M9 17 V20.5 M12 17 V20.5 M15 17 V20.5 M7 9 H3.5 M7 12 H3.5 M7 15 H3.5 M17 9 H20.5 M17 12 H20.5 M17 15 H20.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};
