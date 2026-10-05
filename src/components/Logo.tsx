// Same artwork as public/logo.svg (used for the favicon)
const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-label="TaskMate logo" role="img">
    <rect width="64" height="64" rx="16" fill="#5b6fb5" />
    <path
      d="M18 33.5l9 9L46 23.5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M50 8l1.7 4.3L56 14l-4.3 1.7L50 20l-1.7-4.3L44 14l4.3-1.7z" fill="#ffffff" fillOpacity="0.85" />
  </svg>
);

export default Logo;
