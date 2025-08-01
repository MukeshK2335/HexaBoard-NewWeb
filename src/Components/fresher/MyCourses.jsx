import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    query,
    orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import '../../Style/MyCourses.css';

const MyCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch courses for the current user
                const coursesRef = collection(db, 'users', currentUser.uid, 'courses');
                const q = query(coursesRef, orderBy('createdAt', 'desc'));
                
                const unsubscribeCourses = onSnapshot(q, (snapshot) => {
                    const coursesList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setCourses(coursesList);
                    setLoading(false);
                }, (error) => {
                    console.error('Error fetching courses:', error);
                    setLoading(false);
                });

                return () => unsubscribeCourses();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLessonComplete = async (courseId, moduleId, lessonId) => {
        try {
            const courseRef = doc(db, 'users', user.uid, 'courses', courseId);
            
            // Find the course and update the lesson completion status
            const updatedCourses = courses.map(course => {
                if (course.id === courseId) {
                    const updatedModules = course.modules.map(module => {
                        if (module.id === moduleId) {
                            const updatedLessons = module.lessons.map(lesson => {
                                if (lesson.id === lessonId) {
                                    return { ...lesson, completed: !lesson.completed };
                                }
                                return lesson;
                            });
                            return { ...module, lessons: updatedLessons };
                        }
                        return module;
                    });
                    return { ...course, modules: updatedModules };
                }
                return course;
            });

            // Update the course in Firestore
            const courseToUpdate = updatedCourses.find(c => c.id === courseId);
            await updateDoc(courseRef, {
                modules: courseToUpdate.modules,
                updatedAt: new Date()
            });

            setCourses(updatedCourses);
        } catch (error) {
            console.error('Error updating lesson completion:', error);
            alert('Failed to update lesson completion');
        }
    };

    const calculateCourseProgress = (course) => {
        if (!course.modules || course.modules.length === 0) return 0;
        
        let totalLessons = 0;
        let completedLessons = 0;
        
        course.modules.forEach(module => {
            if (module.lessons) {
                totalLessons += module.lessons.length;
                completedLessons += module.lessons.filter(lesson => lesson.completed).length;
            }
        });
        
        return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    };

    const calculateModuleProgress = (module) => {
        if (!module.lessons || module.lessons.length === 0) return 0;
        
        const completedLessons = module.lessons.filter(lesson => lesson.completed).length;
        return Math.round((completedLessons / module.lessons.length) * 100);
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return '#10b981';
        if (progress >= 60) return '#f59e0b';
        if (progress >= 40) return '#f97316';
        return '#ef4444';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'active': return '#3b82f6';
            case 'paused': return '#f59e0b';
            default: return '#6b7280';
        }
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
                <p>Continue your learning journey</p>
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
                        <div key={course.id} className="course-card">
                            <div className="course-header">
                                <div className="course-status">
                                    <span 
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(course.status) }}
                                    >
                                        {course.status || 'active'}
                                    </span>
                                </div>
                                <div className="course-progress">
                                    <div className="progress-circle">
                                        <svg viewBox="0 0 36 36">
                                            <path 
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                                fill="none" 
                                                stroke="#e5e7eb" 
                                                strokeWidth="2"
                                            />
                                            <path 
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                                fill="none" 
                                                stroke={getProgressColor(calculateCourseProgress(course))} 
                                                strokeWidth="2" 
                                                strokeDasharray={`${calculateCourseProgress(course)}, 100`} 
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <span className="progress-text">{calculateCourseProgress(course)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="course-content">
                                <h3 className="course-title">{course.title}</h3>
                                <p className="course-description">{course.description}</p>
                                
                                <div className="course-meta">
                                    <span className="meta-item">
                                        <strong>Instructor:</strong> {course.instructor}
                                    </span>
                                    <span className="meta-item">
                                        <strong>Duration:</strong> {course.duration}
                                    </span>
                                    <span className="meta-item">
                                        <strong>Level:</strong> {course.level}
                                    </span>
                                    <span className="meta-item">
                                        <strong>Category:</strong> {course.category}
                                    </span>
                                </div>

                                <button 
                                    className="view-course-btn"
                                    onClick={() => setSelectedCourse(course)}
                                >
                                    View Course
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Course Detail Modal */}
            {selectedCourse && (
                <div className="modal-overlay" onClick={() => setSelectedCourse(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-course-info">
                                <h3>{selectedCourse.title}</h3>
                                <p className="modal-subtitle">{selectedCourse.description}</p>
                            </div>
                            <button 
                                className="close-btn" 
                                onClick={() => setSelectedCourse(null)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="course-overview">
                                <div className="overview-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Progress</span>
                                        <span className="stat-value">{calculateCourseProgress(selectedCourse)}%</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Duration</span>
                                        <span className="stat-value">{selectedCourse.duration}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Level</span>
                                        <span className="stat-value">{selectedCourse.level}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Status</span>
                                        <span className="stat-value">{selectedCourse.status || 'active'}</span>
                                    </div>
                                </div>
                                
                                <div className="course-instructor">
                                    <h4>Instructor</h4>
                                    <p>{selectedCourse.instructor}</p>
                                </div>
                            </div>
                            
                            <div className="course-curriculum">
                                <h4>Course Content</h4>
                                {selectedCourse.modules && selectedCourse.modules.length > 0 ? (
                                    selectedCourse.modules.map((module) => (
                                        <div key={module.id} className="module-item">
                                            <div className="module-header">
                                                <h5>{module.title}</h5>
                                                <span className="module-progress">
                                                    {calculateModuleProgress(module)}%
                                                </span>
                                            </div>
                                            <p className="module-description">{module.description}</p>
                                            <div className="module-progress-bar">
                                                <div 
                                                    className="module-progress-fill" 
                                                    style={{
                                                        width: `${calculateModuleProgress(module)}%`,
                                                        backgroundColor: getProgressColor(calculateModuleProgress(module))
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="lessons-list">
                                                {module.lessons && module.lessons.length > 0 ? (
                                                    module.lessons.map((lesson) => (
                                                        <div key={lesson.id} className="lesson-item">
                                                            <div className="lesson-info">
                                                                <span className="lesson-title">{lesson.title}</span>
                                                                <span className="lesson-duration">{lesson.duration}</span>
                                                            </div>
                                                            <div className="lesson-actions">
                                                                <button 
                                                                    className={`lesson-status-btn ${lesson.completed ? 'completed' : ''}`}
                                                                    onClick={() => handleLessonComplete(selectedCourse.id, module.id, lesson.id)}
                                                                >
                                                                    {lesson.completed ? '✓ Completed' : 'Mark Complete'}
                                                                </button>
                                                                {lesson.videoUrl && (
                                                                    <a 
                                                                        href={lesson.videoUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="watch-video-btn"
                                                                    >
                                                                        Watch Video
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="no-lessons">No lessons available in this module.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-modules">No modules available in this course.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCourses; 