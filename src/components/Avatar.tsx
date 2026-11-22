/* eslint-disable @next/next/no-img-element */
export function Avatar({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full shrink-0" />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full shrink-0 bg-accent/20 text-accent grid place-items-center text-xs font-bold"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
