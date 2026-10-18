import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FaCartPlus, FaCheck } from 'react-icons/fa';
import { addToCart, cartKey, isInCart, NewCartItem, useCart } from '../../lib/cart';
import { localeText } from '../../lib/localeText';
import { playClickFx } from '../../lib/soundEngine';

/**
 * "Add to cart", next to "Book & pay": the same choice — this tour, this day,
 * this many people — set aside to book together with the rest. Adding the
 * same tour for the same day again updates it rather than doubling it.
 */
interface Props {
  /** Built at click time, so it carries the date and head count chosen then. */
  item: () => NewCartItem | null;
  locale: string;
  className?: string;
  disabled?: boolean;
}

const AddToCartButton: React.FC<Props> = ({ item, locale, className = '', disabled = false }) => {
  const items = useCart();
  const [toast, setToast] = useState('');
  const current = item();
  const key = current ? current.key ?? cartKey(current.category, current.serviceId ?? current.title, current.date) : '';
  const inCart = Boolean(key) && isInCart(items, key);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const t = {
    add: localeText(locale, { en: 'Add to cart', es: 'Añadir al carrito', de: 'In den Warenkorb', fr: 'Ajouter au panier' }),
    update: localeText(locale, { en: 'In your cart — update', es: 'En tu carrito — actualizar', de: 'Im Warenkorb — aktualisieren', fr: 'Dans le panier — mettre à jour' }),
    added: localeText(locale, { en: 'Added to your cart', es: 'Añadido a tu carrito', de: 'Zum Warenkorb hinzugefügt', fr: 'Ajouté au panier' }),
    view: localeText(locale, { en: 'View cart', es: 'Ver carrito', de: 'Warenkorb ansehen', fr: 'Voir le panier' }),
  };

  const onClick = () => {
    const next = item();
    if (!next) return;
    playClickFx();
    const line = addToCart(next);
    setToast(line.title);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !current}
        data-add-to-cart
        className={
          className ||
          `inline-flex w-full items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-extrabold transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
            inCart ? 'border-jungle/40 bg-jungle-light/30 text-jungle-dark' : 'border-ink/20 bg-paper/80 text-ink hover:border-ink/50'
          }`
        }
      >
        {inCart ? <FaCheck className="h-3.5 w-3.5" /> : <FaCartPlus className="h-4 w-4" />}
        <span>{inCart ? t.update : t.add}</span>
      </button>
      {toast &&
        createPortal(
          <div role="status" className="fixed inset-x-0 bottom-5 z-[99990] flex justify-center px-4" style={{ pointerEvents: 'none' }}>
            <div className="flex max-w-md items-center gap-3 rounded-full bg-ink px-4 py-2.5 text-sm text-paper shadow-ink-sm" style={{ pointerEvents: 'auto' }}>
              <FaCheck className="h-3.5 w-3.5 shrink-0 text-jungle-light" />
              <span className="min-w-0 truncate">
                {t.added}: <strong>{toast}</strong>
              </span>
              <Link to="/cart" className="shrink-0 rounded-full bg-mango px-3 py-1 text-xs font-extrabold text-ink" onClick={() => setToast('')}>
                🛒 {t.view}
              </Link>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default AddToCartButton;
