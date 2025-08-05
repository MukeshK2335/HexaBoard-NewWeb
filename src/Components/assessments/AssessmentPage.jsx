import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { GoogleGenerativeAI } from "@google/generative-ai";
import '../../Style/AssessmentManager.css'; // Reusing some styles
import LoadingScreen from '../LoadingScreen.jsx';





const AssessmentPage = () => {
    const navigate = useNavigate();
        const { assessmentId } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false); // New state for success animation
    const [geminiFeedback, setGeminiFeedback] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    useEffect(() => {
        const fetchAssessmentAndGenerateQuestions = async () => {
            if (!assessmentId) {
                setError("Assessment ID is missing. Cannot load assessment.");
                setLoading(false);
                return;
            }
            try {
                // Fetch assessment details based on assessmentId
                const assessmentDocRef = doc(db, 'assessments', assessmentId);
                const assessmentDocSnap = await getDoc(assessmentDocRef);

                if (assessmentDocSnap.exists()) {
                    const assessmentData = { id: assessmentDocSnap.id, ...assessmentDocSnap.data() };
                    setAssessment(assessmentData);

                    const courseId = assessmentData.courseId; // Extract courseId from assessment data

                    console.log("Fetched assessment data:", assessmentData);
                    console.log("Extracted courseId:", courseId);

                    if (!courseId) {
                        setError("Course ID is missing in the assessment data. Cannot load assessment.");
                        setLoading(false);
                        return;
                    }

                    // Fetch course title for question generation
                    const courseDocRef = doc(db, 'courses', courseId);
                    const courseDocSnap = await getDoc(courseDocRef);
                    const courseTitle = assessmentData.courseTitle;

                    console.log("Course Title for Gemini Prompt:", courseTitle); // Added for debugging

                    // Generate questions using Gemini API
                    const genAI = new GoogleGenerativeAI("AIzaSyCkUv7HTH3t_JMcatllJLSYZYulExNXvnM");
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const prompt = `Generate 5 multiple-choice questions specifically and strictly about "${courseTitle}". Ensure all questions are directly related to this topic and avoid general knowledge. Each question should have 4 options (A, B, C, D) and indicate the correct answer. The output MUST be a JSON array of objects, and nothing else. Example: [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`;
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    let geminiResponse = response.text();

                    // Clean the response by removing markdown code block if present
                    const jsonMatch = geminiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch && jsonMatch[1]) {
                        geminiResponse = jsonMatch[1].trim();
                    } else {
                        geminiResponse = geminiResponse.trim();
                    }

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
                    setError("Assessment not found.");
                }
            } catch (err) {
                console.error("Error fetching assessment or generating questions:", err);
                setError("Failed to load assessment or generate questions. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchAssessmentAndGenerateQuestions();
    }, [assessmentId]); // Dependency changed to assessmentId

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

    const handleSubmitAssessment = async () => {
        setShowSuccessAnimation(true);
        setTimeout(() => {
            setShowSuccessAnimation(false);
        }, 3000); // Hide after 3 seconds

        // Prepare data for Gemini feedback
        const assessmentDetails = {
            title: assessment.title,
            instructions: assessment.instructions,
            totalQuestions: questions.length,
        };

        const questionData = questions.map((q, index) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            userAnswer: userAnswers[index] !== undefined ? q.options[userAnswers[index]] : 'Not Answered',
            isCorrect: userAnswers[index] !== undefined ? (q.options[userAnswers[index]] === q.correctAnswer) : false,
        }));

        let feedbackPrompt = `The user has completed an assessment titled "${assessmentDetails.title}" with the following questions and their answers:

`;
        questionData.forEach((item, index) => {
            feedbackPrompt += `Question ${index + 1}: ${item.question}
`;
            feedbackPrompt += `Options: ${item.options.join(', ')}
`;
            feedbackPrompt += `Correct Answer: ${item.correctAnswer}
`;
            feedbackPrompt += `User's Answer: ${item.userAnswer} (Correct: ${item.isCorrect})

`;
        });

        feedbackPrompt += `Based on the user's performance, provide constructive feedback focusing on areas for improvement. Suggest specific topics or concepts the user should review. The feedback should be concise and encouraging.`;

        let score = 0;
        questionData.forEach(item => {
            if (item.isCorrect) {
                score++;
            }
        });

        const totalQuestions = questions.length;
        const percentageScore = (score / totalQuestions) * 100;

        // Store the score in Firestore
        if (auth.currentUser) {
            try {
                const assignmentsRef = collection(db, "users", auth.currentUser.uid, "assignments");
                const q = query(assignmentsRef, where("assessmentId", "==", assessmentId), where("courseId", "==", assessment.courseId));
                console.log("Querying for existing assignment with:", { assessmentId, courseId: assessment.courseId });
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // Assignment exists, update it
                    const docToUpdate = querySnapshot.docs[0];
                    await updateDoc(doc(db, "users", auth.currentUser.uid, "assignments", docToUpdate.id), {
                        marks: percentageScore.toFixed(2),
                        completedAt: serverTimestamp(),
                        status: "Completed",
                    });
                    console.log("Assessment score updated in Firestore!");
                } else {
                    // Assignment does not exist, add a new one
                    await addDoc(assignmentsRef, {
                        assessmentId: assessmentId,
                        courseId: assessment.courseId,
                        courseTitle: assessment.courseTitle,
                        marks: percentageScore.toFixed(2), // Store as a percentage with 2 decimal places
                        completedAt: serverTimestamp(),
                        status: "Completed",
                    });
                    console.log("New assessment score saved to Firestore!");
                }
            } catch (e) {
                console.error("Error saving/updating assessment score: ", e);
                alert("Failed to save/update assessment score.");
            }
        } else {
            alert("No user logged in. Cannot save score.");
        }

        let feedbackText = "Failed to generate feedback. Please try again later."; // Initialize feedbackText
        try {
            const genAI = new GoogleGenerativeAI("AIzaSyCkUv7HTH3t_JMcatllJLSYZYulExNXvnM");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(feedbackPrompt);
            const response = await result.response;
            feedbackText = response.text(); // Assign to the already declared variable

            // Clean the response by removing markdown code block if present
            const jsonMatch = feedbackText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                feedbackText = jsonMatch[1].trim();
            } else {
                feedbackText = feedbackText.trim();
            }

            setGeminiFeedback(feedbackText);
            setShowFeedbackModal(true);
        } catch (err) {
            console.error("Error generating feedback from Gemini:", err);
            setGeminiFeedback(feedbackText); // Use the initialized/updated feedbackText
            setShowFeedbackModal(true);
        } finally {
            // Navigate back to dashboard after feedback is shown or error occurs
            // This ensures the dashboard can re-fetch updated assignment status
            navigate('/fresher', { state: { activeTab: 'assignments', refreshAssignments: true, geminiFeedback: feedbackText } });
        }
    };

    if (loading) {
        return <LoadingScreen message="Loading assessment..." />;
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
            {showSuccessAnimation && (
                <div className="assessment-success-message">
                    Assessment Submitted Successfully!
                </div>
            )}
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
                    className="navigation-button"
                >
                    Previous
                </button>
                {currentQuestionIndex < questions.length - 1 ? (
                    <button onClick={handleNextQuestion} className="navigation-button">Next</button>
                ) : (
                    <button onClick={handleSubmitAssessment} className="navigation-button finish-button">Finish</button>
                )}
            </div>

            {showFeedbackModal && (
                <div className="feedback-modal-overlay">
                    <div className="feedback-modal-content">
                        <h3>Gemini Feedback</h3>
                        <p>{geminiFeedback}</p>
                        <button onClick={() => setShowFeedbackModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentPage;