import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { courseService } from '../../services/courseService';
import '../../Style/CourseDetailView.css'; // We'll create this CSS file

const CourseDetailView = () => {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [currentLesson, setCurrentLesson] = useState(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            if (!auth.currentUser) {
                setLoading(false);
                return;
            }
            try {
                const userId = auth.currentUser.uid;
                const courseRef = doc(db, 'users', userId, 'courses', courseId);
                const courseDoc = await getDoc(courseRef);

                if (courseDoc.exists()) {
                    const courseData = { id: courseDoc.id, ...courseDoc.data() };
                    setCourse(courseData);
                    // Set the first module's first lesson video as default
                    if (courseData.modules && courseData.modules.length > 0 && courseData.modules[0].lessons && courseData.modules[0].lessons.length > 0) {
                        setCurrentVideo(courseData.modules[0].lessons[0].videoUrl);
                        setCurrentLesson(courseData.modules[0].lessons[0]);
                    } else if (courseData.modules && courseData.modules.length > 0 && courseData.modules[0].videoUrl) {
                        // Fallback to module video if no lessons
                        setCurrentVideo(courseData.modules[0].videoUrl);
                        setCurrentLesson(courseData.modules[0]); // Treat module as lesson for display
                    }
                } else {
                    console.log("No such course!");
                }
            } catch (error) {
                console.error("Error fetching course details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
    }, [courseId]);

    const handleLessonClick = (videoUrl, lesson) => {
        setCurrentVideo(videoUrl);
        setCurrentLesson(lesson);
        // Optionally, mark lesson as completed here or when video finishes
    };

    if (loading) {
        return <div className="loading">Loading course details...</div>;
    }

    if (!course) {
        return <div className="no-course-found">Course not found.</div>;
    }

    return (
        <div className="course-detail-view">
            <div className="course-detail-header">
                <h1>{course.title}</h1>
                <p>{course.description}</p>
                <p>Instructor: {course.instructor}</p>
            </div>

            <div className="course-content-area">
                <div className="video-player-section">
                    {currentVideo ? (
                        <video key={currentVideo} controls src={currentVideo} className="main-video-player">
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <div className="no-video-placeholder">
                            Select a lesson or module to play its video.
                        </div>
                    )}
                    {currentLesson && (
                        <div className="current-lesson-info">
                            <h3>{currentLesson.title}</h3>
                            <p>{currentLesson.description}</p>
                            {currentLesson.duration && <p>Duration: {currentLesson.duration}</p>}
                        </div>
                    )}
                </div>

                <div className="course-modules-list">
                    <h2>Course Modules</h2>
                    {course.modules && course.modules.length > 0 ? (
                        course.modules.map((module, moduleIndex) => (
                            <div key={module.id || moduleIndex} className="module-item">
                                <h3>{module.title}</h3>
                                <p>{module.description}</p>
                                {module.videoUrl && (
                                    <button onClick={() => handleLessonClick(module.videoUrl, module)}>
                                        Play Module Video
                                    </button>
                                )}
                                {module.lessons && module.lessons.length > 0 && (
                                    <div className="module-lessons">
                                        <h4>Lessons:</h4>
                                        {module.lessons.map((lesson, lessonIndex) => (
                                            <div key={lesson.id || lessonIndex} className="lesson-item">
                                                <span className="lesson-title">{lesson.title}</span>
                                                {lesson.videoUrl && (
                                                    <button onClick={() => handleLessonClick(lesson.videoUrl, lesson)}>
                                                        Play Lesson
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p>No modules available for this course.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseDetailView;
