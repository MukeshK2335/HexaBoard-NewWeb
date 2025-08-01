import React, { useEffect, useState, useRef } from "react";
import '../../Style/FresherDashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import LoadingScreen from "../LoadingScreen.jsx";
import MyCourses from "./MyCourses.jsx";

// Helper to format Firestore Timestamp or string
function formatDate(ts) {
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
    return '';
}

// Course data with Udemy-style content
const courseData = [
    {
        id: 1,
        title: "Complete Web Development Bootcamp 2024",
        subtitle: "Learn HTML, CSS, JavaScript, React, Node.js, MongoDB and more!",
        instructor: "Sarah Johnson",
        instructorTitle: "Full Stack Developer & Instructor",
        instructorImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        rating: 4.7,
        totalRatings: 15420,
        studentsEnrolled: 125000,
        originalPrice: 199.99,
        currentPrice: 89.99,
        duration: "42.5 hours",
        lectures: 385,
        level: "All Levels",
        language: "English",
        lastUpdated: "December 2023",
        certificate: true,
        progress: 75,
        status: "In Progress",
        thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop",
        modules: [
            {
                id: 1,
                title: "HTML & CSS Fundamentals",
                lessons: [
                    { id: 1, title: "Introduction to HTML", duration: "45 min", completed: true, progress: 100 },
                    { id: 2, title: "CSS Styling & Layout", duration: "60 min", completed: true, progress: 100 },
                    { id: 3, title: "Responsive Design Principles", duration: "90 min", completed: false, progress: 60 },
                    { id: 4, title: "CSS Grid & Flexbox Mastery", duration: "75 min", completed: false, progress: 0 }
                ],
                progress: 65
            },
            {
                id: 2,
                title: "JavaScript Programming",
                lessons: [
                    { id: 5, title: "Variables & Data Types", duration: "50 min", completed: true, progress: 100 },
                    { id: 6, title: "Functions & Scope", duration: "65 min", completed: true, progress: 100 },
                    { id: 7, title: "DOM Manipulation", duration: "80 min", completed: false, progress: 30 },
                    { id: 8, title: "Event Handling & AJAX", duration: "70 min", completed: false, progress: 0 }
                ],
                progress: 58
            },
            {
                id: 3,
                title: "React Development",
                lessons: [
                    { id: 9, title: "Introduction to React", duration: "90 min", completed: false, progress: 0 },
                    { id: 10, title: "Components & Props", duration: "75 min", completed: false, progress: 0 },
                    { id: 11, title: "State Management", duration: "85 min", completed: false, progress: 0 },
                    { id: 12, title: "Hooks & Lifecycle", duration: "95 min", completed: false, progress: 0 }
                ],
                progress: 0
            }
        ]
    },
    {
        id: 2,
        title: "Data Science & Machine Learning Masterclass",
        subtitle: "Master Python, NumPy, Pandas, Scikit-learn, TensorFlow and more!",
        instructor: "Dr. Michael Chen",
        instructorTitle: "Senior Data Scientist at Google",
        instructorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        rating: 4.8,
        totalRatings: 8920,
        studentsEnrolled: 89000,
        originalPrice: 299.99,
        currentPrice: 129.99,
        duration: "58.5 hours",
        lectures: 425,
        level: "Intermediate",
        language: "English",
        lastUpdated: "January 2024",
        certificate: true,
        progress: 45,
        status: "In Progress",
        thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop",
        modules: [
            {
                id: 1,
                title: "Python for Data Science",
                lessons: [
                    { id: 1, title: "Python Basics & Setup", duration: "60 min", completed: true, progress: 100 },
                    { id: 2, title: "NumPy & Pandas Mastery", duration: "90 min", completed: true, progress: 100 },
                    { id: 3, title: "Data Visualization with Matplotlib", duration: "75 min", completed: false, progress: 80 },
                    { id: 4, title: "Statistical Analysis", duration: "85 min", completed: false, progress: 0 }
                ],
                progress: 70
            },
            {
                id: 2,
                title: "Machine Learning Fundamentals",
                lessons: [
                    { id: 5, title: "Supervised Learning Algorithms", duration: "100 min", completed: false, progress: 0 },
                    { id: 6, title: "Unsupervised Learning", duration: "95 min", completed: false, progress: 0 },
                    { id: 7, title: "Model Evaluation & Validation", duration: "80 min", completed: false, progress: 0 },
                    { id: 8, title: "Feature Engineering", duration: "90 min", completed: false, progress: 0 }
                ],
                progress: 0
            }
        ]
    },
    {
        id: 3,
        title: "Digital Marketing & Social Media Strategy",
        subtitle: "Learn SEO, SEM, Social Media Marketing, Email Marketing and more!",
        instructor: "Emma Rodriguez",
        instructorTitle: "Digital Marketing Expert & Consultant",
        instructorImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        rating: 4.6,
        totalRatings: 6230,
        studentsEnrolled: 67000,
        originalPrice: 149.99,
        currentPrice: 69.99,
        duration: "28.5 hours",
        lectures: 245,
        level: "Beginner",
        language: "English",
        lastUpdated: "November 2023",
        certificate: true,
        progress: 20,
        status: "Just Started",
        thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop",
        modules: [
            {
                id: 1,
                title: "Marketing Fundamentals",
                lessons: [
                    { id: 1, title: "Marketing Principles & Strategy", duration: "45 min", completed: true, progress: 100 },
                    { id: 2, title: "Target Audience Analysis", duration: "60 min", completed: false, progress: 40 },
                    { id: 3, title: "Brand Positioning & Messaging", duration: "70 min", completed: false, progress: 0 },
                    { id: 4, title: "Marketing Mix & 4Ps", duration: "65 min", completed: false, progress: 0 }
                ],
                progress: 35
            },
            {
                id: 2,
                title: "Digital Marketing Channels",
                lessons: [
                    { id: 5, title: "Social Media Marketing", duration: "80 min", completed: false, progress: 0 },
                    { id: 6, title: "Email Marketing Campaigns", duration: "75 min", completed: false, progress: 0 },
                    { id: 7, title: "Content Marketing Strategy", duration: "85 min", completed: false, progress: 0 },
                    { id: 8, title: "SEO & SEM Optimization", duration: "90 min", completed: false, progress: 0 }
                ],
                progress: 0
            }
        ]
    }
];

const Dashboard = () => {
    const [data, setData] = useState({ activeCourses: 0, pendingAssignments: 0, completed: 0 });
    const [userName, setUserName] = useState("...");
    const [certifications, setCertifications] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                setLoading(true);
                setError(null);
                console.log("onAuthStateChanged fired. User:", user);
                if (user) {
                    // Fetch user profile data
                    const docRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(docRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        console.log("Fetched user data:", userData);
                        setUserName(userData.name || "Fresher");
                        setData({
                            activeCourses: userData.activeCourses || courseData.length,
                            pendingAssignments: userData.pendingAssignments || 8,
                            completed: userData.completedAssignments || 12,
                        });
                    } else {
                        setError("User profile not found.");
                        setUserName("Fresher");
                        console.error("User profile not found for UID:", user.uid);
                    }
                    // Fetch certifications
                    try {
                        const certRef = collection(db, "users", user.uid, "certifications");
                        const certSnap = await getDocs(certRef);
                        const certs = certSnap.docs.map(doc => doc.data());
                        setCertifications(certs);
                        console.log("Fetched certifications:", certs);
                    } catch (certErr) {
                        console.error("Error loading certifications:", certErr);
                        setCertifications([]);
                    }
                    // Fetch progress data (date-by-date)
                    try {
                        const progressRef = collection(db, "users", user.uid, "progress");
                        const progressSnap = await getDocs(progressRef);
                        const progressArr = progressSnap.docs.map(doc => doc.data());
                        // Defensive: filter for valid entries
                        const filtered = progressArr.filter(p => p.date && typeof p.progress === 'number');
                        filtered.sort((a, b) => (a.date > b.date ? 1 : -1));
                        setProgressData(filtered);
                        console.log("Fetched progress data:", filtered);
                    } catch (progressErr) {
                        console.error("Error loading progress data:", progressErr);
                        setProgressData([]);
                    }
                } else {
                    setError("No user is logged in.");
                    console.error("No user is logged in.");
                }
            } catch (err) {
                console.error("Error loading user data:", err);
                setError("Failed to load user data. Please try again.");
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

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
                    <h4>Completed</h4>
                    <p className="count">{data.completed}</p>
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
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '1.1rem'}}>
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
                {courseData.map((course) => (
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
                ))}
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
                        <a href="#">Schedule</a>
                        <a href="#">Assignments</a>
                    </nav>
                </aside>

                {/* Main */}
                <main className="main-content">
                    <header className="topbar">
                        <h2>{activeTab === 'dashboard' ? 'Dashboard' : 'My Learning'}</h2>
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

                    {activeTab === 'dashboard' ? renderDashboard() : activeTab === 'courses' ? <MyCourses /> : renderCourses()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
