import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp 
} from 'firebase/firestore';
import { BookOpen, Plus, Edit, Trash2, Users } from 'lucide-react';
import '../../Style/CourseManagement.css';

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        duration: '',
        difficulty: 'Beginner',
        category: 'Technical',
        modules: [],
        prerequisites: '',
        objectives: ''
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'courses'));
            const coursesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCourses(coursesData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const handleAddCourse = async () => {
        if (!newCourse.title || !newCourse.description) {
            alert('Please fill in required fields');
            return;
        }

        try {
            await addDoc(collection(db, 'courses'), {
                ...newCourse,
                createdAt: serverTimestamp(),
                enrolledCount: 0,
                isActive: true
            });
            
            setNewCourse({
                title: '',
                description: '',
                duration: '',
                difficulty: 'Beginner',
                category: 'Technical',
                modules: [],
                prerequisites: '',
                objectives: ''
            });
            setShowAddForm(false);
            fetchCourses();
        } catch (error) {
            console.error('Error adding course:', error);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await deleteDoc(doc(db, 'courses', courseId));
                fetchCourses();
            } catch (error) {
                console.error('Error deleting course:', error);
            }
        }
    };

    const handleEditCourse = (course) => {
        setEditingCourse(course);
        setNewCourse(course);
        setShowAddForm(true);
    };

    const handleUpdateCourse = async () => {
        try {
            await updateDoc(doc(db, 'courses', editingCourse.id), newCourse);
            setEditingCourse(null);
            setShowAddForm(false);
            setNewCourse({
                title: '',
                description: '',
                duration: '',
                difficulty: 'Beginner',
                category: 'Technical',
                modules: [],
                prerequisites: '',
                objectives: ''
            });
            fetchCourses();
        } catch (error) {
            console.error('Error updating course:', error);
        }
    };

    return (
        <div className="course-management">
            <div className="course-header">
                <h2><BookOpen size={24} /> Course Management</h2>
                <button 
                    className="add-course-btn"
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus size={18} /> Add New Course
                </button>
            </div>

            {showAddForm && (
                <div className="course-form-modal">
                    <div className="course-form">
                        <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
                        
                        <div className="form-grid">
                            <input
                                type="text"
                                placeholder="Course Title *"
                                value={newCourse.title}
                                onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                            />
                            
                            <select
                                value={newCourse.category}
                                onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
                            >
                                <option value="Technical">Technical</option>
                                <option value="Soft Skills">Soft Skills</option>
                                <option value="Business">Business</option>
                                <option value="Compliance">Compliance</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Duration (e.g., 4 weeks)"
                                value={newCourse.duration}
                                onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                            />

                            <select
                                value={newCourse.difficulty}
                                onChange={(e) => setNewCourse({...newCourse, difficulty: e.target.value})}
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>

                        <textarea
                            placeholder="Course Description *"
                            value={newCourse.description}
                            onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                            rows="3"
                        />

                        <textarea
                            placeholder="Learning Objectives"
                            value={newCourse.objectives}
                            onChange={(e) => setNewCourse({...newCourse, objectives: e.target.value})}
                            rows="2"
                        />

                        <textarea
                            placeholder="Prerequisites"
                            value={newCourse.prerequisites}
                            onChange={(e) => setNewCourse({...newCourse, prerequisites: e.target.value})}
                            rows="2"
                        />

                        <div className="form-actions">
                            <button 
                                className="save-btn"
                                onClick={editingCourse ? handleUpdateCourse : handleAddCourse}
                            >
                                {editingCourse ? 'Update Course' : 'Create Course'}
                            </button>
                            <button 
                                className="cancel-btn"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingCourse(null);
                                    setNewCourse({
                                        title: '',
                                        description: '',
                                        duration: '',
                                        difficulty: 'Beginner',
                                        category: 'Technical',
                                        modules: [],
                                        prerequisites: '',
                                        objectives: ''
                                    });
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="courses-grid">
                {courses.map(course => (
                    <div key={course.id} className="course-card">
                        <div className="course-header-info">
                            <h3>{course.title}</h3>
                            <div className="course-badges">
                                <span className={`difficulty-badge ${course.difficulty.toLowerCase()}`}>
                                    {course.difficulty}
                                </span>
                                <span className="category-badge">{course.category}</span>
                            </div>
                        </div>
                        
                        <p className="course-description">{course.description}</p>
                        
                        <div className="course-meta">
                            <div className="meta-item">
                                <strong>Duration:</strong> {course.duration}
                            </div>
                            <div className="meta-item">
                                <Users size={16} />
                                <span>{course.enrolledCount || 0} enrolled</span>
                            </div>
                        </div>

                        <div className="course-actions">
                            <button 
                                className="edit-btn"
                                onClick={() => handleEditCourse(course)}
                            >
                                <Edit size={16} /> Edit
                            </button>
                            <button 
                                className="delete-btn"
                                onClick={() => handleDeleteCourse(course.id)}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {courses.length === 0 && (
                <div className="empty-state">
                    <BookOpen size={48} />
                    <h3>No courses available</h3>
                    <p>Create your first course to get started with the training program.</p>
                </div>
            )}
        </div>
    );
};

export default CourseManagement;