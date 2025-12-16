import { useEffect, useState } from 'react';
import { getPackages, createAssignment } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle } from 'lucide-react';

const getDifficultyBadge = (difficulty) => {
    const colors = {
        easy: 'bg-success/20 text-success border-success/30',
        medium: 'bg-warning/20 text-warning border-warning/30',
        hard: 'bg-error/20 text-error border-error/30'
    };
    return colors[difficulty] || colors.easy;
};

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
        <Card className="shadow-soft">
            <CardHeader>
                <CardTitle className="text-xl text-text-primary">Create New Assignment</CardTitle>
                <p className="text-sm text-text-muted">Select packages to include. The system will auto-distribute them to all students.</p>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Assignment Name"
                        type="text"
                        placeholder="e.g., Midterm Practice 1"
                        className="max-w-md"
                        value={assignmentName}
                        onChange={(e) => setAssignmentName(e.target.value)}
                    />

                    <div>
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            Available Packages
                            <span className="text-sm font-normal text-text-muted">({packages.length})</span>
                        </h3>

                        {/* Minimal scrollbar container */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-4 bg-background/50 rounded-xl border border-white/5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                            {packages.length === 0 && (
                                <p className="text-text-muted col-span-full text-center py-8">
                                    No packages found. Try generating some on the 'Generate' page.
                                </p>
                            )}
                            {packages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className={`p-4 bg-surface rounded-lg cursor-pointer transition-all border-2 ${selectedPackages.has(pkg.id)
                                            ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                                            : 'border-transparent hover:border-white/10'
                                        }`}
                                    onClick={() => handleSelectPackage(pkg.id)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-text-primary truncate">
                                                {pkg.title || '[Untitled Question]'}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                {/* Colored difficulty badge */}
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getDifficultyBadge(pkg.difficulty)}`}>
                                                    {pkg.difficulty}
                                                </span>
                                                <span className="text-xs text-text-muted">
                                                    {pkg.testcases?.length || 0} tests
                                                </span>
                                            </div>
                                        </div>
                                        {selectedPackages.has(pkg.id) && (
                                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" isLoading={loading} className="shadow-lg shadow-primary/25">
                            Create Assignment ({selectedPackages.size} selected)
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
