import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, addDoc, serverTimestamp, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import '../../Style/DailyQuiz.css';
import LoadingScreen from '../LoadingScreen';

const DailyQuiz = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [streakCount, setStreakCount] = useState(0);
    const [lastQuizDate, setLastQuizDate] = useState(null);
    const [quizAvailable, setQuizAvailable] = useState(true);

    useEffect(() => {
        const checkQuizAvailability = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to take the daily quiz");
                setLoading(false);
                return;
            }

            try {
                // Check if user has already taken a quiz today
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const lastQuiz = userData.lastDailyQuiz ? userData.lastDailyQuiz.toDate() : null;
                    const streak = userData.quizStreak || 0;
                    
                    setStreakCount(streak);
                    setLastQuizDate(lastQuiz);
                    
                    if (lastQuiz) {
                        const today = new Date();
                        const lastQuizDay = new Date(lastQuiz.getFullYear(), lastQuiz.getMonth(), lastQuiz.getDate());
                        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        if (lastQuizDay.getTime() === todayDay.getTime()) {
                            setQuizAvailable(false);
                            setLoading(false);
                            return;
                        }
                    }
                }
                
                // Generate a new daily quiz
                await generateDailyQuiz();
            } catch (err) {
                console.error("Error checking quiz availability:", err);
                setError("Failed to check quiz availability. Please try again.");
                setLoading(false);
            }
        };

        checkQuizAvailability();
    }, []);

    const generateDailyQuiz = async () => {
        try {
            // Fetch random questions from the assessments collection
            const assessmentsRef = collection(db, 'assessments');
            const assessmentsSnapshot = await getDocs(assessmentsRef);
            
            if (assessmentsSnapshot.empty) {
                setError("No questions available for the daily quiz.");
                setLoading(false);
                return;
            }
            
            // Collect all questions from different assessments
            let allQuestions = [];
            assessmentsSnapshot.forEach(doc => {
                const assessment = doc.data();
                if (assessment.questions && assessment.questions.length > 0) {
                    assessment.questions.forEach(question => {
                        allQuestions.push({
                            ...question,
                            courseTitle: assessment.courseTitle || "Technical Assessment"
                        });
                    });
                }
            });
            
            if (allQuestions.length === 0) {
                setError("No questions available for the daily quiz.");
                setLoading(false);
                return;
            }
            
            // Shuffle and select 5 random questions for the daily quiz
            allQuestions = shuffleArray(allQuestions);
            const dailyQuestions = allQuestions.slice(0, 5);
            
            setQuiz({
                title: "Daily Quiz",
                date: new Date(),
                questions: dailyQuestions
            });
            
            setLoading(false);
        } catch (err) {
            console.error("Error generating daily quiz:", err);
            setError("Failed to generate daily quiz. Please try again.");
            setLoading(false);
        }
    };

    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const handleOptionSelect = (questionIndex, optionIndex) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // Quiz completed
            calculateScore();
            setQuizCompleted(true);
            setShowResults(true);
            updateUserQuizData();
        }
    };

    const calculateScore = () => {
        let correctAnswers = 0;
        quiz.questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = typeof question.correctAnswer === 'number' 
                ? question.correctAnswer 
                : question.options.indexOf(question.correctAnswer);
                
            if (userAnswer === correctAnswer) {
                correctAnswers++;
            }
        });
        
        const calculatedScore = (correctAnswers / quiz.questions.length) * 100;
        setScore(calculatedScore);
        return calculatedScore;
    };

    const updateUserQuizData = async () => {
        if (!auth.currentUser) return;
        
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            let newStreak = 1;
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const lastQuiz = userData.lastDailyQuiz ? userData.lastDailyQuiz.toDate() : null;
                
                if (lastQuiz) {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const lastQuizDay = new Date(lastQuiz.getFullYear(), lastQuiz.getMonth(), lastQuiz.getDate());
                    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                    
                    // If the last quiz was taken yesterday, increment the streak
                    if (lastQuizDay.getTime() === yesterdayDay.getTime()) {
                        newStreak = (userData.quizStreak || 0) + 1;
                    } else if (lastQuizDay.getTime() < yesterdayDay.getTime()) {
                        // If the last quiz was taken before yesterday, reset the streak
                        newStreak = 1;
                    } else {
                        // If the last quiz was taken today (shouldn't happen), keep the streak
                        newStreak = userData.quizStreak || 1;
                    }
                }
            }
            
            // Update user document with quiz data
            await updateDoc(userRef, {
                lastDailyQuiz: serverTimestamp(),
                quizStreak: newStreak
            });
            
            // Add quiz result to user's quiz history
            const quizHistoryRef = collection(db, 'users', auth.currentUser.uid, 'quizHistory');
            await addDoc(quizHistoryRef, {
                date: serverTimestamp(),
                score: score,
                questionsCount: quiz.questions.length,
                correctAnswers: Math.round(score * quiz.questions.length / 100)
            });
            
            setStreakCount(newStreak);
        } catch (err) {
            console.error("Error updating user quiz data:", err);
        }
    };

    const handleReturnToDashboard = () => {
        navigate('/fresher');
    };

    if (loading) {
        return <LoadingScreen message="Loading daily quiz..." />;
    }

    if (error) {
        return (
            <div className="daily-quiz-error">
                <h2>⚠️ Error</h2>
                <p>{error}</p>
                <button onClick={handleReturnToDashboard}>Return to Dashboard</button>
            </div>
        );
    }

    if (!quizAvailable) {
        return (
            <div className="daily-quiz-container">
                <div className="daily-quiz-header">
                    <h2>Daily Quiz</h2>
                    <div className="streak-counter">
                        <span>🔥 Streak: {streakCount} days</span>
                    </div>
                </div>
                <div className="quiz-completed-message">
                    <h3>You've already completed today's quiz!</h3>
                    <p>Come back tomorrow for a new challenge.</p>
                    <p>Last completed: {lastQuizDate ? lastQuizDate.toLocaleDateString() : 'N/A'}</p>
                    <button onClick={handleReturnToDashboard}>Return to Dashboard</button>
                </div>
            </div>
        );
    }

    if (showResults) {
        return (
            <div className="daily-quiz-container">
                <div className="daily-quiz-header">
                    <h2>Daily Quiz Results</h2>
                    <div className="streak-counter">
                        <span>🔥 Streak: {streakCount} days</span>
                    </div>
                </div>
                <div className="quiz-results">
                    <div className="score-display">
                        <div className="score-circle">
                            <span>{Math.round(score)}%</span>
                        </div>
                    </div>
                    <h3>Great job!</h3>
                    <p>You answered {Math.round(score * quiz.questions.length / 100)} out of {quiz.questions.length} questions correctly.</p>
                    <div className="results-details">
                        {quiz.questions.map((question, index) => {
                            const userAnswer = userAnswers[index];
                            const correctAnswer = typeof question.correctAnswer === 'number' 
                                ? question.correctAnswer 
                                : question.options.indexOf(question.correctAnswer);
                            const isCorrect = userAnswer === correctAnswer;
                            
                            return (
                                <div key={index} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                    <p className="question-text">{question.question}</p>
                                    <div className="answer-details">
                                        <p>Your answer: <span>{question.options[userAnswer]}</span></p>
                                        {!isCorrect && (
                                            <p>Correct answer: <span>{question.options[correctAnswer]}</span></p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button onClick={handleReturnToDashboard}>Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <div className="daily-quiz-container">
            <div className="daily-quiz-header">
                <h2>Daily Quiz</h2>
                <div className="streak-counter">
                    <span>🔥 Streak: {streakCount} days</span>
                </div>
            </div>
            <div className="quiz-progress">
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    ></div>
                </div>
                <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            </div>
            <div className="question-container">
                <p className="question-text">{currentQuestion.question}</p>
                <div className="options-list">
                    {currentQuestion.options.map((option, index) => (
                        <div 
                            key={index} 
                            className={`option-item ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(currentQuestionIndex, index)}
                        >
                            <span className="option-marker">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                        </div>
                    ))}
                </div>
                <div className="quiz-navigation">
                    <button 
                        className="next-button" 
                        onClick={handleNextQuestion}
                        disabled={userAnswers[currentQuestionIndex] === undefined}
                    >
                        {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </button>
                </div>
            </div>
            <div className="quiz-info">
                <p>From: {currentQuestion.courseTitle}</p>
            </div>
        </div>
    );
};

export default DailyQuiz;