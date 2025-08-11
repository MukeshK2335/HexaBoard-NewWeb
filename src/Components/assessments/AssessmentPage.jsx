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
    const [geminiFeedback, setGeminiFeedback] = useState("");
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [assessmentSummary, setAssessmentSummary] = useState(null);
    const [showSummary, setShowSummary] = useState(false);

    useEffect(() => {
        console.log("Starting to fetch assessment and generate questions");
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

                    // Get course title from assessment data or fetch it if missing
                    let courseTitle = assessmentData.courseTitle;
                    
                    // If courseTitle is missing in the assessment data, fetch it from courses collection
                    if (!courseTitle) {
                        const courseDocRef = doc(db, 'courses', courseId);
                        const courseDocSnap = await getDoc(courseDocRef);
                        
                        if (courseDocSnap.exists()) {
                            courseTitle = courseDocSnap.data().title;
                            // Update the assessment document with the course title
                            await updateDoc(assessmentDocRef, { courseTitle: courseTitle });
                        } else {
                            courseTitle = "Unknown Course";
                        }
                    }

                    console.log("Course Title for Gemini Prompt:", courseTitle); // Added for debugging

                    // Generate questions using Gemini API with retry mechanism
                    const genAI = new GoogleGenerativeAI("AIzaSyCkUv7HTH3t_JMcatllJLSYZYulExNXvnM");
                    const models = [
                        { name: "gemini-1.5-flash", retries: 2 },
                        { name: "gemini-1.5-pro", retries: 1 },
                        { name: "gemini-pro", retries: 1 }
                    ];
                    
                    console.log("Using courseTitle for question generation:", courseTitle);
                    
                    const prompt = `Generate 15 multiple-choice questions difficult level is medium and hard specifically and strictly about "${courseTitle}". Ensure all questions are directly related to this topic and avoid general knowledge. Each question should have 4 options (A, B, C, D) and indicate the correct answer. The output MUST be a JSON array of objects, and nothing else. Example: [{"question": "What is X?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`;
                    
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
                    console.log("Generated questions:", generatedQuestions);
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
        console.log(`User selected option ${optionIndex} for question ${questionIndex}`);
        console.log(`Selected text: "${questions[questionIndex].options[optionIndex]}", Correct answer: "${questions[questionIndex].correctAnswer}"`);
        
        setUserAnswers(prev => {
            const newAnswers = {
                ...prev,
                [questionIndex]: optionIndex
            };
            console.log("Updated user answers:", newAnswers);
            return newAnswers;
        });
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
            // Ensure we show the summary modal after the success animation
            setShowSummary(true);
        }, 3000); // Hide after 3 seconds

        // Prepare data for Gemini feedback
        const assessmentDetails = {
            title: assessment.title,
            instructions: assessment.instructions,
            totalQuestions: questions.length,
        };

        const questionData = questions.map((q, index) => {
            // Get the text of the user's selected answer
            const userAnswerText = userAnswers[index] !== undefined ? q.options[userAnswers[index]] : 'Not Answered';
            
            // Extract just the letter from the correct answer if it contains more than just the letter
            let correctAnswer = q.correctAnswer.trim();
            // If correctAnswer is just a single letter like "A", "B", etc.
            const letterOnly = correctAnswer.match(/^[A-D]$/i);
            
            // Find the index of the correct answer in the options array
            let correctAnswerIndex = -1;
            
            // First try to find by exact match
            for (let i = 0; i < q.options.length; i++) {
                if (q.options[i].trim() === correctAnswer) {
                    correctAnswerIndex = i;
                    break;
                }
            }
            
            // If not found and correctAnswer is just a letter, try to find by index
            if (correctAnswerIndex === -1 && letterOnly) {
                // Convert letter to index (A=0, B=1, C=2, D=3)
                correctAnswerIndex = correctAnswer.toUpperCase().charCodeAt(0) - 65;
            }
            
            // Check if the user's selected index matches the correct answer index
            const isCorrect = userAnswers[index] !== undefined && correctAnswerIndex !== -1 && 
                userAnswers[index] === correctAnswerIndex;
            
            console.log(`Question ${index}: User selected "${userAnswerText}" (index ${userAnswers[index]}), Correct answer: "${correctAnswer}" (index ${correctAnswerIndex}), isCorrect: ${isCorrect}`);
            
            return {
                question: q.question,
                options: q.options,
                correctAnswer: correctAnswer,
                correctAnswerIndex: correctAnswerIndex,
                userAnswer: userAnswerText,
                userAnswerIndex: userAnswers[index],
                isCorrect: isCorrect,
            };
        });

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

        // Calculate the score by counting correct answers
        let score = 0;
        console.log("Calculating final score from questionData:", questionData);
        console.log("Total questions:", questions.length);
        
        // Debug: Log the raw questions and user answers
        console.log("Raw questions:", questions);
        console.log("Raw user answers:", userAnswers);
        
        questionData.forEach((item, index) => {
            // Log detailed information about each question and answer
            console.log(`Question ${index}: isCorrect=${item.isCorrect}`);
            console.log(`  - User answer: "${item.userAnswer}" (${typeof item.userAnswer})`);
            console.log(`  - Correct answer: "${item.correctAnswer}" (${typeof item.correctAnswer})`);
            console.log(`  - Comparison: "${item.userAnswer.trim()}" === "${item.correctAnswer.trim()}" = ${item.userAnswer.trim() === item.correctAnswer.trim()}`);
            
            if (item.isCorrect) {
                score++;
                console.log(`  - Correct! Score is now ${score}`);
            } else {
                console.log(`  - Incorrect. Score remains ${score}`);
            }
        });

        const totalQuestions = questions.length;
        const percentageScore = (score / totalQuestions) * 100;

        // Store the score in Firestore
        if (auth.currentUser) {
            try {
                // Increment the submissions count in the submissions collection
                const submissionsRef = collection(db, "submissions");
                await addDoc(submissionsRef, {
                    userId: auth.currentUser.uid,
                    assessmentId: assessmentId,
                    courseId: assessment.courseId,
                    timestamp: serverTimestamp()
                });

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
                    
                    // Check if score is above 65% to generate certificate
                    if (percentageScore > 65) {
                        // Add certificate to user's certifications collection
                        const certificationsRef = collection(db, "users", auth.currentUser.uid, "certifications");
                        await addDoc(certificationsRef, {
                            title: `${assessment.courseTitle} Certificate`,
                            courseId: assessment.courseId,
                            courseTitle: assessment.courseTitle,
                            score: percentageScore.toFixed(2),
                            date: serverTimestamp(),
                            assessmentId: assessmentId
                        });
                        console.log("Certificate generated and added to Firestore!");
                    }
                } else {
                    // Check if there's already an assignment for this course
                    const courseAssignmentQuery = query(assignmentsRef, where("courseId", "==", assessment.courseId));
                    const courseAssignmentSnapshot = await getDocs(courseAssignmentQuery);
                    
                    if (!courseAssignmentSnapshot.empty) {
                        // Update the existing assignment instead of creating a new one
                        const existingAssignment = courseAssignmentSnapshot.docs[0];
                        await updateDoc(doc(db, "users", auth.currentUser.uid, "assignments", existingAssignment.id), {
                            assessmentId: assessmentId,
                            marks: percentageScore.toFixed(2),
                            completedAt: serverTimestamp(),
                            status: "Completed",
                        });
                        console.log("Existing assignment updated with assessment score!");
                        
                        // Check if score is above 65% to generate certificate
                        if (percentageScore > 65) {
                            // Add certificate to user's certifications collection
                            const certificationsRef = collection(db, "users", auth.currentUser.uid, "certifications");
                            await addDoc(certificationsRef, {
                                title: `${assessment.courseTitle} Certificate`,
                                courseId: assessment.courseId,
                                courseTitle: assessment.courseTitle,
                                score: percentageScore.toFixed(2),
                                date: serverTimestamp(),
                                assessmentId: assessmentId
                            });
                            console.log("Certificate generated and added to Firestore!");
                        }
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
                        
                        // Check if score is above 65% to generate certificate
                        if (percentageScore > 65) {
                            // Add certificate to user's certifications collection
                            const certificationsRef = collection(db, "users", auth.currentUser.uid, "certifications");
                            await addDoc(certificationsRef, {
                                title: `${assessment.courseTitle} Certificate`,
                                courseId: assessment.courseId,
                                courseTitle: assessment.courseTitle,
                                score: percentageScore.toFixed(2),
                                date: serverTimestamp(),
                                assessmentId: assessmentId
                            });
                            console.log("Certificate generated and added to Firestore!");
                        }
                    }
                }
            } catch (e) {
                console.error("Error saving/updating assessment score: ", e);
                alert("Failed to save/update assessment score.");
            }
        } else {
            alert("No user logged in. Cannot save score.");
        }

        // Set assessment summary information
        const correctAnswers = score;
        const wrongAnswers = totalQuestions - score;
        
        // Initialize with a fallback feedback message
        let feedbackText = `Congratulations on completing the assessment for "${assessment.title}"!

You scored ${percentageScore.toFixed(2)}% (${score} out of ${totalQuestions} questions correct).

Keep practicing and reviewing the course materials to improve your understanding of the subject matter. Focus on the areas where you made mistakes and consider revisiting those sections of the course.

Great job on taking this step in your learning journey!`;
        
        // Store assessment summary for display
        setAssessmentSummary({
            percentageScore: percentageScore.toFixed(2),
            correctAnswers,
            wrongAnswers,
            totalQuestions,
            certificateEarned: percentageScore > 65
        });
        
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
            // We've already set showSummary to true after the success animation
            // This ensures the results are shown immediately after clicking finish
        } catch (err) {
            console.error("Error in feedback generation process:", err);
            setGeminiFeedback(feedbackText); // Use the fallback feedback
            // Make sure we show the summary even if there's an error with feedback generation
            setShowSummary(true);
        } finally {
            // Don't navigate immediately - we'll navigate after the user views the feedback
            // The navigation will happen when the user closes the feedback modal
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

            {showSummary && (
                <div className="feedback-modal-overlay">
                    <div className="feedback-modal-content">
                        <h3>Assessment Results</h3>
                        <div className="assessment-summary">
                            <p className="summary-score">Your Score: <span className="highlight">{assessmentSummary.percentageScore}%</span></p>
                            <div className="summary-details">
                                <p className="correct-answers">Correct Answers: <span className="highlight">{assessmentSummary.correctAnswers}</span></p>
                                <p className="wrong-answers">Wrong Answers: <span className="highlight">{assessmentSummary.wrongAnswers}</span></p>
                                <p className="total-questions">Total Questions: <span className="highlight">{assessmentSummary.totalQuestions}</span></p>
                            </div>
                            {assessmentSummary.certificateEarned && (
                                <div className="certificate-earned">
                                    <p>🏆 Congratulations! You've earned a certificate for this assessment!</p>
                                    <p>View it in your dashboard under Certifications.</p>
                                </div>
                            )}
                        </div>
                        <div className="summary-actions">
                            <button onClick={() => {
                                setShowSummary(false);
                                setShowFeedbackModal(true);
                            }} className="view-feedback-btn">View Detailed Feedback</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showFeedbackModal && (
                <div className="feedback-modal-overlay">
                    <div className="feedback-modal-content">
                        <h3>Hexabot Feedback</h3>
                        <p>{geminiFeedback}</p>
                        <button onClick={() => {
                            setShowFeedbackModal(false);
                            // Navigate back to dashboard after feedback is closed
                            // This ensures the dashboard can re-fetch updated assignment status
                            navigate('/fresher', { state: { activeTab: 'assignments', refreshAssignments: true, geminiFeedback: geminiFeedback } });
                        }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentPage;