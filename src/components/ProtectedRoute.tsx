import React, { useState } from 'react';
import { RouteProps } from 'react-router-dom';
import PasswordModal from '../components/PasswordModal';

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component, ...rest }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <PasswordModal onAuthenticate={setIsAuthenticated} />;
  }

  return <Component />;
};

export default ProtectedRoute;