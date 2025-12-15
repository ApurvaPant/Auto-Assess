import { useEffect, useState } from 'react';
import { getPackages, createAssignment } from '../../api';
import toast from 'react-hot-toast';

export default function CreateAssignment() {
    const [packages, setPackages] = useState([]);
    const [selectedPackages, setSelectedPackages] = useState(new Set());
    const [assignmentName, setAssignmentName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await getPackages();
                console.log("Data from getPackages API:", response.data);
                setPackages(response.data);
            } catch (error) {
                toast.error('Failed to fetch question packages.');
            }
        };
        fetchPackages();
    }, []);

    const handleSelectPackage = (packageId) => {
        const newSelection = new Set(selectedPackages);
        if (newSelection.has(packageId)) {
            newSelection.delete(packageId);
        } else {
            newSelection.add(packageId);
        }
        setSelectedPackages(newSelection);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedPackages.size === 0 || !assignmentName) {
            toast.error('Please name the assignment and select at least one package.');
            return;
        }
        setLoading(true);
        try {
            await createAssignment(assignmentName, Array.from(selectedPackages));
            toast.success(`Assignment '${assignmentName}' created successfully!`);
            setAssignmentName('');
            setSelectedPackages(new Set());
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create assignment.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Assignment</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Select packages to include. The system will auto-distribute them to all students.</p>
            
            <form onSubmit={handleSubmit} className="mt-6">
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignment Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Midterm Practice 1"
                        className="mt-1 block w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" 
                        value={assignmentName}
                        onChange={(e) => setAssignmentName(e.target.value)}
                    />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8">Available Packages ({packages.length})</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                    {packages.length === 0 && <p className="text-gray-500 dark:text-gray-400 col-span-full text-center py-4">No packages found. Try generating some on the 'Generate' page.</p>}
                    {packages.map((pkg) => (
                         <div 
                            key={pkg.id} 
                            className={`p-4 bg-white dark:bg-gray-800 border rounded-lg cursor-pointer transition-all ${selectedPackages.has(pkg.id) ? 'border-accent ring-2 ring-accent' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`} 
                            onClick={() => handleSelectPackage(pkg.id)}
                         >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{pkg.title || '[Untitled Question]'}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{pkg.difficulty}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-end">
                    <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50" disabled={loading}>
                        {loading ? 'Creating...' : `Create Assignment (${selectedPackages.size} selected)`}
                    </button>
                </div>
            </form>
        </div>
    );
}