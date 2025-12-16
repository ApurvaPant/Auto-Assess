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

export const generateQuestions = (topic, difficulty, n_questions) => {
  return apiClient.post('/teacher/generate_questions', { topic, difficulty, n_questions });
};

export const generateQuestionsFromText = (text, difficulty, n_questions) => {
  return apiClient.post('/teacher/generate_from_text', { text, difficulty, n_questions });
};

export const generateQuestionsFromFile = (file, n_questions, difficulty) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('n_questions', n_questions);
  formData.append('difficulty', difficulty);

  return apiClient.post('/teacher/generate_from_file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getPackages = () => apiClient.get('/teacher/packages');
export const getAssignments = () => apiClient.get('/teacher/assignments');
export const createAssignment = (assignment_name, package_ids) => apiClient.post('/teacher/create_assignment', { assignment_name, package_ids });
export const getResults = (assignmentId) => apiClient.get(`/teacher/results/${assignmentId}`);
export const getTeacherCodes = () => apiClient.get('/teacher/codes');
export const releaseResults = (assignmentId, alpha = 0.6, beta = 0.4, gamma = 10) => apiClient.post(`/teacher/assignments/${assignmentId}/release`, { alpha, beta, gamma });
export const getCodeAnalysis = (submissionId) => apiClient.get(`/teacher/analyze/${submissionId}`);


// --- Student APIs ---
export const loginStudent = (roll, dob) => apiClient.post('/student/login', { roll, dob });
export const getStudentAssignments = () => apiClient.get('/student/assignments');
export const getStudentAssignment = (assignmentId, roll) => apiClient.get(`/student/assignment/${assignmentId}/${roll}`);
export const runCode = (roll, assignment_id, code) => apiClient.post('/run', { roll, assignment_id, code });
export const submitSolution = (roll, assignment_id, code) => apiClient.post('/submit', { roll, assignment_id, code });
export const getStudentAnalysis = (assignmentId, roll) => apiClient.get(`/student/analyze/${assignmentId}/${roll}`);

// This is the function that was causing the error
export const changeStudentDob = (roll, new_dob, code) => apiClient.post('/student/change_dob', { roll, new_dob, code });

export const updateStudentProfile = (name, new_dob, code) => apiClient.post('/student/profile', { name, new_dob, code });
export const getStudentProfile = () => apiClient.get('/student/profile');

export const getStudentResult = (assignmentId, roll) => apiClient.get(`/teacher/results/${assignmentId}`).then(response => {
  const results = response.data;
  const myResult = results.find(res => res.roll === parseInt(roll, 10));
  if (!myResult) {
    throw new Error("Result not found");
  }
  return { data: myResult };
});

export default apiClient;