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
 * The welcome page is what almost every visitor lands on, so it stays in the
 * first bundle. Everything else is fetched when it is actually navigated to.
 *
 * This is not housekeeping — it is the single biggest thing standing between a
 * phone on hotel wifi and a usable page. The admin markdown editor alone is a
 * quarter of a megabyte gzipped, and it was being downloaded and parsed by
 * every family looking at a boat trip.
 */
const Tours = lazy(() => import('./pages/Tours'));
const Transport = lazy(() => import('./pages/Transport'));
const Blog = lazy(() => import('./pages/Blog'));
const Contact = lazy(() => import('./pages/Contact'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const PlanMyDay = lazy(() => import('./pages/PlanMyDay'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminTransport = lazy(() => import('./pages/AdminTransport'));

/* A route is a page-sized hole, so the placeholder is page-sized too — a
   spinner would flash for longer than most of these chunks take to arrive. */
const RouteFallback = () => <div className="min-h-[60vh]" aria-hidden="true" />;

const App = () => {
  return (
    <PlannerProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          {/* Fixed illustrated scene behind every page */}
          <IllustratedBackdrop />

          <ScrollToHash />
          <Header />
          <main id="top" className="flex-grow relative z-20">
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
                <Route
                  path="/admin/transport"
                  element={<ProtectedRoute component={AdminTransport} />}
                />
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
