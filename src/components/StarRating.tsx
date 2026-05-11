import { Star } from "lucide-react";
import { useState } from "react";

export function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  const full = Math.round(value);
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= full ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

export function StarPicker({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
          aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={i <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}