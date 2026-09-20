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
 * Routes are split; the home page is not.
 *
 * Everything used to be in one bundle, which meant a visitor landing on the
 * home page downloaded and parsed the markdown editor the admin panel uses,
 * the planner engine, the map and the route calculator before they could read
 * a headline. On hotel wifi, on a phone, that is the whole first impression.
 *
 * Home stays in the entry chunk because it is where almost everyone arrives
 * and a lazy boundary there would only add a flash of nothing. Every other
 * route is fetched when somebody actually navigates to it — and the admin
 * bundle, which is the largest by far, now loads for the one person who signs
 * in rather than for every visitor.
 */
const PlanMyDay = lazy(() => import('./pages/PlanMyDay'));
const Tours = lazy(() => import('./pages/Tours'));
const Transport = lazy(() => import('./pages/Transport'));
const Blog = lazy(() => import('./pages/Blog'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const Contact = lazy(() => import('./pages/Contact'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminTransport = lazy(() => import('./pages/AdminTransport'));

/**
 * Deliberately almost nothing: a spinner that appears for 200ms and vanishes
 * is noise. The canvas is already painted behind this, so an empty block of
 * the right height reads as a page still arriving rather than as a fault.
 */
const RouteFallback = () => <div className="min-h-[60vh]" aria-busy="true" />;

const App = () => {
  return (
    <PlannerProvider>
      <Router>
        <div className="flex min-h-screen flex-col">
          {/* The fixed painting behind every page. */}
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
