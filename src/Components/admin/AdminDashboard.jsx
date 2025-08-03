// src/Components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../../Style/AdminDashboard.css';
import FresherSearch from './FresherSearch';
import Reports from './Reports';
import AgentStatus from './AgentStatus';
import CourseManagement from './CourseManagement';
import DepartmentManagement from './DepartmentManagement';
import ChatbotAnalytics from './ChatbotAnalytics';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    getDocs,
    where,
    limit
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import adminpng from '../../assets/admin-logo.png';

const AdminDashboard = () => {
    const [selectedTab, setSelectedTab] = useState('dashboard');
    const [loginLogs, setLoginLogs] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [freshersCount, setFreshersCount] = useState(0);
    const [coursesCount, setCoursesCount] = useState(0);
    const [submissionsCount, setSubmissionsCount] = useState(0);
    const [activeUsersCount, setActiveUsersCount] = useState(0);
    const [departmentProgressionData, setDepartmentProgressionData] = useState([]);
    const [courseProgressionData, setCourseProgressionData] = useState([]);
    const [freshersPerCourseData, setFreshersPerCourseData] = useState([]);
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Redirect if user is not authenticated or not admin
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate('/');
            } else {
                const token = await user.getIdTokenResult();
                if (token.claims.role !== 'admin') {
                    navigate('/');
                }
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Fetch last 5 login logs in real-time
    useEffect(() => {
        const q = query(
            collection(db, 'loginLogs'),
            orderBy('timestamp', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp?.toDate()?.toLocaleString() || 'N/A',
            }));
            setLoginLogs(logs);
        });

        return () => unsubscribe();
    }, []);

    // Fetch freshers count using Cloud Function
    useEffect(() => {
        const functions = getFunctions();
        const getFreshersCount = httpsCallable(functions, 'getFreshersCount');

        getFreshersCount()
            .then((result) => {
                setFreshersCount(result.data.count);
            })
            .catch((error) => {
                console.error("Error fetching freshers count:", error);
            });
    }, []);

    // Fetch courses count using Cloud Function
    useEffect(() => {
        const functions = getFunctions();
        const getCoursesCount = httpsCallable(functions, 'getCoursesCount');

        getCoursesCount()
            .then((result) => {
                setCoursesCount(result.data.count);
            })
            .catch((error) => {
                console.error("Error fetching courses count:", error);
            });
    }, []);

    // Fetch submissions count using Cloud Function
    useEffect(() => {
        const functions = getFunctions();
        const getSubmissionsCount = httpsCallable(functions, 'getSubmissionsCount');

        getSubmissionsCount()
            .then((result) => {
                setSubmissionsCount(result.data.count);
            })
            .catch((error) => {
                console.error("Error fetching submissions count:", error);
            });
    }, []);

    // Fetch active users count using Cloud Function
    useEffect(() => {
        const functions = getFunctions();
        const getActiveUsersCount = httpsCallable(functions, 'getActiveUsersCount');

        getActiveUsersCount()
            .then((result) => {
                setActiveUsersCount(result.data.count);
            })
            .catch((error) => {
                console.error("Error fetching active users count:", error);
            });
    }, []);

    // Sample data for department progression
    useEffect(() => {
        const sampleDepartmentData = [
            { name: 'IT', "Average Progress": 75 },
            { name: 'HR', "Average Progress": 60 },
            { name: 'Sales', "Average Progress": 80 },
            { name: 'Marketing', "Average Progress": 65 },
        ];
        setDepartmentProgressionData(sampleDepartmentData);
    }, []);

    // Sample data for course progression
    useEffect(() => {
        const sampleCourseProgressionData = [
            { name: 'React Basics', "Average Progress": 85 },
            { name: 'Node.js Advanced', "Average Progress": 70 },
            { name: 'Firebase Fundamentals', "Average Progress": 90 },
        ];
        setCourseProgressionData(sampleCourseProgressionData);
    }, []);

    // Sample data for freshers per course
    useEffect(() => {
        const sampleFreshersPerCourseData = [
            { name: 'React Basics', "Number of Freshers": 15 },
            { name: 'Node.js Advanced', "Number of Freshers": 10 },
            { name: 'Firebase Fundamentals', "Number of Freshers": 20 },
        ];
        setFreshersPerCourseData(sampleFreshersPerCourseData);
    }, []);





const handleAddFresher = async (fresher) => {
        try {
            const token = await auth.currentUser.getIdToken(); // Get Firebase Auth token
            const res = await fetch('http://localhost:5000/api/add-fresher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // token is required!
                },
                body: JSON.stringify(fresher)
            });

            const data = await res.json();
            if (data.success) {
                alert('Fresher added. A password reset email has been sent to their email address.');
            } else {
                alert('Failed to add fresher');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };






    // Download admin login logs
    const downloadCSV = async () => {
        try {
            const q = query(
                collection(db, 'loginLogs'),
                where('role', '==', 'admin'),
                orderBy('timestamp', 'desc')
            );
            const snapshot = await getDocs(q);

            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                const time = data.timestamp?.toDate()?.toLocaleString() || 'N/A';
                return `${data.uid || ''},${data.ip || ''},${time}`;
            });

            const csvHeader = 'UID,IP Address,Login Time\n';
            const csvContent = csvHeader + logs.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'admin_login_logs.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('❌ Failed to download admin logs:', err);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    

    const renderSection = () => {
        switch (selectedTab) {
            case 'fresher':
                return <FresherSearch onAddFresher={handleAddFresher} />;
            case 'reports':
                return <Reports />;
            case 'agent':
                return <AgentStatus />;
            case 'courses':
                return <CourseManagement />;
            case 'departments':
                return <DepartmentManagement />;
            case 'chatbot':
                return <ChatbotAnalytics />;
            case 'csv-upload':
                return <CsvUpload />;
            case 'settings':
                return (
                    <section className="admin-settings">
                        <div className="settings-card">
                            <h3>Admin Settings</h3>

                            <div className="login-logs">
                                <h4>Updated few minutes ago..</h4>
                                <table className="log-table">
                                    <thead>
                                    <tr>
                                        <th>IP Address</th>
                                        <th>Login Time</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {loginLogs.map((log, index) => (
                                        <tr key={index}>
                                            <td>{log.ip}</td>
                                            <td>{log.time}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="button-group">
                                <button className="csv-button" onClick={downloadCSV}>
                                    ⬇️ Download Logs
                                </button>
                                <button className="logout-button" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </section>
                );
            case 'dashboard':
            default:
                return (
                    <>
                        <header className="top-bar">
                            <div></div>
                            <div className="admin-info">
                                <span>Admin User</span>
                                <img src={adminpng} alt="avatar" />
                            </div>
                        </header>
                        <section className="dashboard-metrics">
                            <div className="card blue">FRESHERS JOINED <span>{freshersCount}</span></div>
                            <div className="card green">COURSES UPLOADED <span>{coursesCount}</span></div>
                            <div className="card orange">SUBMISSIONS <span>{submissionsCount}</span></div>
                            <div className="card teal">ACTIVE USERS <span>{activeUsersCount}</span></div>
                        </section>
                        <section className="department-progression-chart">
                            <h3>Department Progression</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={departmentProgressionData}
                                    margin={{
                                        top: 20, right: 30, left: 20, bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Average Progress" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </section>
                        <section className="course-progression-chart" style={{ marginTop: '40px' }}>
                            <h3>Course Progression</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={courseProgressionData}
                                    margin={{
                                        top: 20, right: 30, left: 20, bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Average Progress" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </section>
                        <section className="freshers-per-course-chart" style={{ marginTop: '40px' }}>
                            <h3>Freshers Per Course</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={freshersPerCourseData}
                                    margin={{
                                        top: 20, right: 30, left: 20, bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Number of Freshers" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </section>
                    </>
                );
        }
    };

    return (
        <div className={`admin-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <h2 className="sidebar-title">Admin Portal</h2>
                <nav>
                    <ul>
                        <li className={selectedTab === 'dashboard' ? 'active' : ''} onClick={() => { setSelectedTab('dashboard'); setIsSidebarOpen(false); }}>Dashboard</li>
                        <li className={selectedTab === 'fresher' ? 'active' : ''} onClick={() => { setSelectedTab('fresher'); setIsSidebarOpen(false); }}>Fresher Search</li>
                        <li className={selectedTab === 'reports' ? 'active' : ''} onClick={() => { setSelectedTab('reports'); setIsSidebarOpen(false); }}>Reports</li>
                        <li className={selectedTab === 'agent' ? 'active' : ''} onClick={() => { setSelectedTab('agent'); setIsSidebarOpen(false); }}>Agent Status</li>
                        <li className={selectedTab === 'courses' ? 'active' : ''} onClick={() => { setSelectedTab('courses'); setIsSidebarOpen(false); }}>Course Management</li>
                        <li className={selectedTab === 'departments' ? 'active' : ''} onClick={() => { setSelectedTab('departments'); setIsSidebarOpen(false); }}>Department Management</li>
                        <li className={selectedTab === 'chatbot' ? 'active' : ''} onClick={() => { setSelectedTab('chatbot'); setIsSidebarOpen(false); }}>Chatbot Analytics</li>
                        
                        <li className={selectedTab === 'settings' ? 'active' : ''} onClick={() => { setSelectedTab('settings'); setIsSidebarOpen(false); }}>Settings</li>
                    </ul>
                </nav>
            </aside>

            <main className="main-content">
                <div className="hamburger-menu" onClick={toggleSidebar}>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                </div>
                {renderSection()}
            </main>
        </div>
    );
};

export default AdminDashboard;
