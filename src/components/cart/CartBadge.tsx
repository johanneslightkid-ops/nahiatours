import React, { useEffect, useRef } from 'react';
import { useCart } from '../../lib/cart';

/**
 * The number on the cart in the navigation. It pops when the count changes —
 * transform only, so it costs nothing on a slow phone — and is absent while
 * the cart is empty.
 */
const CartBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const items = useCart();
  const count = items.length;
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    const grew = count > previous.current;
    if (count !== previous.current && ref.current && typeof ref.current.animate === 'function') {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) {
        ref.current.animate(
          grew
            ? [{ transform: 'scale(1)' }, { transform: 'scale(1.6) rotate(-12deg)' }, { transform: 'scale(0.9) rotate(6deg)' }, { transform: 'scale(1)' }]
            : [{ transform: 'scale(1)' }, { transform: 'scale(0.7)' }, { transform: 'scale(1)' }],
          { duration: grew ? 520 : 260, easing: 'cubic-bezier(.3,1.6,.5,1)' }
        );
      }
    }
    previous.current = count;
  }, [count]);

  if (count === 0) return null;
  return (
    <span
      ref={ref}
      aria-label={`${count}`}
      data-cart-count={count}
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-hibiscus px-1 text-[0.68rem] font-extrabold leading-5 text-paper shadow-ink-sm ${className}`}
    >
      {count}
    </span>
  );
};

export default CartBadge;
