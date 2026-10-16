import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import TourCard from '../components/TourCard';
import { Tour, getTours, getServiceSlug } from '../services/toursService';
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Sailboat, Pineapple } from '../components/ui/Illustrations';

const Tours: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTours();
  }, [locale]);

  const loadTours = async () => {
    setLoading(true);
    const fetchedTours = await getTours(locale);
    setTours(fetchedTours);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-xl font-extrabold text-ink">
        Loading…
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader
        tone="lagoon"
        kicker="Pick your day"
        title={<FormattedMessage id="tours.title" />}
        subtitle={
          <FormattedMessage id="tours.dynamicSubtitle" values={{ brand: brandSettings.brandName }} />
        }
        artLeft={<Sailboat className="h-32 w-32 animate-bob" />}
        artRight={<Pineapple className="h-28 w-24 animate-sway" />}
      />

      <div className="section-shell -mt-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour, index) => (
            <TourCard
              key={tour.id}
              image={tour.image}
              title={tour.title}
              description={tour.description}
              price={tour.price}
              pricingOptions={tour.pricingOptions}
              excursionName={tour.title}
              detailsPath={`/details/tours/${getServiceSlug(tour)}`}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tours;

