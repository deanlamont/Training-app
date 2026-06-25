export default function Logo({ size = 40 }) {
  return (
    <img
      src="/brand/swolebro-icon-clean.png"
      alt="SwoleBro"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  )
}
