/* eslint-disable @next/next/no-img-element */
export function Avatar({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, background: "var(--ring)", color: "var(--cyan)" }}
      className="shrink-0 grid place-items-center text-lg"
    >
      {name.slice(0, 1)}
    </span>
  );
}
