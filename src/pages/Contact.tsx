import React from 'react';
import { FormattedMessage } from 'react-intl';
import ContactForm from '../components/ContactForm';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Toucan, Hibiscus } from '../components/ui/Illustrations';
import QuickPay from '../components/payment/QuickPay';

const Contact = () => {
  const { brandSettings } = useBrand();

  return (
    <div className="pb-20">
      <PageHeader
        tone="mango"
        kicker="Say hola"
        title={<FormattedMessage id="contact.title" />}
        subtitle={<FormattedMessage id="contact.description" />}
        artLeft={<Toucan className="h-28 w-32 animate-bob" />}
        artRight={<Hibiscus className="h-24 w-24 animate-sway" />}
      />

      <div className="section-shell -mt-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ContactForm />
          <div className="glass-card rounded-3xl p-8">
            <h2 className="mb-5 font-display text-3xl font-extrabold text-ink"><FormattedMessage id="contact.getInTouch" /></h2>
            <p className="mb-2 text-ink-soft"><FormattedMessage id="contact.addressLabel" />: Bávaro, Punta Cana</p>
            <p className="mb-6 text-ink-soft"><FormattedMessage id="contact.phoneLabel" />: {brandSettings.phoneNumber}</p>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d60530.5!2d-68.4156!3d18.6945!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ea891645dcbfe77%3A0x4877e4aeefa14d62!2sEl%20Cortecito%2C%20Punta%20Cana!5e0!3m2!1sen!2sdo!4v1234567890123!5m2!1sen!2sdo"
              width="100%"
              height="280"
              className="mt-6 rounded-2xl ring-1 ring-ink/10"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Punta Cana Location"
            ></iframe>
          </div>
        </div>

        {/* Any amount, by card or PayPal — the deposit buttons that used to
            sit beside the map, grown into a widget that also takes links
            from the WhatsApp return prompt (/contact?pay=…&ref=…#pay). */}
        <div className="mt-10">
          <QuickPay />
        </div>
      </div>
    </div>
  );
};

export default Contact;
