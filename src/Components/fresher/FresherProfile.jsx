import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import '../../Style/FresherProfile.css';

const FresherProfile = ({ fresher, assignments = [] }) => {
    // Initialize state with fresher data if available
    const [userData, setUserData] = useState({
        department: fresher?.department || '',
        skill: fresher?.skill || '',
        activeCourse: fresher?.activeCourse || '',
        pendingAssignments: fresher?.pendingAssignments || 0,
        completedAssignments: fresher?.completedAssignments || 0,
        loginActivity: fresher?.loginActivity || [],
        weeklyLoginTime: []
    });

    const calculateWeeklyLoginTime = (loginActivity) => {
        if (!loginActivity?.weeklyLogins || loginActivity.weeklyLogins.length === 0) {
            // If no login data exists, return empty array
            return [];
        }
        
        const weeklyData = loginActivity.weeklyLogins.reduce((acc, {loginTime, logoutTime}) => {
            if (!loginTime || !logoutTime) return acc;
            
            const loginDate = new Date(loginTime);
            const weekNumber = Math.ceil((loginDate.getDate() - loginDate.getDay()) / 7);
            const weekKey = `Week ${weekNumber}`;
            
            const duration = new Date(logoutTime) - new Date(loginTime);
            const hoursSpent = duration / (1000 * 60 * 60); // Convert to hours
            
            // Only add valid durations (positive and not too large)
            if (hoursSpent > 0 && hoursSpent < 168) { // Max 1 week of hours
                acc[weekKey] = (acc[weekKey] || 0) + hoursSpent;
            }
            return acc;
        }, {});

        return Object.entries(weeklyData).map(([week, hours]) => ({
            week,
            hours: Math.round(hours * 100) / 100 // Round to 2 decimal places
        }));
    };

    const [assignmentsWithMarks, setAssignmentsWithMarks] = useState([]);

    useEffect(() => {
        if (!fresher?.email && !fresher?.uid) {
            // If no fresher data, initialize with empty data
            setUserData(prevData => ({
                ...prevData,
                weeklyLoginTime: []
            }));
            return;
        }

        // Use either email or uid as the document ID based on what's available
        const userId = fresher.uid || fresher.email;
        const userRef = doc(db, 'users', userId);
        
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const weeklyLoginTime = calculateWeeklyLoginTime(data.loginActivity);
                setUserData({
                    department: data.department || '',
                    weeklyLoginTime,
                    skill: data.skill || '',
                    activeCourse: data.activeCourse || '',
                    pendingAssignments: data.pendingAssignments || 0,
                    completedAssignments: data.completedAssignments || 0,
                    loginActivity: data.loginActivity || { weeklyLogins: [] }
                });
            } else {
                // If document doesn't exist, initialize with empty data
                setUserData(prevData => ({
                    ...prevData,
                    weeklyLoginTime: []
                }));
            }
        });

        return () => unsubscribe();
    }, [fresher]);
    
    // Filter assignments with marks
    useEffect(() => {
        const filteredAssignments = assignments.filter(assignment => assignment.marks !== undefined);
        setAssignmentsWithMarks(filteredAssignments);
    }, [assignments]);

    // Assignment chart data removed as the chart is no longer needed

    return (
        <div className="profile-wrapper">
            <div className="profile-card">

                <h2 className="profile-title">
                    {fresher?.name ? `${fresher.name}'s Profile` : 'Fresher Profile'}
                </h2>

                <div className="info-grid">
                    <div className="info-box">
                        <p><strong>Email:</strong> {fresher?.email || 'N/A'}</p>
                        <p><strong>Department:</strong> {userData.department || 'N/A'}</p>
                        <p><strong>Skill:</strong> {userData.skill || 'N/A'}</p>
                        <p><strong>Active Course:</strong> {userData.activeCourse || 'N/A'}</p>
                    </div>

                    <div className="info-box">
                        <p><strong>Pending Assignments:</strong> {userData.pendingAssignments}</p>
                        <p><strong>Completed Assignments:</strong> {userData.completedAssignments}</p>
                    </div>
                </div>

                {/* Assignment Overview chart removed as requested */}
                
                {/* Assignment Marks Overview Chart */}
                {assignmentsWithMarks.length > 0 ? (
                    <div className="chart-section">
                        <h3>Assignment Marks Overview</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart 
                                data={assignmentsWithMarks}
                                margin={{ top: 15, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="courseTitle" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(value) => [`Marks: ${value}%`, '']} />
                                <Legend />
                                <Bar 
                                    dataKey="marks" 
                                    fill="#0047BB" 
                                    radius={[8, 8, 0, 0]}
                                    name="Marks (%)"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="chart-section">
                        <h3>Assignment Marks Overview</h3>
                        <div className="no-data-message">No assignment marks data available</div>
                    </div>
                )}

                <div className="chart-section">
                    <h3>Weekly Login Activity</h3>
                    {userData.weeklyLoginTime && userData.weeklyLoginTime.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={userData.weeklyLoginTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="week" />
                                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                <Tooltip 
                                    formatter={(value) => [`${value.toFixed(2)} hours`, 'Time Spent']}
                                    labelFormatter={(label) => `${label}`}
                                />
                                <Bar 
                                    dataKey="hours" 
                                    fill="#4CAF50" 
                                    name="Hours Spent" 
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data-message">
                            <p>No login activity data available yet</p>
                            <p className="no-data-subtext">Login activity will be recorded when users log in and out of the system</p>
                        </div>
                    )}
                </div>




            </div>
        </div>
    );
};

export default FresherProfile;
