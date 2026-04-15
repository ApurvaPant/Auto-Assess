import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useTheme } from '../contexts/ThemeContext';
import { GraduationCap, Lock, CheckCircle, Code, BarChart, ArrowRight, Sun, Moon } from 'lucide-react';

export default function Home() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="flex flex-col min-h-screen bg-background overflow-hidden">
            {/* Subtle ambient glow */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-overlay/[0.03] blur-[80px]" />
            </div>

            {/* Theme toggle — top right */}
            <div className="absolute top-5 right-6 z-10">
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

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
                <div className="w-full max-w-lg text-center space-y-10">

                    {/* Status pill */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-overlay/[0.08] bg-overlay/[0.04] animate-in fade-in slide-in-from-top-3 duration-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-medium text-text-muted">System Operational</span>
                    </div>

                    {/* Hero */}
                    <div className="space-y-5 animate-in fade-in duration-500 delay-100">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-text-primary">
                            AutoAssess
                        </h1>
                        <p className="text-base text-text-muted max-w-sm mx-auto leading-relaxed">
                            Intelligent coding assessments — automated grading, AI feedback, and real-time analytics.
                        </p>
                    </div>

                    {/* CTA buttons — Cal AI style: solid primary + outline secondary */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
                        <Link to="/student">
                            <Button size="lg" className="w-48 gap-2">
                                Student Portal <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="/teacher/login">
                            <Button size="lg" variant="outline" className="w-48 gap-2">
                                Teacher Login
                            </Button>
                        </Link>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 animate-in fade-in duration-700 delay-300">
                        {[
                            { icon: Code, label: 'Auto-Grading' },
                            { icon: CheckCircle, label: 'Test Cases' },
                            { icon: BarChart, label: 'Analytics' },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-overlay/[0.07] bg-overlay/[0.03]">
                                <Icon className="h-3.5 w-3.5 text-text-muted" />
                                <span className="text-xs text-text-muted font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
