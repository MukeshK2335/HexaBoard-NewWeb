import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import '../../Style/FresherProfile.css';

const FresherProfile = ({ fresher }) => {
    const [userData, setUserData] = useState({
        department: '',
        skill: '',
        activeCourse: '',
        pendingAssignments: 0,
        completedAssignments: 0,
        loginActivity: [],         // { week: 'Week 1', logins: 5 }
        timeSpent: []              // { week: 'Week 1', hours: 4 }
    });

    useEffect(() => {
        if (!fresher?.email) return;

        const userRef = doc(db, 'users', fresher.email);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData({
                    department: data.department || '',
                    skill: data.skill || '',
                    activeCourse: data.activeCourse || '',
                    pendingAssignments: data.pendingAssignments || 0,
                    completedAssignments: data.completedAssignments || 0,
                    loginActivity: data.loginActivity || [],
                    timeSpent: data.timeSpent || []
                });
            }
        });

        return () => unsubscribe();
    }, [fresher]);

    const assignmentChartData = [
        { name: 'Pending', value: userData.pendingAssignments },
        { name: 'Completed', value: userData.completedAssignments }
    ];

    return (
        <div className="profile-wrapper">
            <div className="profile-card">
                <h2 className="profile-title">
                    {fresher?.name ? `${fresher.name}'s Profile` : 'Fresher Profile'}
                </h2>

                <div className="info-grid">
                    <div className="info-box">
                        <p><strong>Email:</strong> {fresher?.email}</p>
                        <p><strong>Department:</strong> {userData.department}</p>
                        <p><strong>Skill:</strong> {userData.skill}</p>
                        <p><strong>Active Course:</strong> {userData.activeCourse}</p>
                    </div>

                    <div className="info-box">
                        <p><strong>Pending Assignments:</strong> {userData.pendingAssignments}</p>
                        <p><strong>Completed Assignments:</strong> {userData.completedAssignments}</p>
                    </div>
                </div>

                <div className="chart-section">
                    <h3>Assignment Overview</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={assignmentChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#4F46E5" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-section">
                    <h3>Weekly Login Activity</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={userData.loginActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="logins" stroke="#10B981" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-section">
                    <h3>Time Spent (hrs/week)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={userData.timeSpent}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="hours" stroke="#F59E0B" fill="#FEF3C7" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default FresherProfile;
