import React, { useState, useEffect } from 'react';
import '../../Style/AllFreshers.css';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AllFreshers = () => {
    const [freshers, setFreshers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFreshers = async () => {
            setLoading(true);
            setError(null);
            try {
                const q = query(collection(db, 'users'), where('role', '==', 'fresher'));
                const snapshot = await getDocs(q);
                const freshersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFreshers(freshersData);
            } catch (err) {
                setError('Error fetching freshers: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchFreshers();
    }, []);

    return (
        <div className="all-freshers-container">
            <h2>All Freshers</h2>
            {loading && <div>Loading...</div>}
            {error && <div className="error-message">{error}</div>}
            {freshers.length > 0 ? (
                <table className="freshers-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        {freshers.map(fresher => (
                            <tr key={fresher.id}>
                                <td>{fresher.name}</td>
                                <td>{fresher.departmentName || fresher.department}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                !loading && <div>No freshers found.</div>
            )}
        </div>
    );
};

export default AllFreshers;
