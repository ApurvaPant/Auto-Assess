import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // Redirect to teacher login if not authenticated
        return <Navigate to="/teacher/login" replace />;
    }

    return children; // Render the protected teacher page
};

export default ProtectedRoute;