import React, { useState, useEffect } from 'react';
import { courseService } from '../../services/courseService';
import '../../Style/DepartmentManagement.css';
import { db } from '../../firebase'; // Import db from firebase.js
import { collection, query, where, getDocs, updateDoc, doc, writeBatch, setDoc, limit } from 'firebase/firestore';

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [freshers, setFreshers] = useState([]);
    const [showAddDepartment, setShowAddDepartment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [departmentForm, setDepartmentForm] = useState({
        name: '',
        description: '',
        manager: '',
        location: ''
    });

    // Helper function to find or create a department (client-side)
    const findOrCreateDepartment = async (departmentName) => {
        const departmentsRef = collection(db, "departments");
        const q = query(departmentsRef, where("name", "==", departmentName), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const departmentDoc = snapshot.docs[0];
            return { id: departmentDoc.id, ...departmentDoc.data() };
        } else {
            // Create new department
            const newDepartmentRef = doc(departmentsRef);
            await setDoc(newDepartmentRef, {
                name: departmentName,
                description: `Department for ${departmentName}`,
                manager: "", // Default or placeholder
                location: "", // Default or placeholder
                memberCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return { id: newDepartmentRef.id, name: departmentName, memberCount: 0 };
        }
    };

    // Fetch departments and freshers
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [departmentsData, freshersData] = await Promise.all([
                    courseService.getAllDepartments(),
                    courseService.getAllFreshers()
                ]);
                setDepartments(departmentsData);
                setFreshers(freshersData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddDepartment = async () => {
        try {
            if (!departmentForm.name.trim()) {
                alert('Please enter department name');
                return;
            }

            await courseService.createDepartment(departmentForm);
            
            // Refresh departments list
            const updatedDepartments = await courseService.getAllDepartments();
            setDepartments(updatedDepartments);
            
            setDepartmentForm({
                name: '',
                description: '',
                manager: '',
                location: ''
            });
            setShowAddDepartment(false);
            alert('Department created successfully!');
        } catch (error) {
            console.error('Error creating department:', error);
            alert('Failed to create department');
        }
    };

    const handleRemoveFresherFromDepartment = async (fresherId, departmentId) => {
        try {
            await courseService.removeFresherFromDepartment(fresherId, departmentId);
            
            // Refresh data
            const [updatedDepartments, updatedFreshers] = await Promise.all([
                courseService.getAllDepartments(),
                courseService.getAllFreshers()
            ]);
            setDepartments(updatedDepartments);
            setFreshers(updatedFreshers);
            
            alert('Fresher removed from department successfully!');
        } catch (error) {
            console.error('Error removing fresher from department:', error);
            alert('Failed to remove fresher from department');
        }
    };

    const getFreshersInDepartment = (departmentId) => {
        return freshers.filter(fresher => fresher.departmentId === departmentId);
    };

    const handleAutoAssignFreshers = async () => {
        try {
            setLoading(true);
            let assignedCount = 0;
            const batch = writeBatch(db);
            const departmentUpdates = {}; // To track department member counts

            const freshersRef = collection(db, "users");
            const q = query(freshersRef, where("role", "==", "fresher"));
            const snapshot = await getDocs(q);

            for (const docSnapshot of snapshot.docs) {
                const fresherData = docSnapshot.data();
                const fresherId = docSnapshot.id;
                console.log('Processing fresher:', fresherId, fresherData); // Added console.log

                // Only process if fresher has a department name and is not already assigned
                if (fresherData.departmentName && !fresherData.departmentId) {
                    const departmentName = fresherData.departmentName;
                    const department = await findOrCreateDepartment(departmentName);

                    // Update fresher's document with departmentId
                    const fresherDocRef = doc(db, "users", fresherId);
                    batch.update(fresherDocRef, { departmentId: department.id });

                    // Prepare to increment department member count
                    if (!departmentUpdates[department.id]) {
                        departmentUpdates[department.id] = 0;
                    }
                    departmentUpdates[department.id]++;
                    assignedCount++;
                }
            }

            // Apply department member count updates
            // Note: We're still updating memberCount in the database for backward compatibility,
            // but the UI will use the actual count of freshers in each department
            for (const deptId in departmentUpdates) {
                const deptRef = doc(db, "departments", deptId);
                batch.update(deptRef, {
                    memberCount: (departmentUpdates[deptId] || 0) + (departments.find(d => d.id === deptId)?.memberCount || 0),
                    updatedAt: new Date(),
                });
            }

            await batch.commit();

            alert(`${assignedCount} freshers were automatically assigned to departments.`);
            // Refresh data after auto-assignment
            const [updatedDepartments, updatedFreshers] = await Promise.all([
                courseService.getAllDepartments(),
                courseService.getAllFreshers()
            ]);
            setDepartments(updatedDepartments);
            setFreshers(updatedFreshers);
        } catch (error) {
            console.error('Error during auto-assignment:', error);
            alert('Error during auto-assignment: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="department-management">
            <div className="department-management-header">
                <h2>Department Management</h2>
                <div className="department-actions">
                    <button 
                        className="add-department-btn"
                        onClick={() => setShowAddDepartment(true)}
                    >
                        + Add Department
                    </button>
                    <button 
                        className="assign-freshers-btn"
                        onClick={handleAutoAssignFreshers}
                        disabled={loading} // Disable while loading
                    >
                        {loading ? 'Assigning...' : 'Auto Assign Freshers'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading departments...</div>
            ) : (
                <div className="departments-list">
                    {departments.length === 0 ? (
                        <div className="no-departments">
                            No departments found. Create your first department to get started.
                        </div>
                    ) : (
                        departments.map(department => {
                            const departmentFreshers = getFreshersInDepartment(department.id);
                            return (
                                <div key={department.id} className="department-item">
                                    <div className="department-header">
                                        <h3>{department.name}</h3>
                                        <div className="department-stats">
                                            <span>{departmentFreshers.length} members</span>
                                        </div>
                                    </div>
                                    <div className="department-details">
                                        <p><strong>Description:</strong> {department.description}</p>
                                        <p><strong>Manager:</strong> {department.manager}</p>
                                        <p><strong>Location:</strong> {department.location}</p>
                                        <p><strong>Created:</strong> {department.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                                    </div>
                                    
                                    {departmentFreshers.length > 0 && (
                                        <div className="department-members">
                                            <h4>Department Members:</h4>
                                            <div className="members-list">
                                                {departmentFreshers.map(fresher => (
                                                    <div key={fresher.id} className="member-item">
                                                        <span>{fresher.name || fresher.email}</span>
                                                        <button 
                                                            className="remove-member-btn"
                                                            onClick={() => handleRemoveFresherFromDepartment(fresher.id, department.id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Add Department Modal */}
            {showAddDepartment && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Department</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddDepartment(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Department Name:</label>
                                <input
                                    type="text"
                                    value={departmentForm.name}
                                    onChange={(e) => setDepartmentForm(prev => ({...prev, name: e.target.value}))}
                                    placeholder="Enter department name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description:</label>
                                <textarea
                                    value={departmentForm.description}
                                    onChange={(e) => setDepartmentForm(prev => ({...prev, description: e.target.value}))}
                                    placeholder="Enter department description"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Manager:</label>
                                    <input
                                        type="text"
                                        value={departmentForm.manager}
                                        onChange={(e) => setDepartmentForm(prev => ({...prev, manager: e.target.value}))}
                                        placeholder="Enter manager name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Location:</label>
                                    <input
                                        type="text"
                                        value={departmentForm.location}
                                        onChange={(e) => setDepartmentForm(prev => ({...prev, location: e.target.value}))}
                                        placeholder="Enter location"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowAddDepartment(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="save-btn"
                                onClick={handleAddDepartment}
                            >
                                Create Department
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement;
