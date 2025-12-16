import { useState } from 'react';
import { changeStudentDob } from '../api/client';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function StudentChangeDob() {
    const [roll, setRoll] = useState('');
    const [newDob, setNewDob] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await changeStudentDob(roll, newDob, code);
            toast.success(response.data.message);
            setRoll(''); setNewDob(''); setCode(''); // Clear form on success
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
             <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Change Password (DOB)</h2>
                    <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">Get a valid, reusable code from your teacher.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Roll Number</label>
                        <input type="number" value={roll} onChange={(e) => setRoll(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Date of Birth (Password)</label>
                        <input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teacher Code</label>
                        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                    </div>
                    <div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                            {loading ? 'Updating...' : 'Change Password'}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-4 text-sm">
                    <Link to="/student" className="font-medium text-accent hover:text-accent-hover">
                        Back to Student Login
                    </Link>
                </div>
            </div>
        </div>
    );
}