import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginTeacher } from '../api/client';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react';

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
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top bar */}
            <div className="px-6 py-5">
                <Link to="/">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                </Link>
            </div>

            {/* Centered form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                <div className="w-full max-w-sm space-y-10">

                    {/* Icon + heading */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-overlay/[0.07] border border-overlay/10 mx-auto">
                            <Lock className="h-8 w-8 text-text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-text-primary">Teacher Access</h1>
                            <p className="text-sm text-text-muted mt-2 leading-relaxed">Secure login for faculty members</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter your ID"
                        />
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                        <div className="pt-3">
                            <Button type="submit" size="lg" className="w-full gap-2" isLoading={loading}>
                                Sign In <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>

                    <p className="text-center text-xs text-text-muted">
                        Restricted to authorized personnel only.
                    </p>
                </div>
            </div>
        </div>
    );
}
