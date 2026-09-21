import React, { useCallback, useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import ServiceAdminPanel from '../components/admin/ServiceAdminPanel';
import TransferConfigAdminPanel from '../components/admin/TransferConfigAdminPanel';
import VehicleAdminPanel from '../components/admin/VehicleAdminPanel';
import MunicipioPriceAdminPanel from '../components/admin/MunicipioPriceAdminPanel';
import { getTransportServices, saveTransportServices, Tour } from '../services/toursService';

const AdminTransport: React.FC = () => {
  const { locale } = useI18n();
  const [services, setServices] = useState<Tour[]>([]);

  const loadServices = useCallback(async () => {
    const fetchedServices = await getTransportServices(locale);
    setServices(fetchedServices);
  }, [locale]);

  return (
    <div className="min-h-screen bg-paper-warm py-8">
      <div className="container mx-auto px-4 space-y-8">
        {/* The fleet comes first: it is the thing with pictures, and the
            pricing panels below are meaningless until the vehicles exist. */}
        <VehicleAdminPanel />
        <TransferConfigAdminPanel />
        <MunicipioPriceAdminPanel />
        <ServiceAdminPanel
          title="Transporte"
          category="transport"
          services={services}
          setServices={setServices}
          loadServices={loadServices}
          saveServices={(nextServices) => saveTransportServices(nextServices, locale)}
          siblingAdminPath="/admin"
          siblingAdminLabel="Ir a Excursiones"
        />
      </div>
    </div>
  );
};

export default AdminTransport;
