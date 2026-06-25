import { C } from '../theme'

export default function Logo({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="SwoleBro">
      <circle cx="32" cy="32" r="30" fill={C.surface} stroke={C.border} strokeWidth="1.5" />
      <circle cx="32" cy="30" r="14" fill="#E0A878" />
      <rect x="20" y="20" width="24" height="6" rx="3" fill={C.orange} />
      <rect x="20" y="27" width="11" height="7" rx="2" fill={C.acc} />
      <rect x="33" y="27" width="11" height="7" rx="2" fill={C.acc} />
      <rect x="30" y="29" width="4" height="2" fill={C.acc} />
      <path d="M21 39 C 24 43, 28 43, 32 40 C 36 43, 40 43, 43 39" stroke={C.acc} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}
