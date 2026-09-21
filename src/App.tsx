import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToHash from './components/ScrollToHash';
import IllustratedBackdrop from './components/ui/IllustratedBackdrop';
import { PlannerProvider } from './contexts/PlannerContext';

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
// Where Stripe sends the customer back to. Lazy like every other
// non-home route: nobody lands here first.
const PaymentReturn = lazy(() => import('./components/PaymentReturn'));

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
        <div className="flex min-h-screen flex-col">
          {/* The painted scene behind every page. */}
          <IllustratedBackdrop />

          <ScrollToHash />
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
                <Route path="/payment/return" element={<PaymentReturn />} />
                <Route path="/admin" element={<ProtectedRoute component={Admin} />} />
                <Route path="/admin/transport" element={<ProtectedRoute component={AdminTransport} />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </PlannerProvider>
  );
};

export default App;
