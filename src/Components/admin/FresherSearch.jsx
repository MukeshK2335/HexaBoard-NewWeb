import React, { useState } from 'react';
import '../../Style/FresherSearch.css';
import { auth, db } from '../../firebase';
import { getIdToken } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const FresherSearch = ({ onAddFresher }) => {
    const [filters, setFilters] = useState({ skill: '', department: '', status: '', query: '' });
    const [newFresher, setNewFresher] = useState({ name: '', email: '', department: '', startDate: '' });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userFound, setUserFound] = useState(false);
    const navigate = useNavigate();

    const handleSearchChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleFresherChange = (e) => {
        setNewFresher({ ...newFresher, [e.target.name]: e.target.value });
    };

    const handleAddFresherClick = async () => {
        if (!newFresher.name || !newFresher.email || !newFresher.department || !newFresher.startDate) {
            alert("Please fill all fresher fields.");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                alert('User not authenticated');
                return;
            }
            const token = await getIdToken(user);
            const response = await fetch('http://localhost:5000/api/add-fresher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newFresher.name,
                    email: newFresher.email,
                    department: newFresher.department,
                    startDate: newFresher.startDate
                })
            });
            const data = await response.json();
            if (data.success) {
                alert('Fresher added successfully');
                setNewFresher({ name: '', email: '', department: '', startDate: '' });
            } else {
                alert('Failed to add fresher: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Error adding fresher: ' + error.message);
        }
    };

    // Helper to search freshers in Firestore
    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setResults([]);
        setUserFound(false);
        try {
            let q = query(collection(db, 'users'), where('role', '==', 'fresher'));
            // Firestore doesn't support OR queries, so we filter in JS for name/email
            const snapshot = await getDocs(q);
            let freshers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Filter by name/email
            if (filters.query) {
                const qLower = filters.query.toLowerCase();
                freshers = freshers.filter(f =>
                    (f.name && f.name.toLowerCase().includes(qLower)) ||
                    (f.email && f.email.toLowerCase().includes(qLower))
                );
            }
            // Filter by department
            if (filters.department) {
                freshers = freshers.filter(f => f.department === filters.department);
            }
            // Filter by skill
            if (filters.skill) {
                freshers = freshers.filter(f =>
                    Array.isArray(f.skills)
                        ? f.skills.includes(filters.skill)
                        : (f.skill === filters.skill)
                );
            }
            // Filter by status
            if (filters.status) {
                freshers = freshers.filter(f => f.status === filters.status);
            }
            setResults(freshers);
            setUserFound(freshers.length > 0);
        } catch (err) {
            setError('Error searching freshers: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fresher-container">
            <div className="card-box">
                <h3>Search Freshers</h3>
                <div className="filters">
                    <input name="query" placeholder="Search by name/email" onChange={handleSearchChange} />
                    <select name="department" onChange={handleSearchChange}>
                        <option value="">Department</option>
                        <option value="IT">IT</option>
                        <option value="HR">HR</option>
                    </select>
                    <select name="skill" onChange={handleSearchChange}>
                        <option value="">Skill</option>
                        <option value="Java">Java</option>
                        <option value="React">React</option>
                    </select>
                    <select name="status" onChange={handleSearchChange}>
                        <option value="">Status</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                    </select>
                    <button onClick={handleSearch}>Search</button>
                </div>
                {loading && <div style={{marginTop: 12}}>Searching...</div>}
                {error && <div style={{color: 'red', marginTop: 12}}>{error}</div>}
                {userFound && (
                    <div style={{color: 'green', marginTop: 12, fontWeight: 500}}>User found</div>
                )}
                {results.length > 0 && (
                    <div className="fresher-card-list" style={{display: 'flex', flexDirection: 'column', gap: '18px', marginTop: 18}}>
                        {results.map(f => (
                            <div key={f.id} className="fresher-card" style={{boxShadow: '0 2px 8px #e5e7eb', borderRadius: 12, padding: 20, background: '#fff', maxWidth: 400}}>
                                <div style={{fontWeight: 600, fontSize: '1.1rem', marginBottom: 8}}>{f.name}</div>
                                <div style={{marginBottom: 4}}><strong>Email:</strong> {f.email}</div>
                                <div style={{marginBottom: 4}}><strong>Department:</strong> {f.department}</div>
                                <div style={{marginBottom: 4}}><strong>Skill:</strong> {Array.isArray(f.skills) ? f.skills.join(', ') : (f.skill || '-')}</div>
                                <div style={{marginBottom: 4}}><strong>Status:</strong> {f.status || '-'}</div>
                                <div style={{marginBottom: 8}}><strong>Start Date:</strong> {f.startDate || '-'}</div>
                                <button onClick={() => navigate(`/admin/fresher/${f.id}`)} style={{background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', fontWeight: 500, cursor: 'pointer'}}>View</button>
                            </div>
                        ))}
                    </div>
                )}
                {(!loading && results.length === 0 && !error) && <div style={{marginTop: 12, color: '#888'}}>No freshers found.</div>}
            </div>

            <div className="card-box">
                <h3>Add New Fresher</h3>
                <div className="add-fresher-form">
                    <input
                        name="name"
                        type="text"
                        placeholder="Fresher Name"
                        value={newFresher.name}
                        onChange={handleFresherChange}
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Fresher Email"
                        value={newFresher.email}
                        onChange={handleFresherChange}
                    />
                    <select name="department" value={newFresher.department} onChange={handleFresherChange}>
                        <option value="">Select Department</option>
                        <option value="IT">IT</option>
                        <option value="HR">HR</option>
                        <option value="Support">Support</option>
                    </select>
                    <input
                        name="startDate"
                        type="date"
                        value={newFresher.startDate}
                        onChange={handleFresherChange}
                    />
                    <button onClick={handleAddFresherClick}>Add Fresher</button>
                </div>
            </div>
        </div>
    );
};

export default FresherSearch;
