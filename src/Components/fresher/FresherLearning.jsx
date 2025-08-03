import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    addDoc,
    query,
    where,
    serverTimestamp 
} from 'firebase/firestore';
import { 
    BookOpen, 
    Play, 
    CheckCircle, 
    Clock, 
    Award, 
    FileText,
    BarChart3,
    Target,
    Star,
    Heart,
    Users,
    Calendar
} from 'lucide-react';
import '../../Style/FresherLearning.css';

const FresherLearning = () => {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [progress, setProgress] = useState({});
    const [activeFilter, setActiveFilter] = useState('All Courses');
    const [fresherData, setFresherData] = useState(null);

    useEffect(() => {
        if (auth.currentUser) {
            fetchUserData();
        }
    }, []);

    const fetchUserData = async () => {
        try {
            const userId = auth.currentUser.uid;
            
            // Fetch user data
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();
            setFresherData(userData);
            
            const enrolledCourseIds = userData?.enrolledCourses || [];
            
            // Fetch all courses
            const coursesSnapshot = await getDocs(collection(db, 'users', userId, 'courses'));
            const allCourses = coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setEnrolledCourses(allCourses);
            setAvailableCourses(allCourses); // For now, all assigned courses are available
            
            // Progress is already part of the course data from CourseManagement.jsx
            // No need for separate userProgress collection or sample progress data
            const progressData = {};
            allCourses.forEach(course => {
                progressData[course.id] = { overallProgress: course.progress || 0 };
            });
            setProgress(progressData);
            
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    

    const getFilteredCourses = () => {
        switch (activeFilter) {
            case 'In Progress':
                return availableCourses.filter(course => 
                    progress[course.id] && progress[course.id].overallProgress > 0 && progress[course.id].overallProgress < 100
                );
            case 'Completed':
                return availableCourses.filter(course => 
                    progress[course.id] && progress[course.id].overallProgress === 100
                );
            case 'Wishlist':
                return []; // Implement wishlist functionality
            default:
                return availableCourses;
        }
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                size={14} 
                className={i < Math.floor(rating) ? 'star-filled' : 'star-empty'}
                fill={i < Math.floor(rating) ? '#fbbf24' : 'none'}
            />
        ));
    };

    return (
        <div className="learning-container">
            <div className="learning-header">
                <div className="header-content">
                    <h1>My Learning</h1>
                    <div className="user-info">
                        <span>{fresherData?.name || 'Fresher'} ▼</span>
                    </div>
                </div>
                <div className="learning-subtitle">
                    <h2>My Learning</h2>
                    <p>Continue where you left off</p>
                </div>
            </div>

            <div className="filter-tabs">
                {['All Courses', 'In Progress', 'Completed', 'Wishlist'].map(filter => (
                    <button
                        key={filter}
                        className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <div className="courses-grid">
                {getFilteredCourses().map(course => (
                    <div key={course.id} className="course-card">
                        <div className="course-image">
                            <img src={course.thumbnailUrl} alt={course.title} />
                            {progress[course.id] && (
                                <div className="progress-circle">
                                    <span>{progress[course.id].overallProgress}%</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="course-content">
                            <h3 className="course-title">{course.title}</h3>
                            <p className="course-description">{course.description}</p>
                            
                            <div className="instructor-info">
                                <div className="instructor-avatar">
                                    <Users size={16} />
                                </div>
                                <div className="instructor-details">
                                    <span className="instructor-name">{course.instructor}</span>
                                    <span className="instructor-title">{course.instructorTitle}</span>
                                </div>
                            </div>
                            
                            <div className="course-rating">
                                <div className="stars">
                                    {renderStars(course.rating)}
                                </div>
                                <span className="rating-number">{course.rating}</span>
                                <span className="review-count">({course.reviews.toLocaleString()})</span>
                            </div>
                            
                            <div className="course-meta">
                                <span className="duration">
                                    <Clock size={14} />
                                    {course.duration}
                                </span>
                                <span className="lectures">
                                    <FileText size={14} />
                                    {course.lectures} lectures
                                </span>
                                <span className="level">{course.level}</span>
                            </div>
                            
                            <div className="course-footer">
                                <div className="pricing">
                                    <span className="current-price">${course.price}</span>
                                    <span className="original-price">${course.originalPrice}</span>
                                    <span className="discount">{course.discount}</span>
                                </div>
                                
                                <div className="course-actions">
                                    {progress[course.id] ? (
                                        <button className="continue-btn">
                                            Continue Learning
                                        </button>
                                    ) : (
                                        <button 
                                            className="enroll-btn"
                                            onClick={() => enrollInCourse(course.id)}
                                        >
                                            Enroll Now
                                        </button>
                                    )}
                                    <button className="wishlist-btn">
                                        <Heart size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FresherLearning;