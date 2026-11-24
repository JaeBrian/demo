import { useEffect, useRef, useSyncExternalStore } from "react";
import { createRobotDingo } from "../../lib/chain/robotDingo";

// Matches the rule in ui.css that shows it. Below this the scene is never built.
const ROOM = "(min-width: 901px) and (min-height: 760px)";
const subscribe = (notify: () => void) => {
  const query = window.matchMedia?.(ROOM);
  query?.addEventListener("change", notify);
  return () => query?.removeEventListener("change", notify);
};
const hasRoom = () =>
  "WebGLRenderingContext" in window && (window.matchMedia?.(ROOM).matches ?? false);

/** Decorative. The sidebar footer beside it carries the same words for readers. */
export default function RobotDingo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useSyncExternalStore(subscribe, hasRoom, () => false);
  useEffect(() => {
    if (!canvas.current || !shown) return;
    const scene = createRobotDingo(canvas.current, {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      label: "Powered by Dingo",
    });
    return () => scene.dispose();
  }, [shown]);
  if (!shown) return null;
  return <canvas ref={canvas} className="robot-dingo" aria-hidden="true" />;
}
