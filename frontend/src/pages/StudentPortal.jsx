import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginStudent } from '../api';
import toast from 'react-hot-toast';

export default function StudentPortal() {
    const [roll, setRoll] = useState('');
    const [dob, setDob] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await loginStudent(roll, dob);
            localStorage.setItem('studentAuthToken', response.data.access_token);
            toast.success('Login successful!');
            navigate(`/student/dashboard/${roll}`); // Navigate to dashboard
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
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Student Login</h2>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">Log in with your Roll Number and DOB.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Roll Number</label>
                        <input type="number" value={roll} onChange={(e) => setRoll(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth (Password)</label>
                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-4 text-sm">
                    <Link to="/student/change-password" className="font-medium text-accent hover:text-accent-hover">
                        Forgot / Change Password?
                    </Link>
                </div>
            </div>
        </div>
    );
}