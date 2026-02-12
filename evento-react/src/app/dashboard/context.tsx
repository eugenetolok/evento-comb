'use client'
import React, { createContext, useState, useEffect } from 'react';
import { axiosInstanceAuth } from "@/axiosConfig";

export const AppContext = createContext<string | null>(null);

export const AppProvider = (props: { children: React.ReactNode }) => {
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        axiosInstanceAuth.get('/api/users/me')
            .then(response => {
                setRole(response.data.role);
            })
            .catch(error => {
                console.error('There was an error!', error);
            });
    }, []); // Empty array means this effect runs once when the component mounts

    return (
        <AppContext.Provider value={role}>
            {props.children}
        </AppContext.Provider>
    );
}
