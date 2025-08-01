import { db } from '../firebase';
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
    writeBatch
} from 'firebase/firestore';

// Course Service for Firebase operations
export const courseService = {
    // Add a new course for a specific fresher
    async addCourseForFresher(fresherId, courseData) {
        try {
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
        } catch (error) {
            console.error('Error adding course:', error);
            throw error;
        }
    },

    // Get all courses for a specific fresher
    async getCoursesForFresher(fresherId) {
        try {
            const coursesRef = collection(db, 'users', fresherId, 'courses');
            const q = query(coursesRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    },

    // Listen to courses for a fresher in real-time
    listenToCoursesForFresher(fresherId, callback) {
        const coursesRef = collection(db, 'users', fresherId, 'courses');
        const q = query(coursesRef, orderBy('createdAt', 'desc'));
        
        return onSnapshot(q, (snapshot) => {
            const courses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(courses);
        }, (error) => {
            console.error('Error listening to courses:', error);
            callback([]);
        });
    },

    // Update course status
    async updateCourseStatus(fresherId, courseId, status) {
        try {
            const courseRef = doc(db, 'users', fresherId, 'courses', courseId);
            await updateDoc(courseRef, {
                status,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating course status:', error);
            throw error;
        }
    },

    // Update lesson completion status
    async updateLessonCompletion(fresherId, courseId, moduleId, lessonId, completed) {
        try {
            const courseRef = doc(db, 'users', fresherId, 'courses', courseId);
            
            // Get current course data
            const courseDoc = await getDocs(query(collection(db, 'users', fresherId, 'courses'), where('__name__', '==', courseId)));
            const courseData = courseDoc.docs[0]?.data();
            
            if (!courseData) {
                throw new Error('Course not found');
            }

            // Update the specific lesson
            const updatedModules = courseData.modules.map(module => {
                if (module.id === moduleId) {
                    const updatedLessons = module.lessons.map(lesson => {
                        if (lesson.id === lessonId) {
                            return { ...lesson, completed };
                        }
                        return lesson;
                    });
                    return { ...module, lessons: updatedLessons };
                }
                return module;
            });

            await updateDoc(courseRef, {
                modules: updatedModules,
                updatedAt: new Date()
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating lesson completion:', error);
            throw error;
        }
    },

    // Delete a course
    async deleteCourse(fresherId, courseId) {
        try {
            const courseRef = doc(db, 'users', fresherId, 'courses', courseId);
            await deleteDoc(courseRef);
            return { success: true };
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    },

    // Get all freshers
    async getAllFreshers() {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'fresher'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching freshers:', error);
            throw error;
        }
    },

    // Department Management Functions
    // Create a new department
    async createDepartment(departmentData) {
        try {
            const departmentRef = collection(db, 'departments');
            const docRef = await addDoc(departmentRef, {
                ...departmentData,
                createdAt: new Date(),
                updatedAt: new Date(),
                memberCount: 0
            });
            return { success: true, departmentId: docRef.id };
        } catch (error) {
            console.error('Error creating department:', error);
            throw error;
        }
    },

    // Get all departments
    async getAllDepartments() {
        try {
            const departmentsRef = collection(db, 'departments');
            const q = query(departmentsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching departments:', error);
            throw error;
        }
    },

    // Get freshers by department
    async getFreshersByDepartment(departmentId) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'fresher'), where('departmentId', '==', departmentId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching freshers by department:', error);
            throw error;
        }
    },

    // Assign fresher to department
    async assignFresherToDepartment(fresherId, departmentId) {
        try {
            const userRef = doc(db, 'users', fresherId);
            await updateDoc(userRef, {
                departmentId,
                updatedAt: new Date()
            });

            // Update department member count
            const departmentRef = doc(db, 'departments', departmentId);
            const departmentDoc = await getDocs(query(collection(db, 'departments'), where('__name__', '==', departmentId)));
            const currentMemberCount = departmentDoc.docs[0]?.data()?.memberCount || 0;
            
            await updateDoc(departmentRef, {
                memberCount: currentMemberCount + 1,
                updatedAt: new Date()
            });

            return { success: true };
        } catch (error) {
            console.error('Error assigning fresher to department:', error);
            throw error;
        }
    },

    // Remove fresher from department
    async removeFresherFromDepartment(fresherId, departmentId) {
        try {
            const userRef = doc(db, 'users', fresherId);
            await updateDoc(userRef, {
                departmentId: null,
                updatedAt: new Date()
            });

            // Update department member count
            const departmentRef = doc(db, 'departments', departmentId);
            const departmentDoc = await getDocs(query(collection(db, 'departments'), where('__name__', '==', departmentId)));
            const currentMemberCount = departmentDoc.docs[0]?.data()?.memberCount || 0;
            
            await updateDoc(departmentRef, {
                memberCount: Math.max(0, currentMemberCount - 1),
                updatedAt: new Date()
            });

            return { success: true };
        } catch (error) {
            console.error('Error removing fresher from department:', error);
            throw error;
        }
    },

    // Bulk assign courses to department
    async bulkAddCoursesToDepartment(departmentId, courseData) {
        try {
            // Get all freshers in the department
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
        } catch (error) {
            console.error('Error bulk adding courses to department:', error);
            throw error;
        }
    },

    // Calculate course progress
    calculateCourseProgress(course) {
        if (!course.modules || course.modules.length === 0) return 0;
        
        let totalLessons = 0;
        let completedLessons = 0;
        
        course.modules.forEach(module => {
            if (module.lessons) {
                totalLessons += module.lessons.length;
                completedLessons += module.lessons.filter(lesson => lesson.completed).length;
            }
        });
        
        return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    },

    // Calculate module progress
    calculateModuleProgress(module) {
        if (!module.lessons || module.lessons.length === 0) return 0;
        
        const completedLessons = module.lessons.filter(lesson => lesson.completed).length;
        return Math.round((completedLessons / module.lessons.length) * 100);
    },

    // Bulk add courses to multiple freshers
    async bulkAddCoursesToFreshers(fresherIds, courseData) {
        try {
            const batch = writeBatch(db);
            
            fresherIds.forEach(fresherId => {
                const courseRef = doc(collection(db, 'users', fresherId, 'courses'));
                batch.set(courseRef, {
                    ...courseData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: 'active',
                    progress: 0,
                    enrolledAt: new Date()
                });
            });
            
            await batch.commit();
            return { success: true };
        } catch (error) {
            console.error('Error bulk adding courses:', error);
            throw error;
        }
    },

    // Get course statistics
    async getCourseStatistics() {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'fresher'));
            const snapshot = await getDocs(q);
            
            let totalCourses = 0;
            let activeCourses = 0;
            let completedCourses = 0;
            let totalProgress = 0;
            let userCount = 0;
            
            for (const userDoc of snapshot.docs) {
                const coursesRef = collection(db, 'users', userDoc.id, 'courses');
                const coursesSnapshot = await getDocs(coursesRef);
                
                coursesSnapshot.docs.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    totalCourses++;
                    
                    if (courseData.status === 'active') {
                        activeCourses++;
                    } else if (courseData.status === 'completed') {
                        completedCourses++;
                    }
                    
                    totalProgress += courseData.progress || 0;
                });
                
                if (coursesSnapshot.docs.length > 0) {
                    userCount++;
                }
            }
            
            return {
                totalCourses,
                activeCourses,
                completedCourses,
                averageProgress: userCount > 0 ? Math.round(totalProgress / userCount) : 0,
                userCount
            };
        } catch (error) {
            console.error('Error getting course statistics:', error);
            throw error;
        }
    }
};

export default courseService; 