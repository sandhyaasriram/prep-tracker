/**
 * Google Sheets icon for export menus.
 */

export function GoogleSheetsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#0F9D58" />
      <rect x="7" y="7" width="10" height="2.5" rx="0.5" fill="#E8F5E9" />
      <rect x="7" y="11" width="10" height="2.5" rx="0.5" fill="#E8F5E9" />
      <rect x="7" y="15" width="10" height="2.5" rx="0.5" fill="#E8F5E9" />
      <rect x="11" y="7" width="2" height="10.5" fill="#E8F5E9" opacity="0.85" />
    </svg>
  );
}
