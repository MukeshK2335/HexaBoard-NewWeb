import React, { useState } from 'react';
import { generateCodingChallenge, evaluateCode } from '../../services/chatbotService';
import '../../Style/CodeChallenge.css';

const CodeChallenge = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [code, setCode] = useState('');
    const [evaluation, setEvaluation] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    const handleSubmitCode = async () => {
        if (!code.trim()) {
            setError('Please write some code to submit.');
            return;
        }
        setSubmitting(true);
        setError(null);
        setEvaluation('');
        try {
            const feedback = await evaluateCode(question, code);
            setEvaluation(feedback);
        } catch (err) {
            setError('Failed to submit code.');
        }
        setSubmitting(false);
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
                    <button onClick={handleSubmitCode} disabled={submitting || !code.trim()}>
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
                    <pre>{evaluation.startsWith("Correct") ? "😊" : evaluation.includes("Syntax Error") ? "Syntax Error" : "😢"}</pre>
                </div>
            )}
        </div>
    );
};

export default CodeChallenge;
