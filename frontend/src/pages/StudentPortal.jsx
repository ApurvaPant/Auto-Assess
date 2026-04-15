import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginStudent, signupStudent, uploadStudentPhoto } from '../api/client';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTheme } from '../contexts/ThemeContext';
import { GraduationCap, ArrowRight, ArrowLeft, Sun, Moon, Camera, User } from 'lucide-react';

export default function StudentPortal() {
    const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be smaller than 2 MB.');
            return;
        }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await loginStudent(email, password);
            localStorage.setItem('studentAuthToken', response.data.access_token);
            toast.success('Welcome back!');
            navigate('/student/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await signupStudent(email, name, password);
            localStorage.setItem('studentAuthToken', response.data.access_token);
            if (photoFile) {
                try {
                    await uploadStudentPhoto(photoFile);
                } catch {
                    // Photo upload failing shouldn't block signup
                }
            }
            toast.success('Account created successfully!');
            navigate('/student/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Sign up failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top bar */}
            <div className="px-6 py-5 flex items-center justify-between">
                <Link to="/">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-9 w-9 text-text-muted hover:text-text-primary"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
            </div>

            {/* Centered form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                <div className="w-full max-w-sm space-y-10">

                    {/* Icon + heading */}
                    <div className="text-center space-y-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-overlay/[0.07] border border-overlay/10 mx-auto">
                            <GraduationCap className="h-8 w-8 text-text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-text-primary">Student Portal</h1>
                            <p className="text-sm text-text-muted mt-2 leading-relaxed">
                                {tab === 'signin' ? 'Sign in to access your classrooms and assignments' : 'Create an account to get started'}
                            </p>
                        </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex rounded-lg bg-overlay/[0.04] p-1">
                        <button
                            type="button"
                            onClick={() => setTab('signin')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                tab === 'signin'
                                    ? 'bg-overlay/[0.06] text-text-primary shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('signup')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                tab === 'signup'
                                    ? 'bg-overlay/[0.06] text-text-primary shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Sign In Form */}
                    {tab === 'signin' && (
                        <form className="space-y-4" onSubmit={handleSignIn}>
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                            />
                            <div className="pt-3">
                                <Button type="submit" size="lg" className="w-full gap-2" isLoading={loading}>
                                    Sign In <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Sign Up Form */}
                    {tab === 'signup' && (
                        <form className="space-y-4" onSubmit={handleSignUp}>
                            {/* Photo picker */}
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-overlay/20 cursor-pointer group hover:border-primary/40 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-overlay/[0.04] flex items-center justify-center">
                                            <User className="w-8 h-8 text-text-muted/40" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <p className="text-xs text-text-muted">
                                    {photoPreview ? 'Click to change photo' : 'Add a profile photo (optional)'}
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoSelect}
                                />
                            </div>

                            <Input
                                label="Full Name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="John Doe"
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                            />
                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Create a password"
                            />
                            <div className="pt-3">
                                <Button type="submit" size="lg" className="w-full gap-2" isLoading={loading}>
                                    Create Account <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
