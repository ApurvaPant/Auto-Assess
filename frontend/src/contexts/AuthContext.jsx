import React, { createContext, useState, useContext, useEffect } from 'react';

// This context is specifically for TEACHER authentication
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // We use 'authToken' for the teacher token
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

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
    };

    const isAuthenticated = !!authToken;

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext); 