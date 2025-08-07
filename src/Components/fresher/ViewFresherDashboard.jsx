import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../Style/ViewFresherDashboard.css';
import { Home, User, FileText, BookOpen, CheckSquare } from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import FresherProfile from '../fresher/FresherProfile.jsx';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ViewFresherDashboard = () => {
    const { id } = useParams();
    const [fresher, setFresher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [dashboardData, setDashboardData] = useState({
        activeCourses: 0,
        completedCourses: 0,
        pendingAssignments: 0,
        completedAssignments: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFresherData = async () => {
            setLoading(true);
            if (!id) {
                console.error("Fresher ID is undefined.");
                setFresher(null);
                setLoading(false);
                return;
            }
            try {
                // Fetch fresher profile
                const docRef = doc(db, 'users', id);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const fresherData = {
                        uid: docSnap.id,
                        ...docSnap.data()
                    };
                    setFresher(fresherData);
                    
                    // Fetch courses
                    const coursesRef = collection(db, 'users', id, 'courses');
                    const coursesSnap = await getDocs(coursesRef);
                    const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCourses(coursesData);
                    
                    // Fetch assignments
                    const assignmentsRef = collection(db, 'users', id, 'assignments');
                    const assignmentsSnap = await getDocs(assignmentsRef);
                    const assignmentsData = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAssignments(assignmentsData);
                    
                    // Calculate dashboard metrics
                    const activeCoursesCount = coursesData.filter(course => !course.completed).length;
                    const completedCoursesCount = coursesData.filter(course => course.completed).length;
                    const pendingAssignmentsCount = assignmentsData.filter(a => a.status !== 'Completed').length;
                    const completedAssignmentsCount = assignmentsData.length - pendingAssignmentsCount;
                    
                    setDashboardData({
                        activeCourses: activeCoursesCount,
                        completedCourses: completedCoursesCount,
                        pendingAssignments: pendingAssignmentsCount,
                        completedAssignments: completedAssignmentsCount
                    });
                } else {
                    setFresher(null);
                }
            } catch (error) {
                console.error('Error fetching fresher data:', error);
                setFresher(null);
            } finally {
                setLoading(false);
            }
        };

        fetchFresherData();
    }, [id]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">HexaBoard</div>
                <ul className="sidebar-menu">
                    <li>
                        <button
                            className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <Home size={18} />
                            Dashboard
                        </button>
                    </li>
                    <li>
                        <button
                            className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            <User size={18} />
                            Profile
                        </button>
                    </li>
                    <li>
                        <button
                            className={`sidebar-link ${activeTab === 'courses' ? 'active' : ''}`}
                            onClick={() => setActiveTab('courses')}
                        >
                            <BookOpen size={18} />
                            Courses
                        </button>
                    </li>
                    <li>
                        <button
                            className={`sidebar-link ${activeTab === 'assignments' ? 'active' : ''}`}
                            onClick={() => setActiveTab('assignments')}
                        >
                            <CheckSquare size={18} />
                            Assignments
                        </button>
                    </li>
                </ul>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {loading ? (
                    <p>Loading...</p>
                ) : !fresher ? (
                    <h2>Fresher not found</h2>
                ) : activeTab === 'profile' ? (
                    <FresherProfile fresher={fresher} assignments={assignments} />
                ) : activeTab === 'courses' ? (
                    // Courses content
                    <div className="fresher-courses">
                        <h2>Courses for {fresher.name}</h2>
                        {courses.length === 0 ? (
                            <p>No courses assigned yet.</p>
                        ) : (
                            <div className="courses-grid">
                                {courses.map(course => (
                                    <div key={course.id} className="course-card">
                                        <h3>{course.title}</h3>
                                        <p>
                                            <strong>Progress:</strong>
                                            <span className="progress-indicator">
                                                <span className="progress-bar" style={{ width: `${course.progress || 0}%` }}></span>
                                                <span className="progress-text">{course.progress || 0}%</span>
                                            </span>
                                        </p>
                                        <p>
                                            <strong>Status:</strong>
                                            <span className={`status-badge ${course.completed ? 'completed' : 'pending'}`}>
                                                {course.completed ? 'Completed' : 'In Progress'}
                                            </span>
                                        </p>
                                        {course.lastAccessed && (
                                            <p>
                                                <strong>Last Accessed:</strong>
                                                <span>{new Date(course.lastAccessed.seconds * 1000).toLocaleDateString()}</span>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'assignments' ? (
                    // Assignments content
                    <div className="fresher-assignments">
                        <h2>Assignments for {fresher.name}</h2>
                        {assignments.length === 0 ? (
                            <p>No assignments yet.</p>
                        ) : (
                            <div className="assignments-list">
                                {assignments.map(assignment => (
                                    <div key={assignment.id} className="assignment-card">
                                        <h3>{assignment.courseTitle || 'Assignment'}</h3>
                                        <p>
                                            <strong>Status:</strong> 
                                            <span className={`status-badge ${assignment.status?.toLowerCase()}`}>
                                                {assignment.status || 'Pending'}
                                            </span>
                                        </p>
                                        {assignment.marks !== undefined && (
                                            <p>
                                                <strong>Score:</strong> 
                                                <span className="result-score">{assignment.marks}%</span>
                                            </p>
                                        )}
                                        {assignment.submittedOn && (
                                            <p>
                                                <strong>Submitted:</strong> 
                                                <span>{new Date(assignment.submittedOn.seconds * 1000).toLocaleDateString()}</span>
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Dashboard content here
                    <div className="fresher-dashboard">
                        <div className="fresher-profile-card">
                            <h2>{fresher.name}'s Dashboard</h2>
                            <p><strong>Email:</strong> {fresher.email}</p>
                            <p><strong>Department:</strong> {fresher.department || 'N/A'}</p>
                            <p><strong>Skill:</strong> {fresher.skill || 'N/A'}</p>
                            <p><strong>Status:</strong> {fresher.status || 'N/A'}</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="stats-cards">
                            <div className="stat-card">
                                <h4>Active Courses</h4>
                                <p className="stat-count">{dashboardData.activeCourses}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Completed Courses</h4>
                                <p className="stat-count">{dashboardData.completedCourses}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Pending Assignments</h4>
                                <p className="stat-count">{dashboardData.pendingAssignments}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Completed Assignments</h4>
                                <p className="stat-count">{dashboardData.completedAssignments}</p>
                            </div>
                        </div>

                        {/* Assignment Progress Chart */}
                        {assignments.length > 0 && (
                            <div className="chart-section">
                                <h3>Assignment Progress</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={[
                                        { name: 'Pending', value: dashboardData.pendingAssignments },
                                        { name: 'Completed', value: dashboardData.completedAssignments }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="value" fill="#4F46E5" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewFresherDashboard;
