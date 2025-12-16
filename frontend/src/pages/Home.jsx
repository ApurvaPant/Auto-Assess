import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { GraduationCap, Lock, CheckCircle, Code, BarChart } from 'lucide-react';

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
            <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="max-w-4xl text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-surface-dark shadow-soft animate-in fade-in slide-in-from-top-5 duration-700">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-medium text-text-muted">System Operational</span>
                    </div>

                    {/* Hero Title */}
                    <div className="space-y-4 animate-in fade-in zoom-in duration-700 delay-100">
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500">
                            AutoAssess
                        </h1>
                        <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto font-light">
                            The intelligent assessment platform for modern programming education.
                            Automated grading, real-time analytics, and seamless feedback.
                        </p>
                    </div>

                    {/* Action Cards */}
                    <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
                        <Link to="/teacher/login" className="group">
                            <Card className="h-full bg-surface/50 border-surface-dark hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group-hover:-translate-y-1">
                                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                        <Lock className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">Teacher Portal</h3>
                                        <p className="text-sm text-text-muted mt-2">Manage assignments, generate questions, and view analytics.</p>
                                    </div>
                                    <Button variant="ghost" className="group-hover:text-primary">Acccess Dashboard &rarr;</Button>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link to="/student" className="group">
                            <Card className="h-full bg-surface/50 border-surface-dark hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/5 group-hover:-translate-y-1">
                                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                    <div className="h-16 w-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                                        <GraduationCap className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary">Student Portal</h3>
                                        <p className="text-sm text-text-muted mt-2">Submit code, view grades, and track your progress.</p>
                                    </div>
                                    <Button variant="ghost" className="group-hover:text-secondary">Enter Classroom &rarr;</Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>

                    {/* Footer Features */}
                    <div className="pt-16 grid grid-cols-3 gap-8 text-center opacity-60 animate-in fade-in duration-1000 delay-300">
                        <div className="flex flex-col items-center gap-2">
                            <Code className="h-5 w-5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Multi-language</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Auto-Grading</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <BarChart className="h-5 w-5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Analytics</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}