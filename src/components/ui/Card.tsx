// The single card primitive for the whole app — every screen used to hand-roll
// "bg-white rounded-xl border" with slightly different radii/borders each time.
// One shadow-based surface instead of a border reads calmer and more premium,
// and centralizing it means a future tweak (e.g. radius) happens in one place.
export default function Card({ children, className = "", padded = true }: {
  children: React.ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl ${padded ? "p-4" : ""} ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(20,24,31,0.04), 0 8px 24px rgba(20,24,31,0.04)" }}
    >
      {children}
    </div>
  );
}
