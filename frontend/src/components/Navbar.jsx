import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavItem = ({ to, children }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'text-gray-100 bg-gray-700' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700'
            }`
        }
    >
        {children}
    </NavLink>
);

export default function Navbar({ isTeacher = false }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // Clear teacher token
        navigate('/teacher/login');
    }

    return (
        <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 shadow-md">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <NavLink to={isTeacher ? "/teacher/generate" : "/"} className="text-xl font-bold text-white">
                           AutoAssess
                        </NavLink>
                    </div>
                    {isTeacher && (
                        <div className="flex items-center space-x-2">
                            <NavItem to="/teacher/generate">Generate</NavItem>
                            <NavItem to="/teacher/assign">Assign</NavItem>
                            <NavItem to="/teacher/results">Results</NavItem>
                            <NavItem to="/teacher/codes">Codes</NavItem>
                            <button
                                onClick={handleLogout}
                                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-700 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}