import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Tours from './pages/Tours';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Transport from './pages/Transport';
import Blog from './pages/Blog';
import ServiceDetails from './pages/ServiceDetails';
import AdminTransport from './pages/AdminTransport';
import PlanMyDay from './pages/PlanMyDay';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToHash from './components/ScrollToHash';
import IllustratedBackdrop from './components/ui/IllustratedBackdrop';
import { PlannerProvider } from './contexts/PlannerContext';

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
          </main>
          <Footer />
        </div>
      </Router>
    </PlannerProvider>
  );
};

export default App;