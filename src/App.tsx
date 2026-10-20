import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToHash from './components/ScrollToHash';
import IllustratedBackdrop from './components/ui/IllustratedBackdrop';
import { PlannerProvider } from './contexts/PlannerContext';
// Asks how it went when a guest comes back from WhatsApp; the prompt itself
// is only fetched when there is something to ask.
import WhatsAppReturnGate from './components/WhatsAppReturnGate';
// Asks "did the payment go through?" when a guest comes back from paying.
import PaymentConfirmGate from './components/payment/PaymentConfirmGate';
// "Inspire me": the full-screen show for the shop's TV. The show itself is a
// separate chunk, fetched the first time somebody switches it on.
import { InspireProvider } from './components/edt/inspire/InspireContext';

/**
 * Every route but the home page is split out.
 *
 * Before this, one bundle held the whole site — including the markdown editor
 * the admin uses, which is over 300 kB gzipped on its own. A visitor landing
 * on the home page from a Google result on a phone was downloading and parsing
 * the tour editor before they could read the headline.
 *
 * Home stays eager because it is the page almost everybody arrives on; making
 * it lazy would only add a round trip in front of the first paint.
 */
const Tours = lazy(() => import('./pages/Tours'));
const Contact = lazy(() => import('./pages/Contact'));
const Admin = lazy(() => import('./pages/Admin'));
const Transport = lazy(() => import('./pages/Transport'));
const Blog = lazy(() => import('./pages/Blog'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const AdminTransport = lazy(() => import('./pages/AdminTransport'));
const PlanMyDay = lazy(() => import('./pages/PlanMyDay'));
const Cart = lazy(() => import('./pages/Cart'));
const About = lazy(() => import('./pages/About'));
const Policy = lazy(() => import('./pages/Policy'));
const AdminDestinations = lazy(() => import('./pages/AdminDestinations'));
const AdminInspire = lazy(() => import('./pages/AdminInspire'));
const AdminLook = lazy(() => import('./pages/AdminLook'));
const AdminTrash = lazy(() => import('./pages/AdminTrash'));
// The receipt shown when a guest comes back from Stripe, AZUL or CardNET.
// Lazy like every other non-home route: nobody lands here first.
const PaymentReturn = lazy(() => import('./components/PaymentReturn'));

/**
 * The gateways send the guest back to the page they booked from — /tours,
 * /transport — with `?paid=&session_id=` (Stripe) or `?payment_ref=` (the
 * banks) on it. The receipt therefore has to be able to open over ANY page,
 * not only at /payment/return, or the guest never sees it and the operator is
 * never told. It is only fetched when one of those parameters is present.
 */
const PaymentReturnGate = () => {
  const { pathname, search } = useLocation();
  if (pathname === '/payment/return') return null;
  const params = new URLSearchParams(search);
  if (!params.has('paid') && !params.has('session_id') && !params.has('payment_ref')) return null;
  return (
    <Suspense fallback={null}>
      <PaymentReturn />
    </Suspense>
  );
};

/**
 * Deliberately blank, and deliberately tall.
 *
 * A spinner between two routes on a fast connection is a flash of anxiety for
 * no information. Reserving the height instead keeps the footer from jumping
 * up the page and back down, which is a layout shift the visitor does feel.
 */
const RouteFallback = () => <div className="min-h-[70vh]" aria-hidden="true" />;

const App = () => {
  return (
    <PlannerProvider>
      <Router>
        <InspireProvider>
        <div className="flex min-h-screen flex-col">
          {/* The painted scene behind every page. */}
          <IllustratedBackdrop />

          <ScrollToHash />
          <PaymentReturnGate />
          <PaymentConfirmGate />
          <WhatsAppReturnGate />
          <Header />
          <main id="top" className="relative z-20 flex-grow">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/plan" element={<PlanMyDay />} />
                <Route path="/tours" element={<Tours />} />
                <Route path="/transport" element={<Transport />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/details/:category/:id" element={<ServiceDetails />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/payment/return" element={<PaymentReturn />} />
                <Route path="/admin" element={<ProtectedRoute component={Admin} />} />
                <Route path="/admin/transport" element={<ProtectedRoute component={AdminTransport} />} />
                <Route path="/admin/destinations" element={<ProtectedRoute component={AdminDestinations} />} />
                <Route path="/admin/inspire" element={<ProtectedRoute component={AdminInspire} />} />
                <Route path="/admin/look" element={<ProtectedRoute component={AdminLook} />} />
                <Route path="/admin/trash" element={<ProtectedRoute component={AdminTrash} />} />
                <Route path="/about" element={<About />} />
                <Route path="/policies/:slug" element={<Policy />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        </InspireProvider>
      </Router>
    </PlannerProvider>
  );
};

export default App;
