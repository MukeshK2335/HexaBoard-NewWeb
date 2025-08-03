import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
    collection,
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
    const [assignmentMode, setAssignmentMode] = useState('individual');
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [loading, setLoading] = useState(true);

    const initialCourseFormState = {
        title: '',
        description: '',
        instructor: '',
        duration: '',
        level: 'Beginner',
        category: '',
        thumbnail: null,
        lectures: []
    };
    const [courseForm, setCourseForm] = useState(initialCourseFormState);

    const initialLectureFormState = {
        title: '',
        description: '',
        video: null
    };
    const [lectureForm, setLectureForm] = useState(initialLectureFormState);

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

    useEffect(() => {
        if ((assignmentMode === 'individual' && !selectedFresher) || (assignmentMode === 'department' && !selectedDepartment)) {
            setCourses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        let unsubscribe;

        if (assignmentMode === 'individual') {
            unsubscribe = onSnapshot(
                collection(db, 'users', selectedFresher, 'courses'),
                (snapshot) => {
                    const coursesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCourses(coursesList);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error fetching courses:', error);
                    setLoading(false);
                }
            );
        } else {
            const fetchDepartmentCourses = async () => {
                try {
                    const departmentFreshers = await courseService.getFreshersByDepartment(selectedDepartment);
                    const allCourses = [];
                    for (const fresher of departmentFreshers) {
                        const fresherCourses = await courseService.getCoursesForFresher(fresher.id);
                        allCourses.push(...fresherCourses.map(course => ({ ...course, fresherName: fresher.name || fresher.email, fresherId: fresher.id })));
                    }
                    setCourses(allCourses);
                } catch (error) {
                    console.error('Error fetching department courses:', error);
                }
                setLoading(false);
            };
            fetchDepartmentCourses();
        }

        return () => unsubscribe && unsubscribe();
    }, [selectedFresher, selectedDepartment, assignmentMode]);

    const handleAddLecture = () => {
        if (!lectureForm.title.trim() || !lectureForm.video) {
            alert('Please provide a title and a video for the lecture.');
            return;
        }
        setCourseForm(prev => ({
            ...prev,
            lectures: [...prev.lectures, { ...lectureForm, id: Date.now() }]
        }));
        setLectureForm(initialLectureFormState);
    };

    const handleAddCourse = async () => {
        try {
            const assignment = {
                mode: assignmentMode,
                id: assignmentMode === 'individual' ? selectedFresher : selectedDepartment
            };

            if (!assignment.id) {
                alert(`Please select a ${assignmentMode} first`);
                return;
            }

            await courseService.addCourse(courseForm, assignment);

            setCourseForm(initialCourseFormState);
            setShowAddCourse(false);
            alert(assignmentMode === 'individual' ? 'Course added successfully!' : 'Course assigned to department successfully!');
        } catch (error) {
            console.error('Error adding course:', error);
            alert('Failed to add course');
        }
    };

    const handleDeleteCourse = async (courseId, fresherId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await courseService.deleteCourse(fresherId, courseId);
                alert('Course deleted successfully!');
            } catch (error) {
                console.error('Error deleting course:', error);
                alert('Failed to delete course');
            }
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
                        <button className={`mode-btn ${assignmentMode === 'individual' ? 'active' : ''}`} onClick={() => handleModeChange('individual')}>Individual Fresher</button>
                        <button className={`mode-btn ${assignmentMode === 'department' ? 'active' : ''}`} onClick={() => handleModeChange('department')}>Department Group</button>
                    </div>
                </div>
            </div>

            <div className="selector-section">
                {assignmentMode === 'individual' ? (
                    <div className="fresher-selector">
                        <label>Select Fresher:</label>
                        <select value={selectedFresher} onChange={(e) => setSelectedFresher(e.target.value)}>
                            <option value="">Choose a fresher...</option>
                            {freshers.map(fresher => <option key={fresher.id} value={fresher.id}>{fresher.name || fresher.email}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="department-selector">
                        <label>Select Department:</label>
                        <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                            <option value="">Choose a department...</option>
                            {departments.map(department => <option key={department.id} value={department.id}>{department.name} ({department.memberCount || 0} members)</option>)}
                        </select>
                    </div>
                )}
            </div>

            {(selectedFresher || selectedDepartment) && (
                <div className="course-actions">
                    <button className="add-course-btn" onClick={() => setShowAddCourse(true)}>+ Add New Course</button>
                </div>
            )}

            {loading ? <div className="loading">Loading courses...</div> : (
                <div className="courses-list">
                    {courses.length === 0 ? (
                        <div className="no-courses">{selectedFresher || selectedDepartment ? 'No courses found.' : `Please select a ${assignmentMode === 'individual' ? 'fresher' : 'department'} to view courses.`}</div>
                    ) : (
                        courses.map(course => (
                            <div key={course.id} className="course-item">
                                <div className="course-header">
                                    <h3>{course.title}</h3>
                                    {assignmentMode === 'department' && course.fresherName && <span className="fresher-name">Assigned to: {course.fresherName}</span>}
                                    <div className="course-actions">
                                        <button className="delete-btn" onClick={() => handleDeleteCourse(course.id, course.fresherId || selectedFresher)}>Delete</button>
                                    </div>
                                </div>
                                <div className="course-details">
                                    <p><strong>Instructor:</strong> {course.instructor}</p>
                                    <p><strong>Lectures:</strong> {course.lectures?.length || 0}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showAddCourse && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Course</h3>
                            <button className="close-btn" onClick={() => setShowAddCourse(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Course Title:</label>
                                <input type="text" value={courseForm.title} onChange={(e) => setCourseForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter course title" />
                            </div>
                            <div className="form-group">
                                <label>Description:</label>
                                <textarea value={courseForm.description} onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter course description" />
                            </div>
                            <div className="form-group">
                                <label>Course Thumbnail:</label>
                                <input type="file" onChange={(e) => setCourseForm(prev => ({ ...prev, thumbnail: e.target.files[0] }))} />
                            </div>
                            <div className="form-group">
                                <label>Instructor:</label>
                                <input type="text" value={courseForm.instructor} onChange={(e) => setCourseForm(prev => ({ ...prev, instructor: e.target.value }))} placeholder="Enter instructor name" />
                            </div>

                            <div className="lectures-section">
                                <h4>Course Lectures</h4>
                                <div className="lectures-display">
                                    {courseForm.lectures.map(lecture => (
                                        <div key={lecture.id} className="lecture-display">
                                            <span>{lecture.title}</span>
                                            <span className="lecture-video-name">{lecture.video.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="add-lecture-form">
                                    <h5>Add Lecture</h5>
                                    <div className="form-group">
                                        <label>Lecture Title:</label>
                                        <input type="text" value={lectureForm.title} onChange={(e) => setLectureForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter lecture title" />
                                    </div>
                                    <div className="form-group">
                                        <label>Lecture Description:</label>
                                        <textarea value={lectureForm.description} onChange={(e) => setLectureForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter lecture description" />
                                    </div>
                                    <div className="form-group">
                                        <label>Lecture Video:</label>
                                        <input key={lectureForm.video ? lectureForm.video.name : 'no-video'} type="file" onChange={(e) => setLectureForm(prev => ({ ...prev, video: e.target.files[0] }))} />
                                    </div>
                                    <button type="button" className="add-lecture-btn" onClick={handleAddLecture}>Add Lecture</button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowAddCourse(false)}>Cancel</button>
                            <button className="save-btn" onClick={handleAddCourse}>{assignmentMode === 'individual' ? 'Save Course' : 'Assign to Department'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;