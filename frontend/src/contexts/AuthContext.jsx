import React, { createContext, useState, useContext, useEffect } from 'react';

// This context is specifically for TEACHER authentication
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // We use 'authToken' for the teacher token
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [classroomId, setClassroomId] = useState(localStorage.getItem('classroomId'));
    const [classroomName, setClassroomName] = useState(localStorage.getItem('classroomName'));

    useEffect(() => {
        if (authToken) {
            localStorage.setItem('authToken', authToken);
        } else {
            localStorage.removeItem('authToken');
        }
    }, [authToken]);

    const login = (token) => {
        setAuthToken(token);
    };

    const logout = () => {
        setAuthToken(null);
        // Intentionally keep classroom selection — teacher resumes their last classroom on next login
    };

    const selectClassroom = (id, name) => {
        setClassroomId(id);
        setClassroomName(name);
        localStorage.setItem('classroomId', id);
        localStorage.setItem('classroomName', name);
    };

    const clearClassroom = () => {
        setClassroomId(null);
        setClassroomName(null);
        localStorage.removeItem('classroomId');
        localStorage.removeItem('classroomName');
    };

    const isAuthenticated = !!authToken;

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, classroomId, classroomName, selectClassroom, clearClassroom }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
