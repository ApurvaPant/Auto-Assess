import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <div className="max-w-2xl">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-100">
                    AutoAssess
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-400">
                    The minimal, effective assessment tool for programming education. Choose your portal.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        to="/teacher/login"
                        className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        Teacher Portal
                    </Link>
                    <Link to="/student" className="text-sm font-semibold leading-6 text-gray-100 group">
                        Student Portal <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}