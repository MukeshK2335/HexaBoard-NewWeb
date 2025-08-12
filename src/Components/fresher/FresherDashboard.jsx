import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import '../../Style/FresherDashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { db, auth } from "../../firebase";
import { doc, getDoc, collection, getDocs, query, where, updateDoc, addDoc, arrayUnion, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LoadingScreen from "../LoadingScreen.jsx";
import MyCourses from "./MyCourses.jsx";
import Chatbot from "./Chatbot.jsx";
import CodeChallenge from "./CodeChallenge.jsx";
import DailyProblem from "./DailyProblem.jsx";
import { FaHome, FaBook, FaTasks, FaBullseye, FaBars, FaCode, FaPuzzlePiece } from "react-icons/fa";
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';


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
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [geminiFeedback, setGeminiFeedback] = useState(null); // New state for Gemini feedback
    const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar visibility
    const [codingChallengeData, setCodingChallengeData] = useState([]); // State for coding challenge submissions
    const [dailyProblemData, setDailyProblemData] = useState([]); // State for daily problem submissions
    const [problemStreak, setProblemStreak] = useState(0); // State for daily problem streak
    const dropdownRef = useRef(null);

    // Handles user logout
    const handleLogout = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.uid);
                
                // Check if the user document exists and has loginActivity structure
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    if (!userData.loginActivity) {
                        // Initialize loginActivity structure if it doesn't exist
                        await updateDoc(userRef, {
                            lastLogoutTime: new Date().toISOString(),
                            loginActivity: {
                                weeklyLogins: [{
                                    loginTime: user.metadata.lastSignInTime,
                                    logoutTime: new Date().toISOString()
                                }]
                            }
                        });
                    } else {
                        // Update existing loginActivity
                        await updateDoc(userRef, {
                            lastLogoutTime: new Date().toISOString(),
                            'loginActivity.weeklyLogins': arrayUnion({
                                loginTime: user.metadata.lastSignInTime,
                                logoutTime: new Date().toISOString()
                            })
                        });
                    }
                }
            }
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
    
    // Handle sidebar visibility based on screen size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        
        // Set initial state
        handleResize();
        
        // Add event listener
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Fetches user data, courses, assignments, and progress from Firestore
    useEffect(() => {
        // Check for Gemini feedback from location state
        if (location.state?.geminiFeedback) {
            setGeminiFeedback(location.state.geminiFeedback);
            // Clear the feedback from state to prevent it from showing again on refresh
            navigate(location.pathname, { replace: true, state: { ...location.state, geminiFeedback: undefined } });
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            setError(null);

            if (user) {
                const userRef = doc(db, 'users', user.uid);
                // Fetch coding challenge submissions and daily problem data
                try {
                     const today = new Date();
                    const fakeData = [];
                    for (let i = 0; i < 180; i++) {
                        const date = new Date(today);
                        date.setDate(today.getDate() - i);
                        if (Math.random() > 0.4) {
                            fakeData.push({
                                date: date.toISOString().split('T')[0],
                                count: Math.floor(Math.random() * 4) + 1,
                                question: `Fake Challenge ${i}`
                            });
                        }
                    }
                    setCodingChallengeData(fakeData);
                     
                     // Fetch daily problem data
                     const problemsRef = collection(db, "users", user.uid, "dailyProblems");
                     const problemsSnap = await getDocs(problemsRef);
                     const problemData = problemsSnap.docs.map(doc => ({
                         id: doc.id,
                         ...doc.data(),
                         date: doc.data().timestamp?.toDate().toISOString().split('T')[0] || doc.data().date || new Date().toISOString().split('T')[0]
                     }));
                     setDailyProblemData(problemData);
                     
                     // Get user streak data
                     const userRef = doc(db, "users", user.uid);
                     const userDoc = await getDoc(userRef);
                     if (userDoc.exists()) {
                         const userData = userDoc.data();
                         setProblemStreak(userData.problemStreak || 0);
                     }
                 } catch (err) {
                     console.error("Error fetching coding challenges or daily problems:", err);
                 }
                try {
                    // Update login time when user logs in
                    
                    // First check if the user document exists and has loginActivity structure
                    const userDoc = await getDoc(userRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (!userData.loginActivity) {
                            // Initialize loginActivity structure if it doesn't exist
                            await updateDoc(userRef, {
                                lastLoginTime: new Date().toISOString(),
                                loginActivity: {
                                    weeklyLogins: []
                                }
                            });
                        } else {
                            // Just update the lastLoginTime
                            await updateDoc(userRef, {
                                lastLoginTime: new Date().toISOString()
                            });
                        }
                    }

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
                        console.log("Fetched assignments:", assignmentsList);
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

        // Re-fetch data if refreshAssignments flag is set
        if (location.state?.refreshAssignments) {
            if (auth.currentUser) {
                // We'll trigger a refresh by setting loading to true
                setLoading(true);
            }
            // Clear the flag after processing
            navigate(location.pathname, { replace: true, state: { ...location.state, refreshAssignments: false } });
        }

        return () => unsubscribe();
    }, [location.state?.refreshAssignments, navigate, location.pathname, location.state]);

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

          
            {/* Coding Challenge Heatmap */}
             <section className="coding-challenge-heatmap">
                 <h4>🧩 Coding Challenge Activity</h4>
                 <div style={{ marginTop: '10px', marginBottom: '20px' }}>
                     <CalendarHeatmap
                         startDate={new Date(new Date().getFullYear(), 0, 1)}
                         endDate={new Date()}
                         values={codingChallengeData.map(challenge => ({
                             date: challenge.date,
                             count: 1,
                             title: challenge.question || 'Coding Challenge'
                         }))}
                         classForValue={(value) => {
                             if (!value) {
                                 return 'color-empty';
                             }
                             return `color-scale-${Math.min(value.count, 4)}`;
                         }}
                         tooltipDataAttrs={(value) => {
                              if (!value || !value.date) {
                                  return null;
                              }
                              return {
                                  'data-tooltip-id': 'calendar-tooltip',
                                  'data-tooltip-content': `${value.date}: ${value.title}`,
                              };
                          }}
                     />
                     <ReactTooltip id="calendar-tooltip" />
                     <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#666' }}>
                             <span>Less</span>
                             <div style={{ display: 'flex', margin: '0 8px' }}>
                                 <div style={{ width: '10px', height: '10px', margin: '0 2px', backgroundColor: '#ebedf0' }}></div>
                                 <div style={{ width: '10px', height: '10px', margin: '0 2px', backgroundColor: '#c6e48b' }}></div>
                                 <div style={{ width: '10px', height: '10px', margin: '0 2px', backgroundColor: '#7bc96f' }}></div>
                                 <div style={{ width: '10px', height: '10px', margin: '0 2px', backgroundColor: '#239a3b' }}></div>
                                 <div style={{ width: '10px', height: '10px', margin: '0 2px', backgroundColor: '#196127' }}></div>
                             </div>
                             <span>More</span>
                         </div>
                     </div>
                 </div>
                 <p className="info-text" style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                     The heatmap shows days when you submitted coding challenges. Keep practicing to fill the calendar!
                 </p>
             </section>

             {/* Assignment Marks Chart */}
            <section className="progress">
                <div className="progress-header">
                    <h4>Assignment Marks Progress</h4>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    {assignments && assignments.length > 0 ? (
                        <BarChart data={assignments} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="courseTitle" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`Marks: ${value}`, '']}/>
                            <Bar dataKey="marks" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '1.1rem' }}>
                            No assignment marks data available.
                        </div>
                    )}
                </ResponsiveContainer>
            </section>

             {/* Certifications */}
             <section className="certifications">
                 <h4>🏆 Certifications Obtained</h4>
                 {certifications.length === 0 ? (
                     <p>No certifications yet. Complete assignments with a score above 65% to earn certificates!</p>
                 ) : (
                     <ul className="cert-list">
                         {certifications.map((cert, index) => (
                             <li key={index} className="cert-item">
                                 <div className="cert-icon">🎓</div>
                                 <div className="cert-details">
                                     <strong>{cert.title}</strong>
                                     <div className="cert-meta">
                                         <span className="cert-date">{formatDate(cert.time) || formatDate(cert.date)}</span>
                                         {cert.score && <span className="cert-score">Score: {cert.score}%</span>}
                                     </div>
                                 </div>
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
                            <p>Status: <span className={`assignment-status ${assignment.status.toLowerCase()}`}>{assignment.status}</span></p>
                            {assignment.dueDate && <p>Due: {formatDate(assignment.dueDate)}</p>}
                            {assignment.marks && <p>Score: <span className="assignment-score">{assignment.marks}%</span></p>}
                            {assignment.status !== "Completed" && (
                                <button
                                    className="take-assessment-btn"
                                    onClick={async () => {
                                        try {
                                            console.log("Attempting to find assessment for courseId:", assignment.courseId);
                                            const assessmentsQuery = query(collection(db, 'assessments'), where("courseId", "==", assignment.courseId));
                                            const querySnapshot = await getDocs(assessmentsQuery);
                                            
                                            if (!querySnapshot.empty) {
                                                const assessmentDoc = querySnapshot.docs[0];
                                                const assessmentId = assessmentDoc.id;
                                                const assessmentData = assessmentDoc.data();
                                                
                                                // Check if courseTitle exists in the assessment document
                                                if (!assessmentData.courseTitle) {
                                                    // Update the assessment document with courseTitle if it's missing
                                                    console.log("Adding courseTitle to assessment document:", assignment.courseTitle);
                                                    await updateDoc(doc(db, 'assessments', assessmentId), {
                                                        courseTitle: assignment.courseTitle
                                                    });
                                                }
                                                
                                                console.log("Found assessmentId:", assessmentId, "for courseId:", assignment.courseId);
                                                navigate(`/take-assessment/${assessmentId}`);
                                            } else {
                                                console.log("Creating new assessment for courseId:", assignment.courseId);
                                                // Create a new assessment if one doesn't exist
                                                try {
                                                    // Create a basic assessment with default questions
                                                    const newAssessment = {
                                                        title: `Assessment for ${assignment.courseTitle}`,
                                                        courseId: assignment.courseId,
                                                        courseTitle: assignment.courseTitle,
                                                        type: 'Quiz',
                                                        duration: 30,
                                                        passingScore: 70,
                                                        isActive: true,
                                                        createdAt: new Date(),
                                                        totalQuestions: 5,
                                                        totalPoints: 5,
                                                        questions: [
                                                            {
                                                                id: Date.now(),
                                                                question: `What is the main focus of ${assignment.courseTitle}?`,
                                                                type: 'multiple-choice',
                                                                options: ['Learning core concepts', 'Practical application', 'Historical background', 'Advanced techniques'],
                                                                correctAnswer: 0,
                                                                points: 1
                                                            }
                                                        ]
                                                    };
                                                    
                                                    const newAssessmentRef = await addDoc(collection(db, 'assessments'), newAssessment);
                                                    console.log("Created new assessment with ID:", newAssessmentRef.id);
                                                    navigate(`/take-assessment/${newAssessmentRef.id}`);
                                                } catch (createError) {
                                                    console.error("Error creating assessment:", createError);
                                                    alert("Failed to create assessment. Please try again.");
                                                }
                                            }
                                        } catch (error) {
                                            console.error("Error fetching assessment for course:", assignment.courseId, error);
                                            alert("Failed to load assessment. Please try again.");
                                        }
                                    }}
                                >
                                    Take Assessment
                                </button>
                            )}
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
     
     const renderCodingChallenge = () => (
         <CodeChallenge />
     );
     
     const renderDailyProblem = () => (
         <DailyProblem />
     );

    return (
        <div className={`dashboard-container ${sidebarOpen ? '' : 'sidebar-closed'}`}>
            <button className="hamburger-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <FaBars />
            </button>
            <div className="layout-wrapper">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                    <div className="logo">HexaBoard</div>
                    <nav className="nav-links">
                        <a
                            href="#"
                            className={activeTab === 'dashboard' ? 'active' : ''}
                            onClick={() => {
                                setActiveTab('dashboard');
                                if (window.innerWidth <= 768) setSidebarOpen(false);
                            }}
                        >
                            <span className="nav-icon"><FaHome /></span>
                            Dashboard
                        </a>
                        <a
                            href="#"
                            className={activeTab === 'courses' ? 'active' : ''}
                            onClick={() => {
                                setActiveTab('courses');
                                if (window.innerWidth <= 768) setSidebarOpen(false);
                            }}
                        >
                            <span className="nav-icon"><FaBook /></span>
                            My Courses
                        </a>
                        <a
                            href="#"
                            className={activeTab === 'assignments' ? 'active' : ''}
                            onClick={() => {
                                setActiveTab('assignments');
                                if (window.innerWidth <= 768) setSidebarOpen(false);
                            }}
                        >
                            <span className="nav-icon"><FaTasks /></span>
                            Assignments
                        </a>
                        <a
                             href="/fresher/daily-quiz"
                             className="daily-quiz-link"
                             onClick={() => {
                                 if (window.innerWidth <= 768) setSidebarOpen(false);
                             }}
                         >
                             <span className="nav-icon"><FaBullseye /></span>
                             Daily Quiz
                         </a>
                         <a
                             href="#"
                             className={activeTab === 'daily-problem' ? 'active' : ''}
                             onClick={() => {
                                 setActiveTab('daily-problem');
                                 if (window.innerWidth <= 768) setSidebarOpen(false);
                             }}
                         >
                             <span className="nav-icon"><FaCode /></span>
                             Daily Problem
                         </a>
                         <a
                             href="#"
                             className={activeTab === 'coding-challenge' ? 'active' : ''}
                             onClick={() => {
                                 setActiveTab('coding-challenge');
                                 if (window.innerWidth <= 768) setSidebarOpen(false);
                             }}
                         >
                             <span className="nav-icon"><FaCode /></span>
                             Coding Challenge
                         </a>
                    </nav>
                </aside>

                {/* Main */}
                <main className="main-content">
                    <header className="topbar">
                        <h2>{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'courses' ? 'My Learning' : activeTab === 'assignments' ? 'Assignments' : activeTab === 'coding-challenge' ? 'Coding Challenge' : activeTab === 'daily-problem' ? 'Daily Problem' : 'Dashboard'}</h2>
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
                     {activeTab === 'dashboard' ? renderDashboard() : 
                      activeTab === 'courses' ? renderCourses() : 
                      activeTab === 'assignments' ? renderAssignments() : 
                      activeTab === 'coding-challenge' ? renderCodingChallenge() :
                      activeTab === 'daily-problem' ? renderDailyProblem() :
                      renderDashboard()}
                </main>
            </div>

            {/* Chatbot */}
            <Chatbot />

            {geminiFeedback && (
                <div className="feedback-modal-overlay">
                    <div className="feedback-modal-content">
                        <h3>Hexabot Feedback</h3>
                        <p>{geminiFeedback}</p>
                        <button onClick={() => setGeminiFeedback(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;