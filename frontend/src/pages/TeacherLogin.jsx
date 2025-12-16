import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginTeacher } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, ArrowRight } from 'lucide-react';

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
            toast.success('Welcome back, Professor.');
            navigate('/teacher/generate');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
            {/* Premium Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px]" />

            <Card className="w-full max-w-md border-none bg-surface/80 backdrop-blur-2xl shadow-2xl z-10 animate-in fade-in zoom-in duration-500">
                <CardHeader className="text-center space-y-4 pb-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/50 text-white shadow-lg shadow-primary/30">
                        <Lock className="h-8 w-8" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold text-text-primary tracking-tight">Teacher Access</CardTitle>
                        <p className="text-sm text-text-muted mt-2">Secure login for faculty members</p>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter your ID"
                            className="bg-background-dark/50 border-surface-dark focus:border-primary/50"
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="bg-background-dark/50 border-surface-dark focus:border-primary/50"
                        />
                        <Button type="submit" className="w-full h-11 text-base shadow-glare" isLoading={loading}>
                            Sign In <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-text-muted">
                            Restricted to authorized personnel only.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}