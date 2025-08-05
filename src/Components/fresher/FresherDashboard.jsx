import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import '../../Style/FresherDashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
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
    const [assignments, setAssignments] = useState([]); // New state for assignments
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'dashboard');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [geminiFeedback, setGeminiFeedback] = useState(null); // New state for Gemini feedback
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Check for Gemini feedback from location state
        if (location.state?.geminiFeedback) {
            setGeminiFeedback(location.state.geminiFeedback);
            // Clear the feedback from state to prevent it from showing again on refresh
            navigate(location.pathname, { replace: true, state: { ...location.state, geminiFeedback: undefined } });
        }

        const fetchData = async (user) => {
            try {
                setLoading(true);
                setError(null);
                if (user) {
                    const docRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(docRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUserName(userData.name || "Fresher");

                        // Fetch user's courses from Firestore
                        const userCoursesRef = collection(db, "users", user.uid, "courses");
                        const userCoursesSnap = await getDocs(userCoursesRef);
                        const userCoursesList = userCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        const activeCoursesCount = userCoursesList.filter(course => !course.completed).length;
                        const completedCoursesCount = userCoursesList.filter(course => course.completed).length;

                        const assignmentsRef = collection(db, "users", user.uid, "assignments");
                        const assignmentsSnap = await getDocs(assignmentsRef);
                        const assignmentsList = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setAssignments(assignmentsList);
                        console.log("Fetched assignments:", assignmentsList);

                        const certRef = collection(db, "users", user.uid, "certifications");
                        const certSnap = await getDocs(certRef);
                        const certs = certSnap.docs.map(doc => doc.data());
                        setCertifications(certs);

                        const progressRef = collection(db, "users", user.uid, "progress");
                        const progressSnap = await getDocs(progressRef);
                        const progressArr = progressSnap.docs.map(doc => doc.data());
                        const filtered = progressArr.filter(p => p.date && typeof p.progress === 'number');
                        filtered.sort((a, b) => (a.date > b.date ? 1 : -1));
                        setProgressData(filtered);

                        const pendingAssignments = assignmentsList.filter(a => a.status !== 'Completed').length;
                        const completedAssignments = assignmentsList.length - pendingAssignments;

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
                } else {
                    setError("No user is logged in.");
                }
            } catch (err) {
                console.error("Error loading user data:", err);
                setError("Failed to load user data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchData(user);
            } else {
                setLoading(false);
                setError("No user is logged in.");
            }
        });

        // Re-fetch data if refreshAssignments flag is set
        if (location.state?.refreshAssignments) {
            if (auth.currentUser) {
                fetchData(auth.currentUser);
            }
            // Clear the flag after processing
            navigate(location.pathname, { replace: true, state: { ...location.state, refreshAssignments: false } });
        }

        return () => unsubscribe();
    }, [location.state?.refreshAssignments, navigate, location.pathname, location.state]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        signOut(auth).catch(console.error);
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return "#10b981";
        if (progress >= 60) return "#f59e0b";
        if (progress >= 40) return "#f97316";
        return "#ef4444";
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Completed": return "#10b981";
            case "In Progress": return "#3b82f6";
            case "Just Started": return "#f59e0b";
            default: return "#6b7280";
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push(<span key={i} className="star filled">★</span>);
        }
        
        if (hasHalfStar) {
            stars.push(<span key="half" className="star half">★</span>);
        }
        
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(<span key={`empty-${i}`} className="star empty">★</span>);
        }
        
        return stars;
    };

    if (loading) {
        console.log("Loading state: true");
        return <LoadingScreen message="Loading dashboard..." />;
    }
    if (error) {
        console.error("Dashboard error state:", error);
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
                <div style={{fontSize: '2.5rem', marginBottom: 16}}>⚠️</div>
                <div>{error}</div>
                <button style={{marginTop: 24, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer'}} onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    console.log("Rendering dashboard with:", { userName, data, certifications, progressData });

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

            {/* Assignment Marks Chart */}
            <section className="progress">
                <div className="progress-header">
                    <h4>Assignment Marks Progress</h4>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    {assignments && assignments.length > 0 ? (
                        <BarChart data={assignments} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="courseTitle" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`Marks: ${value}`, '']}/>
                            <Bar dataKey="marks" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    ) : (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '1.1rem'}}>
                            No assignment marks data available.
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
                                onClick={async () => {
                                    try {
                                        console.log("Attempting to find assessment for courseId:", assignment.courseId);
                                        const assessmentsQuery = query(collection(db, 'assessments'), where("courseId", "==", assignment.courseId));
                                        const querySnapshot = await getDocs(assessmentsQuery);
                                        
                                        if (!querySnapshot.empty) {
                                            const assessmentId = querySnapshot.docs[0].id;
                                            console.log("Found assessmentId:", assessmentId, "for courseId:", assignment.courseId);
                                            navigate(`/take-assessment/${assessmentId}`);
                                        } else {
                                            console.warn("No assessment found for courseId:", assignment.courseId);
                                            alert("No assessment found for this course.");
                                        }
                                    } catch (error) {
                                        console.error("Error fetching assessment for course:", assignment.courseId, error);
                                        alert("Failed to load assessment. Please try again.");
                                    }
                                }}
                            >
                                Take Assessment
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );

    const renderCourses = () => (
        <>
            {/* Course Header */}
            <section className="course-header-section">
                <div className="course-header-content">
                    <h1>My Learning</h1>
                    <p>Continue where you left off</p>
                </div>
                <div className="course-filters">
                    <button className="filter-btn active">All Courses</button>
                    <button className="filter-btn">In Progress</button>
                    <button className="filter-btn">Completed</button>
                    <button className="filter-btn">Wishlist</button>
                </div>
            </section>

            {/* Course Grid */}
            <section className="course-grid">
                {/* courseData.map((course) => (
                    <div key={course.id} className="course-card" onClick={() => setSelectedCourse(course)}>
                        <div className="course-thumbnail">
                            <img src={course.thumbnail} alt={course.title} />
                            <div className="course-overlay">
                                <div className="play-button">▶</div>
                            </div>
                            <div className="course-progress-overlay">
                                <div className="progress-circle">
                                    <svg viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="2"/>
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getProgressColor(course.progress)} strokeWidth="2" strokeDasharray={`${course.progress}, 100`} strokeLinecap="round"/>
                                    </svg>
                                    <span className="progress-text">{course.progress}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="course-content">
                            <div className="course-info">
                                <h3 className="course-title">{course.title}</h3>
                                <p className="course-subtitle">{course.subtitle}</p>
                                
                                <div className="course-instructor">
                                    <img src={course.instructorImage} alt={course.instructor} className="instructor-avatar" />
                                    <div className="instructor-info">
                                        <span className="instructor-name">{course.instructor}</span>
                                        <span className="instructor-title">{course.instructorTitle}</span>
                                    </div>
                                </div>
                                
                                <div className="course-rating">
                                    <div className="stars">
                                        {renderStars(course.rating)}
                                    </div>
                                    <span className="rating-text">{course.rating}</span>
                                    <span className="rating-count">({course.totalRatings.toLocaleString()})</span>
                                </div>
                                
                                <div className="course-meta">
                                    <span className="meta-item">{course.duration}</span>
                                    <span className="meta-item">{course.lectures} lectures</span>
                                    <span className="meta-item">{course.level}</span>
                                </div>
                                
                                <div className="course-price">
                                    <span className="current-price">${course.currentPrice}</span>
                                    <span className="original-price">${course.originalPrice}</span>
                                    <span className="discount">{Math.round(((course.originalPrice - course.currentPrice) / course.originalPrice) * 100)}% off</span>
                                </div>
                            </div>
                            
                            <div className="course-actions">
                                <button className="continue-btn">Continue Learning</button>
                                <button className="wishlist-btn">♡</button>
                            </div>
                        </div>
                    </div>
                ))} */}
            </section>

            {/* Course Detail Modal */}
            {selectedCourse && (
                <div className="modal-overlay" onClick={() => setSelectedCourse(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-course-info">
                                <img src={selectedCourse.thumbnail} alt={selectedCourse.title} className="modal-thumbnail" />
                                <div>
                                    <h3>{selectedCourse.title}</h3>
                                    <p className="modal-subtitle">{selectedCourse.subtitle}</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedCourse(null)}>×</button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="course-overview">
                                <div className="overview-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Progress</span>
                                        <span className="stat-value">{selectedCourse.progress}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Duration</span>
                                        <span className="stat-value">{selectedCourse.duration}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Lectures</span>
                                        <span className="stat-value">{selectedCourse.lectures}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Level</span>
                                        <span className="stat-value">{selectedCourse.level}</span>
                                    </div>
                                </div>
                                
                                <div className="course-instructor-modal">
                                    <img src={selectedCourse.instructorImage} alt={selectedCourse.instructor} />
                                    <div>
                                        <h4>{selectedCourse.instructor}</h4>
                                        <p>{selectedCourse.instructorTitle}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="course-curriculum">
                                <h4>Course Content</h4>
                                {selectedCourse.modules.map((module) => (
                                    <div key={module.id} className="module-item">
                                        <div className="module-header">
                                            <h5>{module.title}</h5>
                                            <span className="module-progress">{module.progress}%</span>
                                        </div>
                                        <div className="module-progress-bar">
                                            <div 
                                                className="module-progress-fill" 
                                                style={{
                                                    width: `${module.progress}%`,
                                                    backgroundColor: getProgressColor(module.progress)
                                                }}
                                            ></div>
                                        </div>
                                        <div className="lessons-list">
                                            {module.lessons.map((lesson) => (
                                                <div key={lesson.id} className="lesson-item">
                                                    <div className="lesson-info">
                                                        <span className="lesson-title">{lesson.title}</span>
                                                        <span className="lesson-duration">{lesson.duration}</span>
                                                    </div>
                                                    <div className="lesson-status">
                                                        {lesson.completed ? (
                                                            <span className="status-completed">✓ Completed</span>
                                                        ) : lesson.progress > 0 ? (
                                                            <span className="status-in-progress">{lesson.progress}%</span>
                                                        ) : (
                                                            <span className="status-not-started">Not Started</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
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

                    {activeTab === 'dashboard' ? renderDashboard() : activeTab === 'courses' ? <MyCourses /> : renderAssignments()}
                </main>
            </div>

            {/* Chatbot */}
            <Chatbot />

            {geminiFeedback && (
                <div className="feedback-modal-overlay">
                    <div className="feedback-modal-content">
                        <h3>Gemini Feedback</h3>
                        <p>{geminiFeedback}</p>
                        <button onClick={() => setGeminiFeedback(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
