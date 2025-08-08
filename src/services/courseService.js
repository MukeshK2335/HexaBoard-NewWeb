import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch,
    setDoc,
    getDoc
} from 'firebase/firestore';

// Helper function to generate a random password
function generatePassword(length = 10) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

export const courseService = {
    async uploadFile(file, path) {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    },

    async addCourse(courseData, assignment) {
        try {
            if (courseData.thumbnail && courseData.thumbnail instanceof File) {
                courseData.thumbnailUrl = await this.uploadFile(
                    courseData.thumbnail,
                    `thumbnails/${Date.now()}_${courseData.thumbnail.name}`
                );
                delete courseData.thumbnail;
            }

            const lectures = await Promise.all(courseData.lectures.map(async (lecture) => {
                if (lecture.video instanceof File) {
                    const videoUrl = await this.uploadFile(
                        lecture.video,
                        `videos/lectures/${Date.now()}_${lecture.video.name}`
                    );
                    return { ...lecture, videoUrl, video: null };
                }
                return lecture;
            }));

            const finalCourseData = { ...courseData, lectures };

            if (assignment.mode === 'individual') {
                return this.addCourseForFresher(assignment.id, finalCourseData);
            } else if (assignment.mode === 'department') {
                return this.bulkAddCoursesToDepartment(assignment.id, finalCourseData);
            }
        } catch (error) {
            console.error('Error adding course:', error);
            throw error;
        }
    },

    async addCourseForFresher(fresherId, courseData) {
        const courseRef = collection(db, 'users', fresherId, 'courses');
        const docRef = await addDoc(courseRef, {
            ...courseData,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active',
            progress: 0,
            enrolledAt: new Date()
        });
        return { success: true, courseId: docRef.id };
    },

    async bulkAddCoursesToDepartment(departmentId, courseData) {
        const freshers = await this.getFreshersByDepartment(departmentId);
        if (freshers.length === 0) {
            throw new Error('No freshers found in this department');
        }

        const batch = writeBatch(db);
        freshers.forEach(fresher => {
            const courseRef = doc(collection(db, 'users', fresher.id, 'courses'));
            batch.set(courseRef, {
                ...courseData,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'active',
                progress: 0,
                enrolledAt: new Date(),
                assignedByDepartment: departmentId
            });
        });

        await batch.commit();
        return { success: true, assignedTo: freshers.length };
    },

    async getCoursesForFresher(fresherId) {
        const coursesRef = collection(db, 'users', fresherId, 'courses');
        const q = query(coursesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async deleteCourse(fresherId, courseId) {
        const courseRef = doc(db, 'users', fresherId, 'courses', courseId);
        await deleteDoc(courseRef);
        return { success: true };
    },

    async getAllFreshers() {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'fresher'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getAllDepartments() {
        const departmentsRef = collection(db, 'departments');
        const q = query(departmentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getFreshersByDepartment(departmentId) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'fresher'), where('departmentId', '==', departmentId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async markCourseAsCompleted(fresherId, courseId) {
        try {
            const courseRef = doc(db, 'users', fresherId, 'courses', courseId);
            const courseDoc = await getDoc(courseRef);

            if (!courseDoc.exists()) {
                throw new Error('Course not found.');
            }

            const courseData = courseDoc.data();

            await updateDoc(courseRef, {
                status: 'completed',
                updatedAt: new Date(),
                progress: 100 // Ensure progress is 100% when completed
            });

            // Check if an assignment for this course already exists
            const assignmentsRef = collection(db, 'users', fresherId, 'assignments');
            const q = query(assignmentsRef, where('courseId', '==', courseId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Add a new assessment assignment only if one doesn't exist
                await addDoc(assignmentsRef, {
                    type: 'assessment',
                    courseId: courseId,
                    courseTitle: courseData.title, // Use the title of the completed course
                    status: 'pending',
                    assignedAt: new Date(),
                    dueDate: null, // You might want to set a due date
                    description: `Take the assessment for ${courseData.title}`,
                });
            } else {
                // Check if any of the existing assignments are already completed
                const completedAssignments = querySnapshot.docs.filter(doc => doc.data().status === 'Completed');
                
                // If there's no completed assignment, we don't need to do anything
                // The existing pending assignment will be used
                console.log(`Assignment for course ${courseId} already exists. No new assignment created.`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error marking course as completed and assigning assessment:', error);
            throw error;
        }
    },

    // New function to handle fresher addition and email sending via Cloud Function
    async addFresherWithDepartmentAssignment(fresherData) {
        try {
            const password = generatePassword(); // Generate a random password

            // Helper to remove undefined values from an object
            const removeUndefined = (obj) => {
                return Object.fromEntries(
                    Object.entries(obj).filter(([, v]) => v !== undefined)
                );
            };

            const cleanedFresherData = removeUndefined(fresherData);

            const response = await fetch('https://addfresher-w7bmdisz2q-uc.a.run.app/addFresher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...cleanedFresherData, password }), // Pass the generated password
            });

            const result = await response.json();

            if (result.success) {
                return { success: true, email: fresherData.email, password: result.password };
            } else {
                return { success: false, error: result.error || 'Unknown error' };
            }
        } catch (error) {
            console.error('Error in addFresherWithDepartmentAssignment:', error);
            return { success: false, error: error.message };
        }
    },

    async createDepartment(departmentData) {
        try {
            const departmentsRef = collection(db, 'departments');
            await addDoc(departmentsRef, {
                ...departmentData,
                memberCount: 0, // Initialize to 0, but UI will use actual count of freshers
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error creating department:', error);
            throw error;
        }
    },

    async assignFresherToDepartment(fresherId, departmentId) {
        try {
            const fresherRef = doc(db, 'users', fresherId);
            const departmentRef = doc(db, 'departments', departmentId);
            
            // Get current department data
            const departmentDoc = await getDoc(departmentRef);
            if (!departmentDoc.exists()) {
                throw new Error('Department not found');
            }
            
            const batch = writeBatch(db);
            
            // Update fresher document
            batch.update(fresherRef, { 
                departmentId: departmentId,
                updatedAt: new Date()
            });
            
            // Update department member count
            // Note: We're still updating memberCount in the database for backward compatibility,
            // but the UI will use the actual count of freshers in each department
            batch.update(departmentRef, { 
                memberCount: (departmentDoc.data().memberCount || 0) + 1,
                updatedAt: new Date()
            });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error assigning fresher to department:', error);
            throw error;
        }
    },

    async removeFresherFromDepartment(fresherId, departmentId) {
        try {
            const fresherRef = doc(db, 'users', fresherId);
            const departmentRef = doc(db, 'departments', departmentId);
            
            // Get current department data
            const departmentDoc = await getDoc(departmentRef);
            if (!departmentDoc.exists()) {
                throw new Error('Department not found');
            }
            
            const batch = writeBatch(db);
            
            // Update fresher document - remove departmentId
            batch.update(fresherRef, { 
                departmentId: null,
                updatedAt: new Date()
            });
            
            // Update department member count (ensure it doesn't go below 0)
            // Note: We're still updating memberCount in the database for backward compatibility,
            // but the UI will use the actual count of freshers in each department
            const currentCount = departmentDoc.data().memberCount || 0;
            batch.update(departmentRef, { 
                memberCount: Math.max(0, currentCount - 1),
                updatedAt: new Date()
            });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error removing fresher from department:', error);
            throw error;
        }
    }
};

export default courseService;