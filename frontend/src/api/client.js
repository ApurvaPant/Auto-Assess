import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// --- INTERCEPTOR FIX ---
// This runs before every request to attach the correct token based on the endpoint
apiClient.interceptors.request.use((config) => {
  const teacherToken = localStorage.getItem('authToken');
  const studentToken = localStorage.getItem('studentAuthToken');

  // Determine which token to use based on the request URL
  let token = null;
  const url = config.url || '';

  if (url.includes('/student/') || url === '/run' || url === '/submit') {
    // Student endpoints - use student token
    token = studentToken;
  } else if (url.includes('/teacher/')) {
    // Teacher endpoints - use teacher token
    token = teacherToken;
  } else {
    // Fallback: use whichever is available
    token = teacherToken || studentToken;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
// --- END FIX ---


// --- Teacher APIs ---
export const loginTeacher = (username, password) => apiClient.post('/teacher/login', { username, password });

export const generateQuestions = (topic, difficulty, n_questions, classroom_id) => {
  return apiClient.post('/teacher/generate_questions', { topic, difficulty, n_questions, classroom_id });
};

export const generateQuestionsFromText = (text, difficulty, n_questions, classroom_id) => {
  return apiClient.post('/teacher/generate_from_text', { text, difficulty, n_questions, classroom_id });
};

export const generateQuestionsFromFile = (file, n_questions, difficulty, classroom_id) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('n_questions', n_questions);
  formData.append('difficulty', difficulty);
  if (classroom_id) formData.append('classroom_id', classroom_id);

  return apiClient.post('/teacher/generate_from_file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Teacher Classroom APIs
export const createClassroom = (name) => apiClient.post('/teacher/classrooms', { name });
export const getClassrooms = () => apiClient.get('/teacher/classrooms');
export const deleteClassroom = (id) => apiClient.delete(`/teacher/classrooms/${id}`);
export const getClassroomStudents = (classroomId) => apiClient.get(`/teacher/classrooms/${classroomId}/students`);

export const getPackages = (classroomId) => apiClient.get('/teacher/packages', { params: { classroom_id: classroomId } });
export const deletePackages = (packageIds) => apiClient.delete('/teacher/packages', { data: packageIds });
export const deleteAllPackages = (classroomId) => apiClient.delete('/teacher/packages/all', { params: { classroom_id: classroomId } });
export const getAssignments = (classroomId) => apiClient.get('/teacher/assignments', { params: { classroom_id: classroomId } });
export const createAssignment = (assignment_name, package_ids, classroom_id, deadline = null) => apiClient.post('/teacher/create_assignment', { assignment_name, package_ids, classroom_id, deadline });
export const deleteAssignment = (assignmentId) => apiClient.delete(`/teacher/assignments/${assignmentId}`);
export const getAssignmentDetails = (assignmentId) => apiClient.get(`/teacher/assignments/${assignmentId}/details`);
export const getResults = (assignmentId) => apiClient.get(`/teacher/results/${assignmentId}`);
export const getStats = (classroomId) => apiClient.get('/teacher/stats', { params: { classroom_id: classroomId } });
export const releaseResults = (assignmentId, alpha = 0.6, beta = 0.4, gamma = 10) => apiClient.post(`/teacher/assignments/${assignmentId}/release`, { alpha, beta, gamma });
export const getCodeAnalysis = (submissionId) => apiClient.get(`/teacher/analyze/${submissionId}`);
export const getPlagiarismReport = (assignmentId) => apiClient.get(`/teacher/assignments/${assignmentId}/plagiarism`);
export const getAIDetection = (submissionId) => apiClient.get(`/teacher/ai-detect/${submissionId}`);
export const getStudentPortfolio = (classroomId, studentId) => apiClient.get(`/teacher/classrooms/${classroomId}/students/${studentId}/portfolio`);
export const generateStudentAIInsights = (classroomId, studentId) => apiClient.post(`/teacher/classrooms/${classroomId}/students/${studentId}/ai-insights`);


// --- Student APIs ---
export const signupStudent = (email, name, password) => apiClient.post('/student/signup', { email, name, password });
export const loginStudent = (email, password) => apiClient.post('/student/login', { email, password });

export const joinClassroom = (code) => apiClient.post('/student/join', { code });
export const getStudentClassrooms = () => apiClient.get('/student/classrooms');

export const getStudentAssignments = (classroomId) => apiClient.get('/student/assignments', { params: classroomId ? { classroom_id: classroomId } : {} });
export const getStudentAssignment = (assignmentId) => apiClient.get(`/student/assignment/${assignmentId}`);
export const runCode = (assignment_id, code) => apiClient.post('/run', { assignment_id, code });
export const submitSolution = (assignment_id, code) => apiClient.post('/submit', { assignment_id, code });
export const getStudentAnalysis = (assignmentId) => apiClient.get(`/student/analyze/${assignmentId}`);
export const getStudentResult = (assignmentId) => apiClient.get(`/student/result/${assignmentId}`);

export const updateStudentProfile = (name, current_password, new_password) => apiClient.post('/student/profile', { name, current_password, new_password });

export const uploadStudentPhoto = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/student/profile/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Doubt APIs
export const askDoubt = (classroomId, question, assignmentId = null) =>
  apiClient.post(`/student/classroom/${classroomId}/doubts`, { question, assignment_id: assignmentId });
export const getStudentDoubts = (classroomId) =>
  apiClient.get(`/student/classroom/${classroomId}/doubts`);
export const getClassroomDoubts = (classroomId) =>
  apiClient.get(`/teacher/classroom/${classroomId}/doubts`);
export const replyToDoubt = (doubtId, reply) =>
  apiClient.post(`/teacher/doubts/${doubtId}/reply`, { reply });

export default apiClient;
