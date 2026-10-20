import React from 'react';
import TransferConfigAdminPanel from '../components/admin/TransferConfigAdminPanel';
import VehicleAdminPanel from '../components/admin/VehicleAdminPanel';
import MunicipioPriceAdminPanel from '../components/admin/MunicipioPriceAdminPanel';

/**
 * Admin › Transport. The fleet first — each vehicle with its public page, in
 * one card (VehicleAdminPanel) — then the numbers the price calculator uses.
 * There is no separate tours-style "Transporte" list any more: it edited the
 * same vehicles' pages a second way.
 */
const AdminTransport: React.FC = () => (
  <div className="min-h-screen bg-paper-warm py-6">
    <div className="container mx-auto space-y-8 px-4">
      <VehicleAdminPanel />
      <TransferConfigAdminPanel />
      <MunicipioPriceAdminPanel />
    </div>
  </div>
);

export default AdminTransport;
