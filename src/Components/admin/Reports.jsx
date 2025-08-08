import React, { useState, useEffect } from 'react';
import '../../Style/Repots.css';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const Reports = () => {
    const [reportType, setReportType] = useState('department');
    const [selectedFresher, setSelectedFresher] = useState('');
    const [freshers, setFreshers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch all freshers for individual selection
    useEffect(() => {
        const fetchFreshers = async () => {
            try {
                const freshersQuery = query(collection(db, 'users'), where('role', '==', 'fresher'));
                const querySnapshot = await getDocs(freshersQuery);
                const freshersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setFreshers(freshersList);
            } catch (error) {
                console.error('Error fetching freshers:', error);
            }
        };

        fetchFreshers();
    }, []);

    const handleReportTypeChange = (e) => {
        setReportType(e.target.value);
        setSelectedFresher('');
    };

    const handleFresherChange = (e) => {
        setSelectedFresher(e.target.value);
    };

    const downloadReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'individual' && selectedFresher) {
                await downloadIndividualFresherAssignmentMarks(selectedFresher);
            } else if (reportType === 'department') {
                await downloadDepartmentWiseFresherAssignmentMarks();
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadDepartmentWiseFresherAssignmentMarks = async () => {
        try {
            // Get all freshers
            const freshersQuery = query(collection(db, 'users'), where('role', '==', 'fresher'));
            const freshersSnapshot = await getDocs(freshersQuery);
            
            if (freshersSnapshot.empty) {
                alert('No freshers found.');
                return;
            }
            
            // Create CSV content with headers
            let csvContent = 'Fresher Name,Department,Course Title,Status,Marks,Submission Date\n';
            
            // Process each fresher
            for (const fresherDoc of freshersSnapshot.docs) {
                const fresherId = fresherDoc.id;
                const fresherData = fresherDoc.data();
                const fresherName = fresherData.name || fresherData.email || 'Unknown';
                const department = fresherData.department || 'N/A';
                
                // Get assignments for this fresher
                const assignmentsQuery = query(collection(db, 'users', fresherId, 'assignments'));
                const assignmentsSnapshot = await getDocs(assignmentsQuery);
                
                if (!assignmentsSnapshot.empty) {
                    // Add each assignment to the CSV
                    assignmentsSnapshot.docs.forEach(assignmentDoc => {
                        const assignment = assignmentDoc.data();
                        const courseTitle = assignment.courseTitle || 'N/A';
                        const status = assignment.status || 'Pending';
                        const marks = assignment.marks !== undefined ? assignment.marks : 'N/A';
                        const submissionDate = assignment.submissionDate ? 
                            new Date(assignment.submissionDate.toDate()).toLocaleDateString() : 'N/A';
                        
                        csvContent += `"${fresherName}","${department}","${courseTitle}","${status}","${marks}","${submissionDate}"\n`;
                    });
                }
            }
            
            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Department_Wise_Fresher_Assignments.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error downloading department-wise report:', error);
            throw error;
        }
    };
    
    const downloadIndividualFresherAssignmentMarks = async (fresherId) => {
        try {
            // Get fresher details
            const fresherDoc = await getDoc(doc(db, 'users', fresherId));
            if (!fresherDoc.exists()) {
                throw new Error('Fresher not found');
            }
            const fresherData = fresherDoc.data();
            
            // Get assignments for the fresher
            const assignmentsQuery = query(
                collection(db, 'users', fresherId, 'assignments')
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            
            if (assignmentsSnapshot.empty) {
                alert('No assignments found for this fresher.');
                return;
            }
            
            // Prepare data for Excel
            const assignments = assignmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Create CSV content
            let csvContent = 'Course Title,Status,Marks,Submission Date\n';
            
            assignments.forEach(assignment => {
                const courseTitle = assignment.courseTitle || 'N/A';
                const status = assignment.status || 'Pending';
                const marks = assignment.marks !== undefined ? assignment.marks : 'N/A';
                const submissionDate = assignment.submissionDate ? new Date(assignment.submissionDate.toDate()).toLocaleDateString() : 'N/A';
                
                csvContent += `"${courseTitle}","${status}","${marks}","${submissionDate}"\n`;
            });
            
            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fresherData.name || 'Fresher'}_Assignments.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error downloading individual fresher report:', error);
            throw error;
        }
    };

    return (
        <div className="report-section">
            <h2 className="report-title">Generate Reports</h2>
            <div className="report-controls">
                <select 
                    className="report-dropdown"
                    value={reportType}
                    onChange={handleReportTypeChange}
                >
                    <option value="department">Department-wise</option>
                    <option value="individual">Individual</option>
                </select>
                
                {reportType === 'individual' && (
                    <select 
                        className="report-dropdown fresher-select"
                        value={selectedFresher}
                        onChange={handleFresherChange}
                    >
                        <option value="">Select Fresher</option>
                        {freshers.map(fresher => (
                            <option key={fresher.id} value={fresher.id}>
                                {fresher.name || fresher.email}
                            </option>
                        ))}
                    </select>
                )}
                
                <button 
                    className="download-btn" 
                    onClick={downloadReport}
                    disabled={loading || (reportType === 'individual' && !selectedFresher)}
                >
                    {loading ? 'Processing...' : '⬇️ Download Report'}
                </button>
            </div>
        </div>
    );
};

export default Reports;
