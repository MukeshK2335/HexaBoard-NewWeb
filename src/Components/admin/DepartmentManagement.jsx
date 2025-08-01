import React, { useState, useEffect } from 'react';
import { courseService } from '../../services/courseService';
import '../../Style/DepartmentManagement.css';

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [freshers, setFreshers] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [showAddDepartment, setShowAddDepartment] = useState(false);
    const [showAssignFreshers, setShowAssignFreshers] = useState(false);
    const [loading, setLoading] = useState(true);
    const [departmentForm, setDepartmentForm] = useState({
        name: '',
        description: '',
        manager: '',
        location: ''
    });
    const [selectedFreshers, setSelectedFreshers] = useState([]);

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

    const handleAssignFreshers = async () => {
        try {
            if (!selectedDepartment) {
                alert('Please select a department');
                return;
            }

            if (selectedFreshers.length === 0) {
                alert('Please select freshers to assign');
                return;
            }

            // Assign each selected fresher to the department
            for (const fresherId of selectedFreshers) {
                await courseService.assignFresherToDepartment(fresherId, selectedDepartment);
            }

            // Refresh data
            const [updatedDepartments, updatedFreshers] = await Promise.all([
                courseService.getAllDepartments(),
                courseService.getAllFreshers()
            ]);
            setDepartments(updatedDepartments);
            setFreshers(updatedFreshers);
            
            setSelectedFreshers([]);
            setShowAssignFreshers(false);
            alert(`Successfully assigned ${selectedFreshers.length} freshers to department!`);
        } catch (error) {
            console.error('Error assigning freshers:', error);
            alert('Failed to assign freshers to department');
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

    const getUnassignedFreshers = () => {
        return freshers.filter(fresher => !fresher.departmentId);
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
                        onClick={() => setShowAssignFreshers(true)}
                    >
                        Assign Freshers
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
                                            <span>{department.memberCount || 0} members</span>
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

            {/* Assign Freshers Modal */}
            {showAssignFreshers && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Assign Freshers to Department</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAssignFreshers(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Select Department:</label>
                                <select 
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                >
                                    <option value="">Choose a department...</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Select Freshers:</label>
                                <div className="freshers-selection">
                                    {getUnassignedFreshers().map(fresher => (
                                        <label key={fresher.id} className="fresher-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedFreshers.includes(fresher.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedFreshers(prev => [...prev, fresher.id]);
                                                    } else {
                                                        setSelectedFreshers(prev => prev.filter(id => id !== fresher.id));
                                                    }
                                                }}
                                            />
                                            <span>{fresher.name || fresher.email}</span>
                                        </label>
                                    ))}
                                    {getUnassignedFreshers().length === 0 && (
                                        <p className="no-freshers">No unassigned freshers available.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button 
                                className="cancel-btn"
                                onClick={() => setShowAssignFreshers(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="save-btn"
                                onClick={handleAssignFreshers}
                                disabled={!selectedDepartment || selectedFreshers.length === 0}
                            >
                                Assign Freshers
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement; 