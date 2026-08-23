import { labelColorFor } from "@/core/contrast";
import type { RenderedStop } from "@/core/render";

/** One tile per Socket, in ladder order, labelled with its number and hex value. */
export function ColorTiles({ stops }: { stops: readonly RenderedStop[] }) {
  return (
    <ol className="flex flex-col gap-px sm:flex-row">
      {stops.map(({ socket, color }) => (
        <li
          key={socket.number}
          className="flex flex-1 flex-col justify-end gap-0.5 p-3 font-mono text-sm sm:aspect-square"
          style={{ backgroundColor: color.hex, color: labelColorFor(color.hex) }}
        >
          <span className="font-semibold">{socket.number}</span>
          <span className="opacity-80">{color.hex}</span>
        </li>
      ))}
    </ol>
  );
}
