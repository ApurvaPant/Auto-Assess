import { Routes, Route } from 'react-router-dom';
import TeacherLogin from './pages/TeacherLogin';
import StudentPortal from './pages/StudentPortal';
import TeacherDashboard from './pages/TeacherDashboard';
import GenerateQuestions from './pages/teacher/GenerateQuestions';
import CreateAssignment from './pages/teacher/CreateAssignment';
import ViewResults from './pages/teacher/ViewResults';
import ViewCodes from './pages/teacher/ViewCodes';
import StudentChangeDob from './pages/StudentChangeDob';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import StudentAssignmentPage from './pages/StudentAssignmentPage';
import StudentResultPage from './pages/StudentResultPage'; // --- ADD THIS IMPORT ---

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/student" element={<StudentPortal />} />
            <Route path="/student/dashboard/:roll" element={<StudentDashboard />} />
            <Route path="/student/assignment/:assignment_id" element={<StudentAssignmentPage />} />
            {/* --- ADD THIS NEW ROUTE --- */}
            <Route path="/student/results/:assignment_id" element={<StudentResultPage />} />
            <Route path="/student/change-password" element={<StudentChangeDob />} />

            {/* Protected Teacher Routes */}
            <Route 
                path="/teacher" 
                element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>}
            >
                <Route path="generate" element={<GenerateQuestions />} />
                <Route path="assign" element={<CreateAssignment />} />
                <Route path="results" element={<ViewResults />} />
                <Route path="codes" element={<ViewCodes />} />
            </Route>
        </Routes>
    </div>
  );
}

export default App;