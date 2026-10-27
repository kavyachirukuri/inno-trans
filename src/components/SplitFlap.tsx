import { useEffect, useRef, useState } from 'react';

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Airport departure-board letters that flip into each new word. */
export function SplitFlap({ word, size = 9 }: { word: string; size?: number }) {
  const target = word.toUpperCase().padEnd(size, ' ').slice(0, size);
  const [chars, setChars] = useState(target.split(''));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setChars(target.split('')); return; }
    const settle = target.split('').map((_, i) => 3 + i + Math.floor(Math.random() * 3));
    let frame = 0;
    const max = Math.max(...settle);
    const id = setInterval(() => {
      frame++;
      setChars(target.split('').map((c, i) => (frame >= settle[i] ? c : ABC[Math.floor(Math.random() * 26)])));
      if (frame >= max) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span className="flaps" aria-label={word} role="img">
      {chars.map((c, i) => (
        <span className={c === ' ' ? 'flap blank' : 'flap'} key={i} aria-hidden="true">
          <span className="flap-ch" key={c}>{c === ' ' ? '' : c}</span>
        </span>
      ))}
    </span>
  );
}
