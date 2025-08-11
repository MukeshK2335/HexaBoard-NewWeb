import React, { useState, useEffect } from 'react';
import { generateCodingChallenge, evaluateCode } from '../../services/chatbotService';
import { db, auth } from "../../firebase";
import { doc, setDoc, collection, getDoc } from "firebase/firestore";
import '../../Style/CodeChallenge.css';

const CodeChallenge = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [code, setCode] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);


    const handleGenerateQuestion = async () => {
        setLoading(true);
        setError(null);
        setQuestion('');
        setCode('');
        setEvaluation('');
        try {
            const newQuestion = await generateCodingChallenge();
            setQuestion(newQuestion);
        } catch (err) {
            setError('Failed to generate new question.');
        }
        setLoading(false);
    };

    // Function to ensure user document exists in Firestore
    const ensureUserDocument = async (uid) => {
        try {
            console.log('Ensuring user document exists for:', uid);
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                console.log('Creating new user document in Firestore');
                await setDoc(userDocRef, {
                    uid: uid,
                    createdAt: new Date(),
                    lastUpdated: new Date()
                });
                console.log('User document created successfully');
            } else {
                console.log('User document already exists');
            }
            return true;
        } catch (error) {
            console.error('Error ensuring user document:', error);
            return false;
        }
    };
    
    useEffect(() => {
        console.log('Setting up authentication listener...');
        
        // Check if there's already a logged-in user when component mounts
        const currentUser = auth.currentUser;
        if (currentUser) {
            console.log('User already logged in:', currentUser.uid);
            setUserId(currentUser.uid);
            ensureUserDocument(currentUser.uid);
        } else {
            console.log('No user currently logged in');
        }
        
        // Set up listener for auth state changes
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User authenticated:', user.uid);
                setUserId(user.uid);
                ensureUserDocument(user.uid);
            } else {
                console.log('User signed out');
                setUserId(null);
            }
        });
        
        // Clean up listener on component unmount
        return () => {
            console.log('Cleaning up auth listener');
            unsubscribe();
        };
    }, []);

    const handleRunCode = async () => {
        if (!code.trim()) {
            setError('Please write some code to run.');
            return;
        }
        setSubmitting(true);
        setError(null);
        setEvaluation('');
        try {
            const feedback = await evaluateCode(question, code);
            setEvaluation(feedback);
        } catch (err) {
            setError('Failed to run code.');
        }
        setSubmitting(false);
    };
    
    const handleSubmitCode = async () => {
        if (!code.trim()) {
            setError('Please write some code to submit.');
            return;
        }
        
        // Check if user is authenticated before proceeding
        if (!userId) {
            console.warn('User not authenticated. Cannot submit code for evaluation and storage.');
            setError('You must be logged in to submit code. Please log in and try again.');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        setEvaluation('');
        
        try {
            console.log('Submitting code for evaluation...');
            const feedback = await evaluateCode(question, code);
            setEvaluation(feedback);
            console.log('Evaluation feedback received:', feedback);
            
            // Determine emoji mark based on feedback
            const emojiMark = feedback.startsWith("Correct") ? "😊" : 
                             feedback.includes("Syntax Error") ? "⚠️" : "😢";
            console.log('Determined emoji mark:', emojiMark);
            
            // Store emoji mark in Firestore
            await storeEmojiMark(emojiMark);
        } catch (err) {
            console.error('Error in handleSubmitCode:', err);
            setError(`Failed to submit code: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    /**
     * Stores the emoji mark in Firestore under the user's ID in the 'codingChallenge' collection
     * This function is only called when the user clicks the Submit button, not the Run button
     * @param {string} emojiMark - The emoji representing the evaluation result (😊, ⚠️, or 😢)
     */
    const storeEmojiMark = async (emojiMark) => {
        try {
            console.log('Attempting to store emoji mark for user:', userId);
            
            if (!userId) {
                console.error('Cannot store emoji mark: User ID is null or undefined');
                setError('Failed to store your result: User not authenticated. Please log in and try again.');
                return;
            }
            
            // Ensure user document exists before proceeding
            const userDocExists = await ensureUserDocument(userId);
            if (!userDocExists) {
                throw new Error('Failed to create or verify user document');
            }
            
            // Reference to the user document
            const userDocRef = doc(db, 'users', userId);
            
            // Create a new document in the 'codingChallenges' collection under the user's ID
            // Using a timestamp in the document ID to ensure uniqueness
            const timestamp = new Date().getTime();
            const codingChallengeRef = doc(db, 'users', userId, 'codingChallenges', `challenge_${timestamp}`);
            
            const dataToStore = {
                mark: emojiMark,
                question: question,
                code: code,
                timestamp: new Date()
            };
            
            console.log('Storing data in Firestore at path:', codingChallengeRef.path);
            console.log('Data to store:', dataToStore);
            
            // Attempt to write the document
            await setDoc(codingChallengeRef, dataToStore);
            
            // Verify the document was written successfully
            const verifyDoc = await getDoc(codingChallengeRef);
            if (verifyDoc.exists()) {
                console.log('Emoji mark stored and verified successfully');
                setSaveSuccess(true);
                
                // Hide success message after 3 seconds
                setTimeout(() => {
                    setSaveSuccess(false);
                }, 3000);
            } else {
                throw new Error('Document was not found after writing. This may indicate a permissions issue.');
            }
        } catch (error) {
            console.error('Error storing emoji mark:', error);
            setError(`Failed to store your result: ${error.message}. Please try again.`);
        }
    };


    
    return (
        <div className="code-challenge-container">
            <div className="challenge-header">
                <h1>Coding Challenge</h1>
                <button onClick={handleGenerateQuestion} disabled={loading}>
                    {loading ? 'Generating...' : 'New Challenge'}
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {question && (
                <div className="question-container">
                    <h2>Problem:</h2>
                    <pre>{question}</pre>
                </div>
            )}
            <div className="editor-container">
                <h2>Your Solution:</h2>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write your code here..."
                />
                <div className="editor-buttons">
                    <button onClick={handleRunCode} disabled={submitting || !code.trim()}>
                        {submitting ? 'Running...' : 'Run'}
                    </button>
                    <button onClick={handleSubmitCode} disabled={submitting || !code.trim()}>
                        {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
            {evaluation && (
                <div className="evaluation-container">
                    <h2>Evaluation:</h2>
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
                    <p>✅ Your result has been saved successfully!</p>
                    <small style={{ fontSize: '11px', opacity: 0.8 }}>Stored in Firestore under your user profile</small>
                </div>
            )}
        </div>
    );
};

export default CodeChallenge;
