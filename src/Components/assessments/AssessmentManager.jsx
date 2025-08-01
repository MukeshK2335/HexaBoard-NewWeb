import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    query,
    where 
} from 'firebase/firestore';
import { FileText, Plus, Edit, Trash2, Clock, CheckCircle } from 'lucide-react';
import '../../Style/AssessmentManager.css';

const AssessmentManager = () => {
    const [assessments, setAssessments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAssessment, setEditingAssessment] = useState(null);
    const [newAssessment, setNewAssessment] = useState({
        title: '',
        courseId: '',
        type: 'Quiz',
        duration: 30,
        passingScore: 70,
        questions: [],
        instructions: '',
        isActive: true
    });
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1
    });

    useEffect(() => {
        fetchAssessments();
        fetchCourses();
    }, []);

    const fetchAssessments = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'assessments'));
            const assessmentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAssessments(assessmentsData);
        } catch (error) {
            console.error('Error fetching assessments:', error);
        }
    };

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

    const addQuestion = () => {
        if (!newQuestion.question.trim()) {
            alert('Please enter a question');
            return;
        }

        setNewAssessment({
            ...newAssessment,
            questions: [...newAssessment.questions, { ...newQuestion, id: Date.now() }]
        });

        setNewQuestion({
            question: '',
            type: 'multiple-choice',
            options: ['', '', '', ''],
            correctAnswer: 0,
            points: 1
        });
    };

    const removeQuestion = (questionId) => {
        setNewAssessment({
            ...newAssessment,
            questions: newAssessment.questions.filter(q => q.id !== questionId)
        });
    };

    const handleAddAssessment = async () => {
        if (!newAssessment.title || !newAssessment.courseId || newAssessment.questions.length === 0) {
            alert('Please fill in all required fields and add at least one question');
            return;
        }

        try {
            await addDoc(collection(db, 'assessments'), {
                ...newAssessment,
                createdAt: serverTimestamp(),
                totalQuestions: newAssessment.questions.length,
                totalPoints: newAssessment.questions.reduce((sum, q) => sum + q.points, 0)
            });
            
            resetForm();
            fetchAssessments();
        } catch (error) {
            console.error('Error adding assessment:', error);
        }
    };

    const handleDeleteAssessment = async (assessmentId) => {
        if (window.confirm('Are you sure you want to delete this assessment?')) {
            try {
                await deleteDoc(doc(db, 'assessments', assessmentId));
                fetchAssessments();
            } catch (error) {
                console.error('Error deleting assessment:', error);
            }
        }
    };

    const resetForm = () => {
        setNewAssessment({
            title: '',
            courseId: '',
            type: 'Quiz',
            duration: 30,
            passingScore: 70,
            questions: [],
            instructions: '',
            isActive: true
        });
        setShowAddForm(false);
        setEditingAssessment(null);
    };

    const getCourseTitle = (courseId) => {
        const course = courses.find(c => c.id === courseId);
        return course ? course.title : 'Unknown Course';
    };

    return (
        <div className="assessment-manager">
            <div className="assessment-header">
                <h2><FileText size={24} /> Assessment Management</h2>
                <button 
                    className="add-assessment-btn"
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus size={18} /> Create Assessment
                </button>
            </div>

            {showAddForm && (
                <div className="assessment-form-modal">
                    <div className="assessment-form">
                        <h3>{editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}</h3>
                        
                        <div className="form-grid">
                            <input
                                type="text"
                                placeholder="Assessment Title *"
                                value={newAssessment.title}
                                onChange={(e) => setNewAssessment({...newAssessment, title: e.target.value})}
                            />
                            
                            <select
                                value={newAssessment.courseId}
                                onChange={(e) => setNewAssessment({...newAssessment, courseId: e.target.value})}
                            >
                                <option value="">Select Course *</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={newAssessment.type}
                                onChange={(e) => setNewAssessment({...newAssessment, type: e.target.value})}
                            >
                                <option value="Quiz">Quiz</option>
                                <option value="Test">Test</option>
                                <option value="Final Exam">Final Exam</option>
                                <option value="Assignment">Assignment</option>
                            </select>

                            <input
                                type="number"
                                placeholder="Duration (minutes)"
                                value={newAssessment.duration}
                                onChange={(e) => setNewAssessment({...newAssessment, duration: parseInt(e.target.value)})}
                            />

                            <input
                                type="number"
                                placeholder="Passing Score (%)"
                                value={newAssessment.passingScore}
                                onChange={(e) => setNewAssessment({...newAssessment, passingScore: parseInt(e.target.value)})}
                                min="0"
                                max="100"
                            />
                        </div>

                        <textarea
                            placeholder="Instructions for students"
                            value={newAssessment.instructions}
                            onChange={(e) => setNewAssessment({...newAssessment, instructions: e.target.value})}
                            rows="3"
                        />

                        <div className="questions-section">
                            <h4>Questions ({newAssessment.questions.length})</h4>
                            
                            <div className="add-question-form">
                                <input
                                    type="text"
                                    placeholder="Enter question"
                                    value={newQuestion.question}
                                    onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                                />
                                
                                <div className="question-options">
                                    {newQuestion.options.map((option, index) => (
                                        <div key={index} className="option-input">
                                            <input
                                                type="text"
                                                placeholder={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...newQuestion.options];
                                                    newOptions[index] = e.target.value;
                                                    setNewQuestion({...newQuestion, options: newOptions});
                                                }}
                                            />
                                            <input
                                                type="radio"
                                                name="correctAnswer"
                                                checked={newQuestion.correctAnswer === index}
                                                onChange={() => setNewQuestion({...newQuestion, correctAnswer: index})}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="question-meta">
                                    <input
                                        type="number"
                                        placeholder="Points"
                                        value={newQuestion.points}
                                        onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})}
                                        min="1"
                                    />
                                    <button type="button" onClick={addQuestion}>Add Question</button>
                                </div>
                            </div>

                            <div className="questions-list">
                                {newAssessment.questions.map((question, index) => (
                                    <div key={question.id} className="question-item">
                                        <div className="question-header">
                                            <span>Q{index + 1}: {question.question}</span>
                                            <button 
                                                className="remove-question"
                                                onClick={() => removeQuestion(question.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="question-options-display">
                                            {question.options.map((option, optIndex) => (
                                                <span 
                                                    key={optIndex} 
                                                    className={optIndex === question.correctAnswer ? 'correct-option' : ''}
                                                >
                                                    {option}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button 
                                className="save-btn"
                                onClick={handleAddAssessment}
                            >
                                Create Assessment
                            </button>
                            <button 
                                className="cancel-btn"
                                onClick={resetForm}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="assessments-grid">
                {assessments.map(assessment => (
                    <div key={assessment.id} className="assessment-card">
                        <div className="assessment-header-info">
                            <h3>{assessment.title}</h3>
                            <div className="assessment-badges">
                                <span className={`type-badge ${assessment.type.toLowerCase().replace(' ', '-')}`}>
                                    {assessment.type}
                                </span>
                                <span className={`status-badge ${assessment.isActive ? 'active' : 'inactive'}`}>
                                    {assessment.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        
                        <p className="course-name">{getCourseTitle(assessment.courseId)}</p>
                        
                        <div className="assessment-meta">
                            <div className="meta-item">
                                <Clock size={16} />
                                <span>{assessment.duration} minutes</span>
                            </div>
                            <div className="meta-item">
                                <FileText size={16} />
                                <span>{assessment.totalQuestions} questions</span>
                            </div>
                            <div className="meta-item">
                                <CheckCircle size={16} />
                                <span>{assessment.passingScore}% to pass</span>
                            </div>
                        </div>

                        <div className="assessment-actions">
                            <button className="edit-btn">
                                <Edit size={16} /> Edit
                            </button>
                            <button 
                                className="delete-btn"
                                onClick={() => handleDeleteAssessment(assessment.id)}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {assessments.length === 0 && (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>No assessments available</h3>
                    <p>Create your first assessment to evaluate student progress.</p>
                </div>
            )}
        </div>
    );
};

export default AssessmentManager;