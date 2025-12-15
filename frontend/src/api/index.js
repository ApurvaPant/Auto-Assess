import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// --- THIS IS THE FIX ---
// This "interceptor" runs before every single API request.
// It checks for both tokens and attaches the correct one.
apiClient.interceptors.request.use((config) => {
  const teacherToken = localStorage.getItem('authToken');
  const studentToken = localStorage.getItem('studentAuthToken');
  
  // Use whichever token is available
  const token = teacherToken || studentToken; 

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
export const releaseResults = (assignmentId) => apiClient.post(`/teacher/assignments/${assignmentId}/release`);


// --- Student APIs ---
export const loginStudent = (roll, dob) => apiClient.post('/student/login', { roll, dob });
export const getStudentAssignments = () => apiClient.get('/student/assignments');
export const getStudentAssignment = (assignmentId, roll) => apiClient.get(`/student/assignment/${assignmentId}/${roll}`);
export const runCode = (roll, assignment_id, code) => apiClient.post('/run', { roll, assignment_id, code });
export const submitSolution = (roll, assignment_id, code) => apiClient.post('/submit', { roll, assignment_id, code });
export const changeStudentDob = (roll, new_dob, code) => apiClient.post('/student/change_dob', { roll, new_dob, code });
export const getStudentResult = (assignmentId, roll) => apiClient.get(`/teacher/results/${assignmentId}`).then(response => {
    const results = response.data;
    const myResult = results.find(res => res.roll === parseInt(roll, 10));
    if (!myResult) {
        throw new Error("Result not found");
    }
    return { data: myResult };
});