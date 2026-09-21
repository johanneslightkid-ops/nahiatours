import React, { useState } from 'react';
import PasswordModal from '../components/PasswordModal';

interface ProtectedRouteProps {
  component: React.ComponentType;
}

/**
 * The admin gate.
 *
 * This file used to `import Admin from '../pages/Admin'` without ever using
 * it. The import alone was enough to drag the whole admin — and the markdown
 * editor inside it — into the eager bundle, which cancelled out the route
 * splitting in App.tsx. The component arrives as a prop; nothing else is
 * needed here.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <PasswordModal onAuthenticate={setIsAuthenticated} />;
  }

  return <Component />;
};

export default ProtectedRoute;
