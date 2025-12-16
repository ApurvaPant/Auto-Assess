import { useEffect, useState } from 'react';
import { getTeacherCodes } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { CheckCircle, XCircle, Copy, Key } from 'lucide-react';

// Helper component for each code row
const CodeRow = ({ codeLine, mode }) => {
    const [isUsed, setIsUsed] = useState(false);
    const [rollNo, setRollNo] = useState('');
    const [name, setName] = useState('');
    const [usesRemaining, setUsesRemaining] = useState(2);

    useEffect(() => {
        // Parse Roll - works for both formats
        const rollMatch = codeLine.match(/Roll:\s*(\d+)/);
        if (rollMatch) setRollNo(rollMatch[1]);

        // Parse Name - for production mode (Name:) or Username for plaintext mode
        const nameMatch = codeLine.match(/(?:Name|Username):\s*([^|]+)/);
        if (nameMatch) setName(nameMatch[1].trim());

        // Parse Uses remaining (production mode format: "Uses: X/2")
        const usesMatch = codeLine.match(/Uses:\s*(\d+)\/2/);
        if (usesMatch) setUsesRemaining(parseInt(usesMatch[1]));

        // Check for used status - only in production mode (has "Used:" field)
        if (mode === 'production' && codeLine.toLowerCase().includes('used: true')) {
            setIsUsed(true);
        }
    }, [codeLine, mode]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Code copied!');
    };

    // Extract plain code for copy
    let codeToCopy = codeLine;
    if (mode === 'plaintext' && codeLine.includes('|')) {
        const parts = codeLine.split('|').map(s => s.trim());
        if (parts.length === 3) {
            codeToCopy = parts[2].replace('Code: ', '');
        }
    }

    return (
        <tr className={`border-b border-white/5 ${isUsed ? 'opacity-60' : ''}`}>
            <td className="py-3 px-4 text-sm text-text-primary font-mono">{rollNo || '—'}</td>
            <td className="py-3 px-4 text-sm text-text-muted">{name || '—'}</td>
            <td className="py-3 px-4 text-center">
                {mode === 'production' ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${usesRemaining === 2 ? 'bg-success/10 text-success' :
                        usesRemaining === 1 ? 'bg-warning/10 text-warning' :
                            'bg-error/10 text-error'
                        }`}>
                        {usesRemaining}/2 uses left
                    </span>
                ) : (
                    <span className="text-xs text-text-muted">Dev Mode</span>
                )}
            </td>
            <td className="py-3 px-4 text-center">
                {isUsed ? (
                    <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-xs">Changed</span>
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-text-muted">
                        <XCircle className="h-5 w-5 opacity-50" />
                        <span className="text-xs">Pending</span>
                    </span>
                )}
            </td>
            <td className="py-3 px-4 text-right">
                {mode === 'plaintext' && (
                    <button
                        onClick={() => handleCopy(codeToCopy)}
                        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                    >
                        <Copy className="h-3 w-3" /> Copy
                    </button>
                )}
            </td>
        </tr>
    );
};


export default function ViewCodes() {
    const [codesData, setCodesData] = useState({ codes: [], mode: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCodes = async () => {
            try {
                const response = await getTeacherCodes();
                setCodesData(response.data);
            } catch (error) {
                toast.error('Failed to fetch teacher codes.');
            } finally {
                setLoading(false);
            }
        };
        fetchCodes();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Student Password Codes</h1>
                <p className="text-text-muted mt-1">Manage single-use codes for student password changes.</p>
            </div>

            <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-text-primary">Password Reset Codes</CardTitle>
                            <p className="text-xs text-text-muted">
                                {codesData.mode === 'plaintext' ? 'Development mode - showing seed codes' : 'Live database status'}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-text-muted">Loading codes...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wider text-text-muted bg-surface-dark/50">
                                        <th className="py-3 px-4 font-medium">Roll No</th>
                                        <th className="py-3 px-4 font-medium">Name</th>
                                        <th className="py-3 px-4 font-medium text-center">Uses Left</th>
                                        <th className="py-3 px-4 font-medium text-center">Status</th>
                                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codesData.codes.map((codeLine, index) => (
                                        <CodeRow key={index} codeLine={codeLine} mode={codesData.mode} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}