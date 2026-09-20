import React, { useState } from 'react';
import PasswordModal from './PasswordModal';

interface ProtectedRouteProps {
  component: React.ComponentType;
}

/**
 * The gate in front of the admin.
 *
 * This used to `import Admin from '../pages/Admin'` at the top and never use
 * it, and it extended RouteProps for a `...rest` it also never used. The dead
 * import was not free: it pulled the admin panel — and the 300kB markdown
 * editor inside it — into the entry chunk, for every visitor, including the
 * ones who never open the admin. Both are gone; the component to render now
 * arrives as a prop, lazily, from App.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <PasswordModal onAuthenticate={setIsAuthenticated} />;
  }

  return <Component />;
};

export default ProtectedRoute;
