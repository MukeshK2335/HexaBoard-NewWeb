import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { courseService } from '../../services/courseService';
import '../../Style/CourseManagement.css';

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const [freshers, setFreshers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedFresher, setSelectedFresher] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [assignmentMode, setAssignmentMode] = useState('individual'); // 'individual' or 'department'
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [loading, setLoading] = useState(true);
    const [courseForm, setCourseForm] = useState({
        title: '',
        description: '',
        instructor: '',
        duration: '',
        level: 'Beginner',
        category: '',
        modules: []
    });
    const [moduleForm, setModuleForm] = useState({
        title: '',
        description: '',
        lessons: []
    });
    const [lessonForm, setLessonForm] = useState({
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
        resources: []
    });

    // Fetch all freshers and departments
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [freshersData, departmentsData] = await Promise.all([
                    courseService.getAllFreshers(),
                    courseService.getAllDepartments()
                ]);
                setFreshers(freshersData);
                setDepartments(departmentsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Fetch courses for selected fresher or department
    useEffect(() => {
        if (!selectedFresher && !selectedDepartment) {
            setCourses([]);
            setLoading(false);
            return;
        }

        if (assignmentMode === 'individual' && selectedFresher) {
            const unsubscribe = onSnapshot(
                collection(db, 'users', selectedFresher, 'courses'),
                (snapshot) => {
                    const coursesList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setCourses(coursesList);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching courses:', error);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } else if (assignmentMode === 'department' && selectedDepartment) {
            // For department view, we'll show courses from all freshers in the department
            const fetchDepartmentCourses = async () => {
                try {
                    const departmentFreshers = await courseService.getFreshersByDepartment(selectedDepartment);
                    const allCourses = [];
                    
                    for (const fresher of departmentFreshers) {
                        const fresherCourses = await courseService.getCoursesForFresher(fresher.id);
                        allCourses.push(...fresherCourses.map(course => ({
                            ...course,
                            fresherName: fresher.name || fresher.email,
                            fresherId: fresher.id
                        })));
                    }
                    
                    setCourses(allCourses);
                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching department courses:', error);
                    setLoading(false);
                }
            };
            
            fetchDepartmentCourses();
        }
    }, [selectedFresher, selectedDepartment, assignmentMode]);

    const handleAddCourse = async () => {
        try {
            if (assignmentMode === 'individual' && !selectedFresher) {
                alert('Please select a fresher first');
                return;
            }

            if (assignmentMode === 'department' && !selectedDepartment) {
                alert('Please select a department first');
                return;
            }

            const courseData = {
                ...courseForm,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'active',
                progress: 0,
                enrolledAt: new Date()
            };

            if (assignmentMode === 'individual') {
                await courseService.addCourseForFresher(selectedFresher, courseData);
            } else {
                await courseService.bulkAddCoursesToDepartment(selectedDepartment, courseData);
            }
            
            setCourseForm({
                title: '',
                description: '',
                instructor: '',
                duration: '',
                level: 'Beginner',
                category: '',
                modules: []
            });
            setShowAddCourse(false);
            alert(assignmentMode === 'individual' ? 'Course added successfully!' : 'Course assigned to department successfully!');
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Failed to add course');
        }
    };

    const handleAddModule = () => {
        if (!moduleForm.title.trim()) {
            alert('Please enter module title');
            return;
        }

        const newModule = {
            id: Date.now(),
            ...moduleForm,
            lessons: moduleForm.lessons || []
        };

        setCourseForm(prev => ({
            ...prev,
            modules: [...prev.modules, newModule]
        }));

        setModuleForm({
            title: '',
            description: '',
            lessons: []
        });
    };

    const handleAddLesson = () => {
        if (!lessonForm.title.trim()) {
            alert('Please enter lesson title');
            return;
        }

        const newLesson = {
            id: Date.now(),
            ...lessonForm,
            completed: false,
            progress: 0
        };

        setModuleForm(prev => ({
            ...prev,
            lessons: [...(prev.lessons || []), newLesson]
        }));

        setLessonForm({
            title: '',
            description: '',
            duration: '',
            videoUrl: '',
            resources: []
        });
    };

    const handleDeleteCourse = async (courseId, fresherId = selectedFresher) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                if (assignmentMode === 'individual') {
                    await courseService.deleteCourse(fresherId, courseId);
                } else {
                    // For department mode, we need to delete from all freshers in the department
                    const departmentFreshers = await courseService.getFreshersByDepartment(selectedDepartment);
                    for (const fresher of departmentFreshers) {
                        try {
                            await courseService.deleteCourse(fresher.id, courseId);
                        } catch (error) {
                            console.error(`Error deleting course from fresher ${fresher.id}:`, error);
                        }
                    }
                }
                alert('Course deleted successfully!');
            } catch (error) {
                console.error('Error deleting course:', error);
                alert('Failed to delete course');
            }
        }
    };

    const handleUpdateCourseStatus = async (courseId, status, fresherId = selectedFresher) => {
        try {
            if (assignmentMode === 'individual') {
                await courseService.updateCourseStatus(fresherId, courseId, status);
            } else {
                // For department mode, update status for all freshers in the department
                const departmentFreshers = await courseService.getFreshersByDepartment(selectedDepartment);
                for (const fresher of departmentFreshers) {
                    try {
                        await courseService.updateCourseStatus(fresher.id, courseId, status);
                    } catch (error) {
                        console.error(`Error updating course status for fresher ${fresher.id}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating course status:', error);
            alert('Failed to update course status');
        }
    };

    const handleModeChange = (mode) => {
        setAssignmentMode(mode);
        setSelectedFresher('');
        setSelectedDepartment('');
        setCourses([]);
    };

    return (
        <div className="course-management">
            <div className="course-management-header">
                <h2>Course Management</h2>
                <div className="assignment-mode-selector">
                    <label>Assignment Mode:</label>
                    <div className="mode-buttons">
                        <button 
                            className={`mode-btn ${assignmentMode === 'individual' ? 'active' : ''}`}
                            onClick={() => handleModeChange('individual')}
                        >
                            Individual Fresher
                        </button>
                        <button 
                            className={`mode-btn ${assignmentMode === 'department' ? 'active' : ''}`}
                            onClick={() => handleModeChange('department')}
                        >
                            Department Group
                        </button>
                    </div>
                </div>
            </div>

            <div className="selector-section">
                {assignmentMode === 'individual' ? (
                    <div className="fresher-selector">
                        <label>Select Fresher:</label>
                        <select 
                            value={selectedFresher} 
                            onChange={(e) => setSelectedFresher(e.target.value)}
                        >
                            <option value="">Choose a fresher...</option>
                            {freshers.map(fresher => (
                                <option key={fresher.id} value={fresher.id}>
                                    {fresher.name || fresher.email}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="department-selector">
                        <label>Select Department:</label>
                        <select 
                            value={selectedDepartment} 
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            <option value="">Choose a department...</option>
                            {departments.map(department => (
                                <option key={department.id} value={department.id}>
                                    {department.name} ({department.memberCount || 0} members)
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {(selectedFresher || selectedDepartment) && (
                <div className="course-actions">
                    <button 
                        className="add-course-btn"
                        onClick={() => setShowAddCourse(true)}
                    >
                        + Add New Course
                    </button>
                </div>
            )}

            {loading ? (
                <div className="loading">Loading courses...</div>
            ) : (
                <div className="courses-list">
                    {courses.length === 0 ? (
                        <div className="no-courses">
                            {selectedFresher || selectedDepartment ? 'No courses found.' : `Please select a ${assignmentMode === 'individual' ? 'fresher' : 'department'} to view courses.`}
                        </div>
                    ) : (
                        courses.map(course => (
                            <div key={course.id} className="course-item">
                                <div className="course-header">
                                    <h3>{course.title}</h3>
                                    {assignmentMode === 'department' && course.fresherName && (
                                        <span className="fresher-name">Assigned to: {course.fresherName}</span>
                                    )}
                                    <div className="course-actions">
                                        <select 
                                            value={course.status || 'active'}
                                            onChange={(e) => handleUpdateCourseStatus(course.id, e.target.value, course.fresherId)}
                                        >
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                        <button 
                                            className="delete-btn"
                                            onClick={() => handleDeleteCourse(course.id, course.fresherId)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="course-details">
                                    <p><strong>Instructor:</strong> {course.instructor}</p>
                                    <p><strong>Duration:</strong> {course.duration}</p>
                                    <p><strong>Level:</strong> {course.level}</p>
                                    <p><strong>Category:</strong> {course.category}</p>
                                    <p><strong>Modules:</strong> {course.modules?.length || 0}</p>
                                    <p><strong>Progress:</strong> {course.progress || 0}%</p>
                                </div>
                                {course.modules && course.modules.length > 0 && (
                                    <div className="course-modules">
                                        <h4>Modules:</h4>
                                        {course.modules.map((module, index) => (
                                            <div key={module.id || index} className="module-item">
                                                <h5>{module.title}</h5>
                                                <p>{module.description}</p>
                                                {module.lessons && module.lessons.length > 0 && (
                                                    <div className="lessons-list">
                                                        {module.lessons.map((lesson, lessonIndex) => (
                                                            <div key={lesson.id || lessonIndex} className="lesson-item">
                                                                <span>{lesson.title}</span>
                                                                <span>{lesson.duration}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add Course Modal */}
            {showAddCourse && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Course</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddCourse(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="assignment-info">
                                <p><strong>Assignment Mode:</strong> {assignmentMode === 'individual' ? 'Individual Fresher' : 'Department Group'}</p>
                                <p><strong>Target:</strong> {assignmentMode === 'individual' ? 
                                    freshers.find(f => f.id === selectedFresher)?.name || freshers.find(f => f.id === selectedFresher)?.email : 
                                    departments.find(d => d.id === selectedDepartment)?.name
                                }</p>
                            </div>

                            <div className="form-group">
                                <label>Course Title:</label>
                                <input
                                    type="text"
                                    value={courseForm.title}
                                    onChange={(e) => setCourseForm(prev => ({...prev, title: e.target.value}))}
                                    placeholder="Enter course title"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description:</label>
                                <textarea
                                    value={courseForm.description}
                                    onChange={(e) => setCourseForm(prev => ({...prev, description: e.target.value}))}
                                    placeholder="Enter course description"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Instructor:</label>
                                    <input
                                        type="text"
                                        value={courseForm.instructor}
                                        onChange={(e) => setCourseForm(prev => ({...prev, instructor: e.target.value}))}
                                        placeholder="Enter instructor name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Duration:</label>
                                    <input
                                        type="text"
                                        value={courseForm.duration}
                                        onChange={(e) => setCourseForm(prev => ({...prev, duration: e.target.value}))}
                                        placeholder="e.g., 10 hours"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Level:</label>
                                    <select
                                        value={courseForm.level}
                                        onChange={(e) => setCourseForm(prev => ({...prev, level: e.target.value}))}
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Category:</label>
                                    <input
                                        type="text"
                                        value={courseForm.category}
                                        onChange={(e) => setCourseForm(prev => ({...prev, category: e.target.value}))}
                                        placeholder="e.g., Web Development"
                                    />
                                </div>
                            </div>

                            {/* Module Management */}
                            <div className="modules-section">
                                <h4>Course Modules</h4>
                                {courseForm.modules.map((module, index) => (
                                    <div key={module.id} className="module-display">
                                        <h5>{module.title}</h5>
                                        <p>{module.description}</p>
                                        {module.lessons && module.lessons.length > 0 && (
                                            <div className="lessons-display">
                                                {module.lessons.map((lesson, lessonIndex) => (
                                                    <div key={lesson.id} className="lesson-display">
                                                        <span>{lesson.title}</span>
                                                        <span>{lesson.duration}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add Module Form */}
                                <div className="add-module-form">
                                    <h5>Add Module</h5>
                                    <div className="form-group">
                                        <label>Module Title:</label>
                                        <input
                                            type="text"
                                            value={moduleForm.title}
                                            onChange={(e) => setModuleForm(prev => ({...prev, title: e.target.value}))}
                                            placeholder="Enter module title"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Module Description:</label>
                                        <textarea
                                            value={moduleForm.description}
                                            onChange={(e) => setModuleForm(prev => ({...prev, description: e.target.value}))}
                                            placeholder="Enter module description"
                                        />
                                    </div>

                                    {/* Add Lesson Form */}
                                    <div className="add-lesson-form">
                                        <h6>Add Lesson</h6>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Lesson Title:</label>
                                                <input
                                                    type="text"
                                                    value={lessonForm.title}
                                                    onChange={(e) => setLessonForm(prev => ({...prev, title: e.target.value}))}
                                                    placeholder="Enter lesson title"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Duration:</label>
                                                <input
                                                    type="text"
                                                    value={lessonForm.duration}
                                                    onChange={(e) => setLessonForm(prev => ({...prev, duration: e.target.value}))}
                                                    placeholder="e.g., 45 min"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Video URL:</label>
                                            <input
                                                type="url"
                                                value={lessonForm.videoUrl}
                                                onChange={(e) => setLessonForm(prev => ({...prev, videoUrl: e.target.value}))}
                                                placeholder="Enter video URL"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            className="add-lesson-btn"
                                            onClick={handleAddLesson}
                                        >
                                            Add Lesson
                                        </button>
                                    </div>

                                    <button 
                                        type="button"
                                        className="add-module-btn"
                                        onClick={handleAddModule}
                                    >
                                        Add Module
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowAddCourse(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="save-btn"
                                onClick={handleAddCourse}
                            >
                                {assignmentMode === 'individual' ? 'Save Course' : 'Assign to Department'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement; 