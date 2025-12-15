import { useEffect, useState } from 'react';
import { getTeacherCodes } from '../../api';
import toast from 'react-hot-toast';

// Helper component for each code line
const CodeLine = ({ codeLine, mode }) => {
    const [isUsed, setIsUsed] = useState(false);
    
    // Parse the line to check 'Used' status
    useEffect(() => {
        if (mode === 'production' && codeLine.includes('Used: True')) {
            setIsUsed(true);
        } else if (mode === 'plaintext' && codeLine.startsWith('Roll:')) {
            // In dev mode, we just show the code
        }
    }, [codeLine, mode]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Code copied!');
    };

    // Attempt to parse the line for better formatting
    let displayLine = codeLine;
    let codeToCopy = codeLine;
    if (mode === 'plaintext' && codeLine.includes('|')) {
        const parts = codeLine.split('|').map(s => s.trim());
        if (parts.length === 3) {
            displayLine = `${parts[0]} | ${parts[1]} | ${parts[2]}`;
            codeToCopy = parts[2].replace('Code: ', ''); // Just copy the code
        }
    }

    return (
        <div className={`flex justify-between items-center p-2 rounded ${isUsed ? 'opacity-50' : 'opacity-100'}`}>
            <pre className="text-sm text-gray-800 dark:text-gray-200">
                <code>{displayLine}</code>
            </pre>
            <div className="flex items-center space-x-3">
                {mode === 'production' ? (
                    isUsed ? (
                        <span title="Code has been used" className="text-xl">✅</span>
                    ) : (
                        <span title="Code not used" className="text-xl">❌</span>
                    )
                ) : (
                    <button 
                        onClick={() => handleCopy(codeToCopy)} 
                        className="text-xs text-gray-400 hover:text-accent"
                    >
                        Copy Code
                    </button>
                )}
            </div>
        </div>
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
        <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Student Password Codes</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                A unique, single-use code has been generated for each student.
            </p>
            
            {loading ? (
                <div className="text-center p-8"><p className="text-gray-500 dark:text-gray-400">Loading codes...</p></div>
            ) : (
                <div className="mt-6">
                    {codesData.mode === 'plaintext' && (
                        <div className="p-4 mb-4 text-sm text-blue-800 dark:text-blue-200 rounded-lg bg-blue-50 dark:bg-gray-900 border border-blue-300 dark:border-blue-800" role="alert">
                            Displaying plaintext codes from seed file.
                        </div>
                    )}
                    {codesData.mode === 'production' && (
                        <div className="p-4 mb-4 text-sm text-yellow-800 dark:text-yellow-200 rounded-lg bg-yellow-50 dark:bg-gray-900 border border-yellow-300 dark:border-yellow-800" role="alert">
                            Displaying live status from database. Codes will appear 'Used' after a student changes their password.
                        </div>
                    )}

                    <div className="space-y-1 max-h-96 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        {codesData.codes.map((codeLine, index) => (
                            <CodeLine key={index} codeLine={codeLine} mode={codesData.mode} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}