import React, { useState, useEffect } from 'react';
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
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [user, setUser] = useState(null);

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
                        <div key={course.id} className="course-card" onClick={() => setSelectedCourse(course)}>
                            <div className="course-thumbnail">
                                <img src={course.thumbnailUrl || 'https://via.placeholder.com/300x150'} alt={`${course.title} thumbnail`} />
                            </div>
                            <div className="course-content">
                                <h3 className="course-title">{course.title}</h3>
                                <p className="course-instructor">by {course.instructor}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedCourse && (
                <div className="modal-overlay" onClick={() => setSelectedCourse(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedCourse.title}</h3>
                            <button className="close-btn" onClick={() => setSelectedCourse(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="course-description">{selectedCourse.description}</p>
                            <div className="lectures-list">
                                {selectedCourse.lectures?.map(lecture => (
                                    <div key={lecture.id} className="lecture-item">
                                        <h4>{lecture.title}</h4>
                                        <p>{lecture.description}</p>
                                        <video controls width="100%">
                                            <source src={lecture.videoUrl} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCourses;