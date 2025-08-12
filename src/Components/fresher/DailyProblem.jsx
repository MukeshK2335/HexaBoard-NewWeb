import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateCodingChallenge, evaluateCode } from '../../services/chatbotService';
import { db, auth } from "../../firebase";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import '../../Style/DailyProblem.css';

const DailyProblem = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [code, setCode] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [streakCount, setStreakCount] = useState(0);
    const [problemAvailable, setProblemAvailable] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    // Check if user has already solved a problem today and fetch streak info
    useEffect(() => {
        const checkProblemAvailability = async () => {
            if (!auth.currentUser) {
                setError("You must be logged in to solve the daily problem");
                setLoading(false);
                return;
            }

            try {
                setUserId(auth.currentUser.uid);
                
                // Check if user has already solved a problem today
                const userRef = doc(db, 'users', auth.currentUser.uid);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const lastProblem = userData.lastDailyProblem ? userData.lastDailyProblem.toDate() : null;
                    const streak = userData.problemStreak || 0;
                    
                    setStreakCount(streak);
                    
                    if (lastProblem) {
                        const today = new Date();
                        const lastProblemDay = new Date(lastProblem.getFullYear(), lastProblem.getMonth(), lastProblem.getDate());
                        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        if (lastProblemDay.getTime() === todayDay.getTime()) {
                            // User has already solved a problem today
                            setProblemAvailable(false);
                        }
                    }
                }

                // Generate a new daily problem
                await generateDailyProblem();
            } catch (error) {
                console.error("Error checking problem availability:", error);
                setError("Failed to check problem availability. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        checkProblemAvailability();
    }, []);

    const generateDailyProblem = async () => {
        try {
            setLoading(true);
            const newQuestion = await generateCodingChallenge();
            setQuestion(newQuestion);
        } catch (err) {
            setError('Failed to generate daily problem.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!code.trim()) {
            setError('Please write some code to submit.');
            return;
        }
        
        // Check if user is authenticated before proceeding
        if (!userId) {
            setError('You must be logged in to submit code. Please log in and try again.');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        setEvaluation('');
        
        try {
            const feedback = await evaluateCode(question, code);
            setEvaluation(feedback);
            
            // Check if the solution is correct
            if (feedback.startsWith("Correct")) {
                // Update streak and store result
                await updateStreak();
            }
        } catch (err) {
            setError(`Failed to submit code: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    const updateStreak = async () => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            let newStreak = 1;
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const lastProblem = userData.lastDailyProblem ? userData.lastDailyProblem.toDate() : null;
                
                if (lastProblem) {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const lastProblemDay = new Date(lastProblem.getFullYear(), lastProblem.getMonth(), lastProblem.getDate());
                    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
                    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    
                    // If this is the first submission today
                    if (lastProblemDay.getTime() !== todayDay.getTime()) {
                        // If the last problem was solved yesterday, increment the streak
                        if (lastProblemDay.getTime() === yesterdayDay.getTime()) {
                            newStreak = (userData.problemStreak || 0) + 1;
                        } else if (lastProblemDay.getTime() < yesterdayDay.getTime()) {
                            // If the last problem was solved before yesterday, reset the streak
                            newStreak = 1;
                        } else {
                            // If the last problem was solved today (shouldn't happen), keep the streak
                            newStreak = userData.problemStreak || 1;
                        }
                    }
                } else {
                    // Already solved today, maintain current streak
                    newStreak = userData.problemStreak || 1;
                    setSuccessMessage('You already solved today\'s problem!');
                    setSaveSuccess(true);
                    setTimeout(() => {
                        setSaveSuccess(false);
                        setSuccessMessage('');
                    }, 3000);
                    return;
                }
            }
            
            // Update user document with problem data
            await updateDoc(userRef, {
                lastDailyProblem: serverTimestamp(),
                problemStreak: newStreak
            });
            
            // Store the problem result
            const timestamp = new Date().getTime();
            const problemRef = doc(db, 'users', userId, 'dailyProblems', `problem_${timestamp}`);
            
            await setDoc(problemRef, {
                question: question,
                code: code,
                timestamp: serverTimestamp(),
                date: new Date().toISOString().split('T')[0]
            });
            
            setStreakCount(newStreak);
            setSuccessMessage(`Daily problem submitted successfully! Your streak is now ${newStreak} days.`);
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setSuccessMessage('');
            }, 3000);
            
            // Mark problem as solved for today
            setProblemAvailable(false);
            
        } catch (err) {
            console.error("Error updating streak:", err);
            setError(`Failed to update streak: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="daily-problem-loading">
                <div className="spinner"></div>
                <p>Loading daily problem...</p>
            </div>
        );
    }

    return (
        <div className="daily-problem-container">
            <div className="problem-header">
                <h2>Daily Coding Problem</h2>
                <div className="streak-counter">
                    <span>🔥 Streak: {streakCount} days</span>
                </div>
            </div>

            {error && <p className="error-message">{error}</p>}
            
            {!problemAvailable ? (
                <div className="problem-completed">
                    <div className="success-icon">✅</div>
                    <h3>You've completed today's problem!</h3>
                    <p>Come back tomorrow for a new challenge to continue your streak.</p>
                </div>
            ) : (
                <>
                    {question && (
                        <div className="question-container">
                            <h3>Today's Problem:</h3>
                            <ReactMarkdown>{question}</ReactMarkdown>
                        </div>
                    )}
                    <div className="editor-container">
                        <h3>Your Solution:</h3>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Write your code here..."
                        />
                        <div className="editor-buttons">
                            <button onClick={handleSubmitCode} disabled={submitting || !code.trim()}>
                                {submitting ? 'Submitting...' : 'Submit Solution'}
                            </button>
                        </div>
                    </div>
                </>
            )}
            
            {evaluation && (
                <div className="evaluation-container">
                    <h3>Evaluation:</h3>
                    <div className="emoji-result">
                        <span className="emoji">
                            {evaluation.startsWith("Correct") ? "😊" : evaluation.includes("Syntax Error") ? "⚠️" : "😢"}
                        </span>
                        <p className="evaluation-text">{evaluation}</p>
                    </div>
                </div>
            )}
            
            {saveSuccess && (
                <div className="success-message">
                    <p>✅ {successMessage}</p>
                </div>
            )}
        </div>
    );
};

export default DailyProblem;