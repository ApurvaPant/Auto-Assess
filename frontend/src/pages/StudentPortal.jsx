import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginStudent } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GraduationCap, ArrowRight } from 'lucide-react';

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
            toast.success('Welcome back!');
            navigate(`/student/dashboard/${roll}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
            {/* Premium Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[120px]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />

            <Card className="w-full max-w-md border-none bg-surface/80 backdrop-blur-2xl shadow-2xl z-10 animate-in fade-in zoom-in duration-500 delay-100">
                <CardHeader className="text-center space-y-4 pb-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 text-white shadow-lg shadow-secondary/30">
                        <GraduationCap className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold text-text-primary tracking-tight">Student Portal</CardTitle>
                        <p className="text-sm text-text-muted mt-2">Access your assignments and results</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <Input
                            label="Roll Number"
                            type="number"
                            value={roll}
                            onChange={(e) => setRoll(e.target.value)}
                            required
                            placeholder="e.g. 101"
                            className="bg-background-dark/50 border-surface-dark focus:border-secondary/50"
                        />
                        <Input
                            label="Date of Birth"
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            required
                            className="bg-background-dark/50 border-surface-dark focus:border-secondary/50"
                        />
                        <Button type="submit" variant="secondary" className="w-full h-11 text-base shadow-glare" isLoading={loading}>
                            Enter Portal <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}