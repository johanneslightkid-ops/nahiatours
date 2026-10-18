import React from 'react';
import { useI18n } from '../contexts/I18nContext';
import { localeText } from '../lib/localeText';
import PageHeader from '../components/layout/PageHeader';
import { Pineapple, Sailboat } from '../components/ui/Illustrations';
import CartView from '../components/cart/CartView';

/** The shopping cart, in this site's clothes; the cart itself is CartView. */
const Cart = () => {
  const { locale } = useI18n();
  return (
    <div className="pb-20">
      <PageHeader
        tone="lagoon"
        kicker={localeText(locale, { en: 'Your trip', es: 'Tu viaje', de: 'Ihre Reise', fr: 'Votre voyage' })}
        title={localeText(locale, { en: 'Your cart', es: 'Tu carrito', de: 'Ihr Warenkorb', fr: 'Votre panier' })}
        subtitle={localeText(locale, {
          en: 'Everything you set aside, in one place — check the days, the people and the price, then book it all at once.',
          es: 'Todo lo que apartaste, en un solo lugar — revisa días, personas y precio, y resérvalo todo de una vez.',
          de: 'Alles, was Sie vorgemerkt haben, an einem Ort — Tage, Personen und Preis prüfen und alles auf einmal buchen.',
          fr: 'Tout ce que vous avez mis de côté, au même endroit — vérifiez jours, personnes et prix, puis réservez tout d’un coup.',
        })}
        artLeft={<Sailboat className="h-28 w-32 animate-bob" />}
        artRight={<Pineapple className="h-24 w-20 animate-sway" />}
      />
      <div className="section-shell -mt-6">
        <CartView locale={locale} />
      </div>
    </div>
  );
};

export default Cart;
