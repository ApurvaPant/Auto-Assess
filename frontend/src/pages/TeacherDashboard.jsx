import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function TeacherDashboard() {
    return (
        <div>
            <Navbar isTeacher={true} />
            {/* Added padding for content area */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <Outlet /> {/* Child routes render here */}
            </main>
        </div>
    );
}