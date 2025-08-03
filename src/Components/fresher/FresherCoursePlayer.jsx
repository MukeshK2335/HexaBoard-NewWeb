import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import '../../Style/FresherCoursePlayer.css';

const FresherCoursePlayer = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [currentLectureIndex, setCurrentLectureIndex] = useState(0);
    const [progress, setProgress] = useState(0); // New state for progress
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

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
                        // Set initial lecture index and progress from saved data
                        setCurrentLectureIndex(courseData.currentLectureIndex || 0);
                        setProgress(courseData.progress || 0);
                    } else {
                        console.error("Course not found!");
                        navigate('/fresher/my-courses'); // Redirect if course not found
                    }
                } catch (error) {
                    console.error("Error fetching course:", error);
                    navigate('/fresher/my-courses');
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

    useEffect(() => {
        // Update progress in Firestore whenever currentLectureIndex changes
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
                alert('Course Finished and Progress Saved!');
                // Create a new assignment for the completed course
                const assignmentsCollectionRef = collection(db, 'users', user.uid, 'assignments');
                await addDoc(assignmentsCollectionRef, {
                    courseId: course.id,
                    courseTitle: course.title,
                    status: 'pending', // Or 'assigned', 'new', etc.
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Example: Due in 7 days
                    createdAt: new Date(),
                    // Add any other relevant assessment details here
                });
                alert('New assignment created for this course!');
                navigate('/fresher/dashboard', { state: { activeTab: 'assignments' } }); // Redirect to dashboard and activate assignments tab
            } catch (error) {
                console.error("Error marking course as finished or creating assignment:", error);
                alert('Failed to mark course as finished or create assignment. Please try again.');
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
        <div className="fresher-course-player">
            <div className="video-player-section">
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
        </div>
    );
};

export default FresherCoursePlayer;
