import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import {
    collection,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import '../../Style/MyCourses.css';

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const coursesRef = collection(db, 'users', currentUser.uid, 'courses');
                const q = query(coursesRef, orderBy('createdAt', 'desc'));

                const unsubscribeCourses = onSnapshot(q, (snapshot) => {
                    const coursesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCourses(coursesList);
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching courses:', error);
                    setLoading(false);
                });

                return () => unsubscribeCourses();
            } else {
                setUser(null);
                setCourses([]);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleCourseClick = (courseId) => {
        navigate(`/fresher/course/${courseId}`);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading your courses...</p>
            </div>
        );
    }

    return (
        <div className="my-courses">
            <div className="courses-header">
                <h2>My Courses</h2>
                <p>Your learning journey starts here</p>
            </div>

            {courses.length === 0 ? (
                <div className="no-courses">
                    <div className="no-courses-icon">📚</div>
                    <h3>No courses assigned yet</h3>
                    <p>Your admin will assign courses to you soon. Check back later!</p>
                </div>
            ) : (
                <div className="courses-grid">
                    {courses.map(course => (
                        <div key={course.id} className={`course-card ${course.completed ? 'completed-course' : ''}`} onClick={() => handleCourseClick(course.id)}>
                            <div className="course-thumbnail">
                                <img src={course.thumbnailUrl || 'https://via.placeholder.com/300x150'} alt={`${course.title} thumbnail`} />
                                {course.completed && <span className="completed-badge">Completed</span>}
                            </div>
                            <div className="course-content">
                                <h3 className="course-title">{course.title}</h3>
                                <p className="course-instructor">by {course.instructor}</p>
                                {course.progress !== undefined && (
                                    <div className="course-progress">
                                        <div className="progress-bar-container">
                                            <div className="progress-bar" style={{ width: `${course.progress}%` }}></div>
                                        </div>
                                        <span className="progress-text">{Math.round(course.progress)}% Completed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyCourses;