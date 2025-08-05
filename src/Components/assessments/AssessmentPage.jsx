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

                    // Generate questions using Gemini API with retry mechanism
                    const genAI = new GoogleGenerativeAI("AIzaSyCkUv7HTH3t_JMcatllJLSYZYulExNXvnM");
                    const models = [
                        { name: "gemini-1.5-flash", retries: 2 },
                        { name: "gemini-1.5-pro", retries: 1 },
                        { name: "gemini-pro", retries: 1 }
                    ];
                    
                    const prompt = `Generate 5 multiple-choice questions specifically and strictly about "${courseTitle}". Ensure all questions are directly related to this topic and avoid general knowledge. Each question should have 4 options (A, B, C, D) and indicate the correct answer. The output MUST be a JSON array of objects, and nothing else. Example: [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`;
                    
                    let generatedQuestions = [];
                    let success = false;
                    
                    // Try each model with retries
                    for (const modelConfig of models) {
                        if (success) break;
                        
                        const model = genAI.getGenerativeModel({ model: modelConfig.name });
                        console.log(`Attempting to use ${modelConfig.name} model...`);
                        
                        for (let attempt = 0; attempt <= modelConfig.retries; attempt++) {
                            if (success) break;
                            
                            try {
                                if (attempt > 0) {
                                    console.log(`Retry attempt ${attempt} with ${modelConfig.name}...`);
                                    // Add exponential backoff delay
                                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                                }
                                
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

                                console.log(`${modelConfig.name} response type:`, typeof geminiResponse);
                                
                                generatedQuestions = JSON.parse(geminiResponse);
                                if (Array.isArray(generatedQuestions) && 
                                    !generatedQuestions.some(q => !q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correctAnswer)) {
                                    success = true;
                                    console.log(`Successfully generated questions using ${modelConfig.name}`);
                                    break;
                                } else {
                                    throw new Error("Invalid question structure from Gemini API.");
                                }
                            } catch (error) {
                                console.error(`Error with ${modelConfig.name} (attempt ${attempt + 1}/${modelConfig.retries + 1}):`, error);
                                if (attempt === modelConfig.retries && modelConfig === models[models.length - 1]) {
                                    console.log("All models and retries failed, using fallback questions");
                                }
                            }
                        }
                    }
                    
                    // If all models fail, use fallback questions
                    if (!success) {
                        console.log("Using fallback questions for", courseTitle);
                        generatedQuestions = [
                            {
                                question: `What is the main focus of the course "${courseTitle}"?`,
                                options: ["Learning core concepts", "Practical application", "Historical background", "Advanced techniques"],
                                correctAnswer: "Learning core concepts"
                            },
                            {
                                question: `Which of the following best describes "${courseTitle}"?`,
                                options: ["Introductory course", "Advanced specialization", "Technical certification", "General knowledge"],
                                correctAnswer: "Introductory course"
                            },
                            {
                                question: `What skills would you likely develop in "${courseTitle}"?`,
                                options: ["Critical thinking", "Technical expertise", "Communication", "All of the above"],
                                correctAnswer: "All of the above"
                            },
                            {
                                question: `How would knowledge from "${courseTitle}" be applied in a professional setting?`,
                                options: ["Problem-solving", "Team collaboration", "Project management", "All of the above"],
                                correctAnswer: "All of the above"
                            },
                            {
                                question: `What is a potential career path after mastering "${courseTitle}"?`,
                                options: ["Specialist in the field", "Consultant", "Researcher", "Any of the above"],
                                correctAnswer: "Any of the above"
                            }
                        ];
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

        // Initialize with a fallback feedback message
        let feedbackText = `Congratulations on completing the assessment for "${assessment.title}"!

You scored ${percentageScore.toFixed(2)}% (${score} out of ${totalQuestions} questions correct).

Keep practicing and reviewing the course materials to improve your understanding of the subject matter. Focus on the areas where you made mistakes and consider revisiting those sections of the course.

Great job on taking this step in your learning journey!`;
        
        try {
            const genAI = new GoogleGenerativeAI("AIzaSyCkUv7HTH3t_JMcatllJLSYZYulExNXvnM");
            const models = [
                { name: "gemini-1.5-flash", retries: 2 },
                { name: "gemini-1.5-pro", retries: 1 },
                { name: "gemini-pro", retries: 1 }
            ];
            
            let success = false;
            
            // Try each model with retries
            for (const modelConfig of models) {
                if (success) break;
                
                const model = genAI.getGenerativeModel({ model: modelConfig.name });
                console.log(`Attempting to use ${modelConfig.name} model for feedback...`);
                
                for (let attempt = 0; attempt <= modelConfig.retries; attempt++) {
                    if (success) break;
                    
                    try {
                        if (attempt > 0) {
                            console.log(`Retry attempt ${attempt} with ${modelConfig.name} for feedback...`);
                            // Add exponential backoff delay
                            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                        }
                        
                        const result = await model.generateContent(feedbackPrompt);
                        const response = await result.response;
                        const responseText = response.text();

                        // Clean the response by removing markdown code block if present
                        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                        if (jsonMatch && jsonMatch[1]) {
                            feedbackText = jsonMatch[1].trim();
                        } else {
                            feedbackText = responseText.trim();
                        }

                        // If we got here without errors, mark as success
                        success = true;
                        console.log(`Successfully generated feedback using ${modelConfig.name}`);
                        break;
                    } catch (error) {
                        console.error(`Error with ${modelConfig.name} for feedback (attempt ${attempt + 1}/${modelConfig.retries + 1}):`, error);
                        if (attempt === modelConfig.retries && modelConfig === models[models.length - 1]) {
                            console.log("All models and retries failed for feedback, using fallback feedback");
                            // Fallback feedback is already set at the beginning
                        }
                    }
                }
            }
            
            setGeminiFeedback(feedbackText);
            setShowFeedbackModal(true);
        } catch (err) {
            console.error("Error in feedback generation process:", err);
            setGeminiFeedback(feedbackText); // Use the fallback feedback
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