
import React, { useState } from 'react';
import Papa from 'papaparse';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const CsvUpload = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({ success: [], failed: [] });

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResults({ success: [], failed: [] }); // Reset results when a new file is selected
    };

    const handleFileUpload = () => {
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        setLoading(true);
        setResults({ success: [], failed: [] });

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const users = results.data;
                const success = [];
                const failed = [];

                for (const user of users) {
                    const { email, name, department, role } = user;
                    const password = Math.random().toString(36).slice(-8);

                    try {
                        if (!email) {
                            throw new Error('Email is missing.');
                        }
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        const uid = userCredential.user.uid;

                        await setDoc(doc(db, 'users', uid), {
                            name,
                            email,
                            department,
                            role,
                        });

                        success.push({ email, password });
                    } catch (error) {
                        failed.push({ email, error: error.message });
                    }
                }

                setResults({ success, failed });
                setLoading(false);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                setLoading(false);
            }
        });
    };

    return (
        <div>
            <h2>Upload CSV to Create Users</h2>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={handleFileUpload} disabled={loading}>
                {loading ? 'Uploading...' : 'Upload and Create Users'}
            </button>

            {(results.success.length > 0 || results.failed.length > 0) && (
                <div>
                    <h3>Upload Results</h3>
                    {results.success.length > 0 && (
                        <div>
                            <h4>Successfully Created Users:</h4>
                            <ul>
                                {results.success.map((user, index) => (
                                    <li key={index}>{user.email} (Password: {user.password})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {results.failed.length > 0 && (
                        <div>
                            <h4>Failed to Create Users:</h4>
                            <ul>
                                {results.failed.map((user, index) => (
                                    <li key={index}>{user.email || 'Unknown Email'} - Error: {user.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CsvUpload;
