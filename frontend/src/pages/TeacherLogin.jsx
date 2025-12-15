import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginTeacher } from '../api';
import toast from 'react-hot-toast';

export default function TeacherLogin() {
    const [username, setUsername] = useState('teacher');
    const [password, setPassword] = useState('teachpass');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await loginTeacher(username, password);
            login(response.data.access_token);
            toast.success('Login successful!');
            navigate('/teacher/generate'); // Go to Generate page after login
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
             <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Teacher Login</h2>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">Access the dashboard.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}