import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import '../../Style/FresherDashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import LoadingScreen from "../LoadingScreen.jsx";
import MyCourses from "./MyCourses.jsx";
import Chatbot from "./Chatbot.jsx";

// Helper to format Firestore Timestamp or string
function formatDate(ts) {
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
    return '';
}

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState({ activeCourses: 0, pendingAssignments: 0, completed: 0, pendingCourses: 0, completedCourses: 0 });
    const [userName, setUserName] = useState("...");
    const [certifications, setCertifications] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'dashboard');
    const dropdownRef = useRef(null);

    // Handles user logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/"); // Navigate to home or login page after logout
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    // Handles clicks outside the dropdown menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Fetches user data, courses, assignments, and progress from Firestore
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            setError(null);

            if (user) {
                try {
                    // Fetch user profile data and other collections concurrently
                    const [
                        userSnap,
                        userCoursesSnap,
                        assignmentsSnap,
                        certSnap,
                        progressSnap
                    ] = await Promise.all([
                        getDoc(doc(db, "users", user.uid)),
                        getDocs(collection(db, "users", user.uid, "courses")),
                        getDocs(collection(db, "users", user.uid, "assignments")),
                        getDocs(collection(db, "users", user.uid, "certifications")),
                        getDocs(collection(db, "users", user.uid, "progress"))
                    ]);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUserName(userData.name || "Fresher");

                        // Process and set data from fetched collections
                        const userCoursesList = userCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const assignmentsList = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        const certs = certSnap.docs.map(doc => doc.data());
                        const progressArr = progressSnap.docs.map(doc => doc.data());

                        const activeCoursesCount = userCoursesList.filter(course => !course.completed).length;
                        const completedCoursesCount = userCoursesList.filter(course => course.completed).length;
                        const pendingAssignments = assignmentsList.filter(a => a.status !== 'Completed').length;
                        const completedAssignments = assignmentsList.length - pendingAssignments;

                        setAssignments(assignmentsList);
                        setCertifications(certs);

                        const filteredProgress = progressArr.filter(p => p.date && typeof p.progress === 'number');
                        filteredProgress.sort((a, b) => (a.date > b.date ? 1 : -1));
                        setProgressData(filteredProgress);

                        setData({
                            activeCourses: activeCoursesCount,
                            pendingAssignments: pendingAssignments,
                            completedCourses: completedCoursesCount,
                            completed: completedAssignments,
                            pendingCourses: userCoursesList.filter(course => !course.completed && course.progress === 0).length,
                        });
                    } else {
                        setError("User profile not found.");
                        setUserName("Fresher");
                    }
                } catch (err) {
                    console.error("Error fetching data:", err);
                    setError("Failed to load dashboard data. Please try again.");
                }
            } else {
                setError("No user is logged in.");
                navigate('/login'); // Redirect to login if no user is found
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    if (loading) {
        return <LoadingScreen message="Loading dashboard..." />;
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '18px',
                color: '#ef4444',
                background: '#fff8f8',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
                <div>{error}</div>
                <button style={{ marginTop: 24, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    const renderDashboard = () => (
        <>
            {/* Welcome Card */}
            <section className="welcome-card">
                <div>
                    <h3>Welcome back, {userName}!</h3>
                    <p>You have {data.pendingAssignments} upcoming assignments and {data.activeCourses} active courses.</p>
                </div>
                <button>View Schedule</button>
            </section>

            {/* Stats Cards */}
            <section className="cards">
                <div className="card">
                    <h4>Active Courses</h4>
                    <p className="count">{data.activeCourses}</p>
                    <span className="info">+2 from last month</span>
                </div>
                <div className="card">
                    <h4>Pending Assignments</h4>
                    <p className="count">{data.pendingAssignments}</p>
                </div>
                <div className="card">
                    <h4>Completed Courses</h4>
                    <p className="count">{data.completedCourses}</p>
                </div>
            </section>

            {/* Progress Chart - Bar Chart by Date */}
            <section className="progress">
                <div className="progress-header">
                    <h4>Your Learning Progress</h4>
                    <select>
                        <option>This Month</option>
                        <option>Last Month</option>
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    {progressData && progressData.length > 0 ? (
                        <BarChart data={progressData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="progress" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '1.1rem' }}>
                            No progress data available.
                        </div>
                    )}
                </ResponsiveContainer>
            </section>

            {/* Certifications */}
            <section className="certifications">
                <h4>📜 Certifications Obtained</h4>
                {certifications.length === 0 ? (
                    <p>No certifications yet.</p>
                ) : (
                    <ul className="cert-list">
                        {certifications.map((cert, index) => (
                            <li key={index}>
                                <strong>{cert.title}</strong> – <span>{formatDate(cert.time) || formatDate(cert.date)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );

    const renderAssignments = () => (
        <section className="assignments-section">
            <h4>📚 Your Assignments</h4>
            {assignments.length === 0 ? (
                <p>No assignments yet. Complete a course to get started!</p>
            ) : (
                <ul className="assignment-list">
                    {assignments.map((assignment) => (
                        <li key={assignment.id} className="assignment-item">
                            <h5>{assignment.courseTitle}</h5>
                            <p>Status: <span className={`assignment-status ${assignment.status}`}>{assignment.status}</span></p>
                            {assignment.dueDate && <p>Due: {formatDate(assignment.dueDate)}</p>}
                            <button
                                className="take-assessment-btn"
                                onClick={() => navigate(`/take-assessment/${assignment.courseId}`)}
                            >
                                Take Assessment
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );

    // This function will render the MyCourses component. The commented-out code
    // from the previous version was trying to render course cards directly, which
    // is better handled within the dedicated MyCourses component.
    const renderCourses = () => (
        <MyCourses />
    );

    return (
        <div className="dashboard-container">
            <div className="layout-wrapper">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="logo">HexaBoard</div>
                    <nav className="nav-links">
                        <a
                            href="#"
                            className={activeTab === 'dashboard' ? 'active' : ''}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            Dashboard
                        </a>
                        <a
                            href="#"
                            className={activeTab === 'courses' ? 'active' : ''}
                            onClick={() => setActiveTab('courses')}
                        >
                            My Courses
                        </a>
                        <a href="#">Daily Quiz</a>
                        <a
                            href="#"
                            className={activeTab === 'assignments' ? 'active' : ''}
                            onClick={() => setActiveTab('assignments')}
                        >
                            Assignments
                        </a>
                    </nav>
                </aside>

                {/* Main */}
                <main className="main-content">
                    <header className="topbar">
                        <h2>{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'courses' ? 'My Learning' : 'Assignments'}</h2>
                        <div className="user-dropdown" ref={dropdownRef}>
                            <span className="user-name" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                {userName} ▾
                            </span>
                            <div className={`dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
                                <a href="#">Notifications</a>
                                <a href="#">Settings</a>
                                <a href="#" onClick={handleLogout}>Logout</a>
                            </div>
                        </div>
                    </header>

                    {/* Main content rendering based on active tab */}
                    {activeTab === 'dashboard' ? renderDashboard() : activeTab === 'courses' ? renderCourses() : renderAssignments()}
                </main>
            </div>

            {/* Chatbot */}
            <Chatbot />
        </div>
    );
};

export default Dashboard;