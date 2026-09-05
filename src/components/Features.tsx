import React from 'react';
import { FormattedMessage } from 'react-intl';
import { MdSecurityUpdateGood, MdElectricBolt, MdDirectionsBus } from 'react-icons/md';

const Features = () => {
  return (
    <section className="py-20">
      <div className="section-shell">
        <div className="mb-14 text-center">
          <h2 className="text-5xl font-bold text-ink">
            <FormattedMessage id="features.title" />
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[{
            icon: <MdSecurityUpdateGood className="h-10 w-10 text-lagoon-dark" />,
            title: 'features.safety.title',
            text: 'features.safety.description',
          }, {
            icon: <MdElectricBolt className="h-10 w-10 text-blue-700" />,
            title: 'features.experiences.title',
            text: 'features.experiences.description',
          }, {
            icon: <MdDirectionsBus className="h-10 w-10 text-mango-dark" />,
            title: 'features.transportation.title',
            text: 'features.transportation.description',
          }].map((item) => (
            <article key={item.title} className="glass-card rounded-3xl p-8 text-center">
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-white shadow">{item.icon}</div>
              <h3 className="mb-3 text-2xl font-bold text-ink">
                <FormattedMessage id={item.title} />
              </h3>
              <p className="text-ink-soft">
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
