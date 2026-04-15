import { Routes, Route } from 'react-router-dom';
import TeacherLogin from './pages/TeacherLogin';
import StudentPortal from './pages/StudentPortal';
import TeacherDashboard from './pages/TeacherDashboard';
import GenerateQuestions from './pages/teacher/GenerateQuestions';
import CreateAssignment from './pages/teacher/CreateAssignment';
import ViewResults from './pages/teacher/ViewResults';
import ClassroomManagement from './pages/teacher/ClassroomManagement';
import AssignmentDetail from './pages/teacher/AssignmentDetail';
import TeacherDoubts from './pages/teacher/TeacherDoubts';
import StudentAnalysis from './pages/teacher/StudentAnalysis';
import StudentProfile from './pages/StudentProfile';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import StudentClassroom from './pages/StudentClassroom';
import StudentAssignmentPage from './pages/StudentAssignmentPage';
import StudentResultPage from './pages/StudentResultPage';
import DashboardLayout from './components/layouts/DashboardLayout';

function App() {
  return (
    <div className="min-h-screen font-sans">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/student" element={<StudentPortal />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/classroom/:classroomId" element={<StudentClassroom />} />
        <Route path="/student/assignment/:assignment_id" element={<StudentAssignmentPage />} />
        <Route path="/student/results/:assignment_id" element={<StudentResultPage />} />
        <Route path="/student/profile" element={<StudentProfile />} />

        {/* Protected Teacher Routes - Now using DashboardLayout */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="generate" element={<GenerateQuestions />} />
          <Route path="assign" element={<CreateAssignment />} />
          <Route path="assign/:id" element={<AssignmentDetail />} />
          <Route path="results" element={<ViewResults />} />
          <Route path="classrooms" element={<ClassroomManagement />} />
          <Route path="doubts" element={<TeacherDoubts />} />
          <Route path="student-analysis" element={<StudentAnalysis />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
