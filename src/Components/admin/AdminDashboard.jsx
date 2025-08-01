// src/Components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import '../../Style/AdminDashboard.css';
import FresherSearch from './FresherSearch';
import Reports from './Reports';
import AgentStatus from './AgentStatus';
import CourseManagement from './CourseManagement';
import DepartmentManagement from './DepartmentManagement';
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

import adminpng from '../../assets/admin-logo.png';

const AdminDashboard = () => {
    const [selectedTab, setSelectedTab] = useState('dashboard');
    const [loginLogs, setLoginLogs] = useState([]);
    const navigate = useNavigate();

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





const addFresher = async (fresher) => {
  try {
    const token = await getToken(); // <-- Your Firebase Auth token
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
      alert('Fresher added and password sent via email!');
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

    const handleAddFresher = async (fresherData) => {
        try {
            const response = await fetch('http://localhost:5000/api/add-fresher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fresherData)
            });
            if (response.ok) {
                alert('Fresher added and password sent to email!');
            } else {
                const error = await response.json();
                alert('Failed to add fresher: ' + (error.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Error adding fresher: ' + err.message);
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
                            <div className="card blue">FRESHERS JOINED <span>0</span></div>
                            <div className="card green">COURSES UPLOADED <span>0</span></div>
                            <div className="card orange">SUBMISSIONS <span>876</span></div>
                            <div className="card teal">ACTIVE USERS <span>0</span></div>
                        </section>
                    </>
                );
        }
    };

    return (
        <div className="admin-container">
            <aside className="sidebar">
                <h2 className="sidebar-title">Admin Portal</h2>
                <nav>
                    <ul>
                        <li className={selectedTab === 'dashboard' ? 'active' : ''} onClick={() => setSelectedTab('dashboard')}>Dashboard</li>
                        <li className={selectedTab === 'fresher' ? 'active' : ''} onClick={() => setSelectedTab('fresher')}>Fresher Search</li>
                        <li className={selectedTab === 'reports' ? 'active' : ''} onClick={() => setSelectedTab('reports')}>Reports</li>
                        <li className={selectedTab === 'agent' ? 'active' : ''} onClick={() => setSelectedTab('agent')}>Agent Status</li>
                        <li className={selectedTab === 'courses' ? 'active' : ''} onClick={() => setSelectedTab('courses')}>Course Management</li>
                        <li className={selectedTab === 'departments' ? 'active' : ''} onClick={() => setSelectedTab('departments')}>Department Management</li>
                        <li className={selectedTab === 'settings' ? 'active' : ''} onClick={() => setSelectedTab('settings')}>Settings</li>
                    </ul>
                </nav>
            </aside>

            <main className="main-content">
                {renderSection()}
            </main>
        </div>
    );
};

export default AdminDashboard;
