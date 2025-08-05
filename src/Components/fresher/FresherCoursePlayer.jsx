import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import '../../Style/FresherCoursePlayer.css';

const FresherCoursePlayer = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [currentLectureIndex, setCurrentLectureIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [isSidebarHidden, setIsSidebarHidden] = useState(false);

    // Effect for initial course data fetch and authentication state management
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const courseDocRef = doc(db, 'users', currentUser.uid, 'courses', courseId);
                    const courseDocSnap = await getDoc(courseDocRef);

                    if (courseDocSnap.exists()) {
                        const courseData = { id: courseDocSnap.id, ...courseDocSnap.data() };
                        setCourse(courseData);
                        setCurrentLectureIndex(courseData.currentLectureIndex || 0);
                        setProgress(courseData.progress || 0);
                    } else {
                        console.error("Course not found!");
                        navigate('/fresher/dashboard'); // Redirect to dashboard if course not found
                    }
                } catch (error) {
                    console.error("Error fetching course:", error);
                    navigate('/fresher/dashboard');
                } finally {
                    setLoading(false);
                }
            } else {
                // Not authenticated, redirect to login
                navigate('/login');
            }
        });

        return () => unsubscribeAuth();
    }, [courseId, navigate]);

    // Effect to update progress in Firestore whenever lecture changes
    useEffect(() => {
        const updateCourseProgress = async () => {
            if (user && course && course.lectures) {
                const newProgress = Math.min(((currentLectureIndex + 1) / course.lectures.length) * 100, 100);
                setProgress(newProgress);
                const courseDocRef = doc(db, 'users', user.uid, 'courses', courseId);
                try {
                    await updateDoc(courseDocRef, {
                        currentLectureIndex: currentLectureIndex,
                        progress: newProgress,
                        completed: newProgress === 100 // Mark as completed if 100%
                    });
                } catch (error) {
                    console.error("Error updating course progress:", error);
                }
            }
        };
        updateCourseProgress();
    }, [currentLectureIndex, course, user, courseId]);

    const handleNextLecture = () => {
        if (course && currentLectureIndex < course.lectures.length - 1) {
            setCurrentLectureIndex(prevIndex => prevIndex + 1);
        }
    };

    const handleFinishCourse = async () => {
        if (user && course) {
            const courseDocRef = doc(db, 'users', user.uid, 'courses', courseId);
            try {
                await updateDoc(courseDocRef, {
                    currentLectureIndex: course.lectures.length - 1,
                    progress: 100,
                    completed: true
                });

                setNotification({ show: true, message: 'Congratulations! You have completed this course.' });

                setTimeout(async () => {
                    // Check if an assignment for this course already exists
                    const assignmentsCollectionRef = collection(db, 'users', user.uid, 'assignments');
                    const q = query(assignmentsCollectionRef, where('courseId', '==', course.id));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        await addDoc(assignmentsCollectionRef, {
                            courseId: course.id,
                            courseTitle: course.title,
                            status: 'pending',
                            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
                            createdAt: new Date(),
                        });
                        setNotification({ show: true, message: 'A new assignment has been created for this course!' });

                        // Increment completedCoursesCount for the user
                        const userDocRef = doc(db, 'users', user.uid);
                        await updateDoc(userDocRef, {
                            completedCoursesCount: increment(1)
                        });
                    } else {
                        setNotification({ show: true, message: 'Assignment for this course already exists!' });
                    }

                    setTimeout(() => {
                        setNotification({ show: false, message: '' });
                        navigate('/fresher/dashboard', { state: { activeTab: 'assignments' } });
                    }, 3000);

                }, 3000);

            } catch (error) {
                console.error("Error marking course as finished or creating assignment:", error);
                setNotification({ show: true, message: 'Failed to update course. Please try again.' });
                setTimeout(() => setNotification({ show: false, message: '' }), 3000);
            }
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading course...</p>
            </div>
        );
    }

    if (!course) {
        return <div className="error-message">Course not available.</div>;
    }

    const currentLecture = course.lectures[currentLectureIndex];

    return (
        <div className={`fresher-course-player ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
            {notification.show && (
                <div className="notification-animation">
                    {notification.message}
                </div>
            )}
            <div className="video-player-section">
                <button className="toggle-sidebar-btn" onClick={() => setIsSidebarHidden(!isSidebarHidden)}>
                    {isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
                </button>
                {currentLecture && currentLecture.videoUrl ? (
                    <video controls autoPlay key={currentLecture.videoUrl} className="main-video-player">
                        <source src={currentLecture.videoUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                ) : (
                    <div className="no-video-placeholder">
                        No video available for this lecture.
                    </div>
                )}
                <div className="lecture-info">
                    <h2>{currentLecture?.title}</h2>
                    <p>{currentLecture?.description}</p>
                </div>
                <div className="player-controls">
                    {currentLectureIndex < course.lectures.length - 1 && (
                        <button className="next-lesson-btn" onClick={handleNextLecture}>
                            Next Lesson
                        </button>
                    )}
                    {currentLectureIndex === course.lectures.length - 1 && (
                        <button className="finish-course-btn" onClick={handleFinishCourse}>
                            Finish Course
                        </button>
                    )}
                </div>
            </div>

            {!isSidebarHidden && (
                <div className="course-sidebar">
                    <h3>{course.title}</h3>
                    <div className="lectures-list">
                        {course.lectures.map((lecture, index) => (
                            <div
                                key={lecture.id || index}
                                className={`sidebar-lecture-item ${index === currentLectureIndex ? 'active' : ''}`}
                                onClick={() => setCurrentLectureIndex(index)}
                            >
                                <span>{index + 1}. {lecture.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FresherCoursePlayer;