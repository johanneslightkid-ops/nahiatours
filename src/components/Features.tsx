import React from 'react';
import { FormattedMessage } from 'react-intl';
import { MdSecurityUpdateGood, MdElectricBolt, MdDirectionsBus } from 'react-icons/md';

const Features = () => {
  return (
    <section className="home-section shore-section wavy-band relative py-24">
      <div className="section-shell relative z-10">
        <div className="mb-14 text-center">
          <h2 className="scribble-title-bg mx-auto font-display text-4xl leading-tight text-ink sm:text-5xl">
            <FormattedMessage id="features.title" />
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[{
            icon: <MdSecurityUpdateGood className="h-10 w-10 text-lagoon-dark" />,
            title: 'features.safety.title',
            text: 'features.safety.description',
          }, {
            icon: <MdElectricBolt className="h-10 w-10 text-sunset-dark" />,
            title: 'features.experiences.title',
            text: 'features.experiences.description',
          }, {
            icon: <MdDirectionsBus className="h-10 w-10 text-mango-dark" />,
            title: 'features.transportation.title',
            text: 'features.transportation.description',
          }].map((item) => (
            <article key={item.title} className="booking-card rounded-3xl p-8 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-white to-lagoon-light/45 shadow-md ring-1 ring-white/80">
                {item.icon}
              </div>
              <h3 className="mb-3 font-display text-2xl text-ink">
                <FormattedMessage id={item.title} />
              </h3>
              <p className="leading-relaxed text-ink-soft">
                <FormattedMessage id={item.text} />
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
