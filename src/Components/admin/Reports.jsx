import React, { useState, useEffect } from 'react';
import '../../Style/Repots.css';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const Reports = () => {
    const [reportType, setReportType] = useState('department');
    const [selectedFresher, setSelectedFresher] = useState('');
    const [freshers, setFreshers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [departments, setDepartments] = useState([]);

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

        const fetchDepartments = async () => {
            try {
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);
                console.log('Total user documents fetched:', querySnapshot.docs.length);
                const uniqueDepartments = new Set();
                querySnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    console.log('User ID:', doc.id, 'Department:', data.department);
                    if (data.department) {
                        uniqueDepartments.add(data.department);
                    } else {
                        uniqueDepartments.add('N/A'); // Add N/A for users without a department
                    }
                });
                console.log('Unique departments identified:', Array.from(uniqueDepartments));
                setDepartments(Array.from(uniqueDepartments));
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        };

        fetchFreshers();
        fetchDepartments();
    }, []);

    const handleReportTypeChange = (e) => {
        setReportType(e.target.value);
        setSelectedFresher('');
        setSelectedDepartment(''); // Clear selected department when report type changes
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
                await downloadDepartmentWiseFresherAssignmentMarks(selectedDepartment); // Pass selectedDepartment
            } else if (reportType === 'dailyProblemProgress') {
                if (selectedFresher) {
                    await downloadIndividualFresherDailyProblemProgress(selectedFresher);
                } else {
                    await downloadDepartmentWiseFresherDailyProblemProgress();
                }
            } else if (reportType === 'codingChallengeProgress') {
                if (selectedFresher) {
                    await downloadIndividualFresherCodingChallengeProgress(selectedFresher);
                } else {
                    await downloadDepartmentWiseFresherCodingChallengeProgress();
                }
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadDepartmentWiseFresherAssignmentMarks = async (departmentFilter) => {
        try {
            let freshersQuery = query(collection(db, 'users'), where('role', '==', 'fresher'));
            if (departmentFilter) {
                freshersQuery = query(freshersQuery, where('department', '==', departmentFilter));
            }
            const freshersSnapshot = await getDocs(freshersQuery);
            
            if (freshersSnapshot.empty) {
                alert('No freshers found for the selected department.');
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
            link.setAttribute('download', `Department_Wise_Fresher_Assignments${departmentFilter ? `_${departmentFilter}` : ''}.csv`);
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

    const downloadIndividualFresherDailyProblemProgress = async (fresherId) => {
        try {
            const fresherDoc = await getDoc(doc(db, 'users', fresherId));
            if (!fresherDoc.exists()) {
                throw new Error('Fresher not found');
            }
            const fresherData = fresherDoc.data();
            const fresherName = fresherData.name || fresherData.email || 'Unknown';

            const dailyProblemsQuery = query(collection(db, 'users', fresherId, 'dailyProblems'));
            const dailyProblemsSnapshot = await getDocs(dailyProblemsQuery);

            if (dailyProblemsSnapshot.empty) {
                alert(`No daily problem submissions found for ${fresherName}.`);
                return;
            }

            let csvContent = 'Problem Date,Question,Code Submitted\n';
            dailyProblemsSnapshot.docs.forEach(problemDoc => {
                const problem = problemDoc.data();
                const date = problem.date || (problem.timestamp ? new Date(problem.timestamp.toDate()).toLocaleDateString() : 'N/A');
                const question = problem.question ? `"${problem.question.replace(/"/g, '""')}"` : 'N/A'; // Handle commas and quotes
                const code = problem.code ? `"${problem.code.replace(/"/g, '""')}"` : 'N/A'; // Handle commas and quotes
                csvContent += `"${date}",${question},${code}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fresherName}_Daily_Problem_Progress.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error downloading individual daily problem report:', error);
            throw error;
        }
    };

    const downloadDepartmentWiseFresherDailyProblemProgress = async () => {
        try {
            const freshersQuery = query(collection(db, 'users'), where('role', '==', 'fresher'));
            const freshersSnapshot = await getDocs(freshersQuery);

            if (freshersSnapshot.empty) {
                alert('No freshers found.');
                return;
            }

            let csvContent = 'Fresher Name,Department,Problem Date,Question,Code Submitted\n';

            for (const fresherDoc of freshersSnapshot.docs) {
                const fresherId = fresherDoc.id;
                const fresherData = fresherDoc.data();
                const fresherName = fresherData.name || fresherData.email || 'Unknown';
                const department = fresherData.department || 'N/A';

                const dailyProblemsQuery = query(collection(db, 'users', fresherId, 'dailyProblems'));
                const dailyProblemsSnapshot = await getDocs(dailyProblemsQuery);

                if (!dailyProblemsSnapshot.empty) {
                    dailyProblemsSnapshot.docs.forEach(problemDoc => {
                        const problem = problemDoc.data();
                        const date = problem.date || (problem.timestamp ? new Date(problem.timestamp.toDate()).toLocaleDateString() : 'N/A');
                        const question = problem.question ? `"${problem.question.replace(/"/g, '""')}"` : 'N/A';
                        const code = problem.code ? `"${problem.code.replace(/"/g, '""')}"` : 'N/A';
                        csvContent += `"${fresherName}","${department}","${date}",${question},${code}\n`;
                    });
                }
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Department_Wise_Daily_Problem_Progress.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error downloading department-wise daily problem report:', error);
            throw error;
        }
    };

    const downloadIndividualFresherCodingChallengeProgress = async (fresherId) => {
        try {
            const fresherDoc = await getDoc(doc(db, 'users', fresherId));
            if (!fresherDoc.exists()) {
                throw new Error('Fresher not found');
            }
            const fresherData = fresherDoc.data();
            const fresherName = fresherData.name || fresherData.email || 'Unknown';

            const codingChallengesQuery = query(collection(db, 'users', fresherId, 'codingChallenges')); // Assuming 'codingChallenges' subcollection
            const codingChallengesSnapshot = await getDocs(codingChallengesQuery);

            if (codingChallengesSnapshot.empty) {
                alert(`No coding challenge submissions found for ${fresherName}.`);
                return;
            }

            let csvContent = 'Challenge Date,Question,Code Submitted\n';
            codingChallengesSnapshot.docs.forEach(challengeDoc => {
                const challenge = challengeDoc.data();
                const date = challenge.date || (challenge.timestamp ? new Date(challenge.timestamp.toDate()).toLocaleDateString() : 'N/A');
                const question = challenge.question ? `"${challenge.question.replace(/"/g, '""')}"` : 'N/A';
                const code = challenge.code ? `"${challenge.code.replace(/"/g, '""')}"` : 'N/A';
                csvContent += `"${date}",${question},${code}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${fresherName}_Coding_Challenge_Progress.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error downloading individual coding challenge report:', error);
            throw error;
        }
    };

    const downloadDepartmentWiseFresherCodingChallengeProgress = async () => {
        try {
            const freshersQuery = query(collection(db, 'users'), where('role', '==', 'fresher'));
            const freshersSnapshot = await getDocs(freshersQuery);

            if (freshersSnapshot.empty) {
                alert('No freshers found.');
                return;
            }

            let csvContent = 'Fresher Name,Department,Challenge Date,Question,Code Submitted\n';

            for (const fresherDoc of freshersSnapshot.docs) {
                const fresherId = fresherDoc.id;
                const fresherData = fresherDoc.data();
                const fresherName = fresherData.name || fresherData.email || 'Unknown';
                const department = fresherData.department || 'N/A';

                const codingChallengesQuery = query(collection(db, 'users', fresherId, 'codingChallenges'));
                const codingChallengesSnapshot = await getDocs(codingChallengesQuery);

                if (!codingChallengesSnapshot.empty) {
                    codingChallengesSnapshot.docs.forEach(challengeDoc => {
                        const challenge = challengeDoc.data();
                        const date = challenge.date || (challenge.timestamp ? new Date(challenge.timestamp.toDate()).toLocaleDateString() : 'N/A');
                        const question = challenge.question ? `"${challenge.question.replace(/"/g, '""')}"` : 'N/A';
                        const code = challenge.code ? `"${challenge.code.replace(/"/g, '""')}"` : 'N/A';
                        csvContent += `"${fresherName}","${department}","${date}",${question},${code}\n`;
                    });
                }
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Department_Wise_Coding_Challenge_Progress.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error downloading department-wise coding challenge report:', error);
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
                    <option value="department">Department-wise Assignment Marks</option>
                    <option value="individual">Individual Assignment Marks</option>
                    <option value="dailyProblemProgress">Daily Problem Progress</option>
                    <option value="codingChallengeProgress">Coding Challenge Progress</option>
                </select>
                
                {reportType === 'department' && (
                    <select 
                        className="report-dropdown department-select"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>
                                {dept}
                            </option>
                        ))}
                    </select>
                )}

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
