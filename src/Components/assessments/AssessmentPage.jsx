import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { chatbotService } from '../../services/chatbotService';
import '../../Style/AssessmentManager.css'; // Reusing some styles





const AssessmentPage = () => {
    const { courseId } = useParams(); // Changed from assessmentId to courseId
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAssessmentAndGenerateQuestions = async () => {
            try {
                // Fetch assessment details based on courseId
                const assessmentsQuery = query(collection(db, 'assessments'), where("courseId", "==", courseId));
                const querySnapshot = await getDocs(assessmentsQuery);
                if (!querySnapshot.empty) {
                    const assessmentData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
                    setAssessment(assessmentData);
                    // Fetch course title for question generation
                    const courseDocRef = doc(db, 'courses', courseId);
                    const courseDocSnap = await getDoc(courseDocRef);
                    const courseTitle = courseDocSnap.exists() ? courseDocSnap.data().title : 'general knowledge';
                    // Generate questions using Gemini API
                    const prompt = `Generate 5 multiple-choice questions about "${courseTitle}". Each question should have 4 options (A, B, C, D) and indicate the correct answer. The output MUST be a JSON string, and nothing else. Example: [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`;
                    const geminiResponse = await chatbotService.getGeminiResponse(prompt);

                                        console.log("Type of Gemini response:", typeof geminiResponse);
                    console.log("Raw Gemini response:", geminiResponse);
                    let generatedQuestions = [];
                    try {
                        generatedQuestions = JSON.parse(geminiResponse);
                        if (!Array.isArray(generatedQuestions) || generatedQuestions.some(q => !q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correctAnswer)) {
                            throw new Error("Invalid question structure from Gemini API.");
                        }
                    } catch (parseError) {
                        console.error("Failed to parse Gemini response as JSON:", parseError);
                        console.log("Raw Gemini response (in catch):", geminiResponse);
                        setError("Failed to generate questions. Please try again. (Invalid API response format)");
                        setLoading(false);
                        return;
                    }
                    setQuestions(generatedQuestions);
                } else {
                    setError("Assessment not found for this course.");
                }
            } catch (err) {
                console.error("Error fetching assessment or generating questions:", err);
                setError("Failed to load assessment or generate questions. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchAssessmentAndGenerateQuestions();
    }, [courseId]); // Dependency changed to courseId

    const handleOptionSelect = (questionIndex, optionIndex) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmitAssessment = () => {
        // Implement assessment submission logic here
        alert("Assessment Submitted! (Check console for answers)");
        console.log("User Answers:", userAnswers);
        // You would typically calculate score, save to Firebase, and navigate to a results page
    };

    if (loading) {
        return <div className="assessment-page">Loading assessment...</div>;
    }

    if (error) {
        return <div className="assessment-page error">Error: {error}</div>;
    }

    if (!assessment || questions.length === 0) {
        return <div className="assessment-page">No questions generated for this assessment.</div>;
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="assessment-page">
            <h2>{assessment.title}</h2>
            <p className="assessment-instructions">{assessment.instructions}</p>

            <div className="question-container">
                <h3>Question {currentQuestionIndex + 1} of {questions.length}</h3>
                <p className="question-text">{currentQuestion.question}</p>
                <div className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <div key={index} className="option-item">
                            <input
                                type="radio"
                                id={`q${currentQuestionIndex}-option${index}`}
                                name={`question-${currentQuestionIndex}`}
                                value={index}
                                checked={userAnswers[currentQuestionIndex] === index}
                                onChange={() => handleOptionSelect(currentQuestionIndex, index)}
                            />
                            <label htmlFor={`q${currentQuestionIndex}-option${index}`}>{option}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="navigation-buttons">
                <button 
                    onClick={handlePreviousQuestion} 
                    disabled={currentQuestionIndex === 0}
                >
                    Previous
                </button>
                {currentQuestionIndex < questions.length - 1 ? (
                    <button onClick={handleNextQuestion}>Next</button>
                ) : (
                    <button onClick={handleSubmitAssessment}>Submit Assessment</button>
                )}
            </div>
        </div>
    );
};

export default AssessmentPage;