import { db } from '../firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';

// Chatbot Service for advanced functionality
export const chatbotService = {
    // Get user's course information for contextual responses
    async getUserCourses(userId) {
        try {
            const coursesRef = collection(db, 'users', userId, 'courses');
            const snapshot = await getDocs(coursesRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching user courses:', error);
            return [];
        }
    },

    // Get user's progress data
    async getUserProgress(userId) {
        try {
            const progressRef = collection(db, 'users', userId, 'progress');
            const snapshot = await getDocs(progressRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching user progress:', error);
            return [];
        }
    },

    // Get user's department information
    async getUserDepartment(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.departmentId) {
                    const deptDoc = await getDoc(doc(db, 'departments', userData.departmentId));
                    if (deptDoc.exists()) {
                        return { id: deptDoc.id, ...deptDoc.data() };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching user department:', error);
            return null;
        }
    },

    // Generate contextual response based on user data
    async generateContextualResponse(userId, userMessage) {
        try {
            const [courses, progress, department] = await Promise.all([
                this.getUserCourses(userId),
                this.getUserProgress(userId),
                this.getUserDepartment(userId)
            ]);

            const lowerMessage = userMessage.toLowerCase();
            
            // Course-specific responses
            if (lowerMessage.includes('course') || lowerMessage.includes('lesson') || lowerMessage.includes('module')) {
                if (courses.length === 0) {
                    return "You don't have any courses assigned yet. Please contact your administrator to get started with your learning journey!";
                }
                
                const activeCourses = courses.filter(course => course.status === 'active');
                const completedCourses = courses.filter(course => course.status === 'completed');
                
                if (lowerMessage.includes('progress') || lowerMessage.includes('how much')) {
                    const totalProgress = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
                    const avgProgress = Math.round(totalProgress / courses.length);
                    
                    return `You have ${courses.length} courses total. ${activeCourses.length} are active and ${completedCourses.length} are completed. Your average progress across all courses is ${avgProgress}%. Keep up the great work!`;
                }
                
                if (lowerMessage.includes('active') || lowerMessage.includes('current')) {
                    if (activeCourses.length === 0) {
                        return "You don't have any active courses at the moment. All your courses are either completed or paused.";
                    }
                    
                    const courseList = activeCourses.map(course => 
                        `• ${course.title} (${course.progress || 0}% complete)`
                    ).join('\n');
                    
                    return `Here are your active courses:\n${courseList}\n\nYou can continue learning in the "My Courses" section!`;
                }
                
                return `You have ${courses.length} courses assigned. ${activeCourses.length} are currently active. You can view all your courses in the "My Courses" tab and track your progress there.`;
            }

            // Assignment-specific responses
            if (lowerMessage.includes('assignment') || lowerMessage.includes('homework') || lowerMessage.includes('task')) {
                const pendingAssignments = courses.filter(course => 
                    course.status === 'active' && (course.progress || 0) < 100
                ).length;
                
                if (pendingAssignments === 0) {
                    return "Great news! You don't have any pending assignments. All your active courses are up to date.";
                }
                
                return `You have ${pendingAssignments} courses with pending work. Check your "My Courses" section to see which lessons need to be completed. Remember to mark lessons as complete as you finish them!`;
            }

            // Progress-specific responses
            if (lowerMessage.includes('progress') || lowerMessage.includes('performance') || lowerMessage.includes('how am i doing')) {
                if (progress.length === 0) {
                    return "I don't have enough data to show your progress yet. Start completing lessons and I'll be able to track your learning journey!";
                }
                
                const recentProgress = progress.slice(-7); // Last 7 days
                const avgDailyProgress = recentProgress.reduce((sum, p) => sum + (p.progress || 0), 0) / recentProgress.length;
                
                return `Based on your recent activity, your average daily progress is ${Math.round(avgDailyProgress)}%. You're making great progress! Keep up the consistent learning.`;
            }

            // Department-specific responses
            if (department && (lowerMessage.includes('department') || lowerMessage.includes('team'))) {
                return `You're part of the ${department.name} department. ${department.description || 'This department focuses on specialized training and development.'}`;
            }

            // General help
            if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
                return `I'm your learning assistant! I can help you with:\n\n📚 **Course Information**: Ask about your courses, progress, and assignments\n📊 **Progress Tracking**: Get updates on your learning performance\n🎯 **Learning Tips**: Receive guidance on effective learning strategies\n🔧 **Technical Support**: Help with platform issues\n\nJust ask me anything about your learning journey!`;
            }

            // Default response
            return "I'm here to help with your learning journey! You can ask me about your courses, progress, assignments, or any other learning-related questions. What would you like to know?";
            
        } catch (error) {
            console.error('Error generating contextual response:', error);
            return "I'm having trouble accessing your information right now. Please try again in a moment, or contact support if the issue persists.";
        }
    },

    // Save chat message to Firebase
    async saveMessage(userId, messageData) {
        try {
            await addDoc(collection(db, 'users', userId, 'chatbot'), {
                ...messageData,
                timestamp: serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    },

    // Get chat history
    async getChatHistory(userId, limit = 50) {
        try {
            const q = query(
                collection(db, 'users', userId, 'chatbot'),
                orderBy('timestamp', 'desc'),
                limit(limit)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate()
            })).reverse();
        } catch (error) {
            console.error('Error fetching chat history:', error);
            return [];
        }
    },

    // Get chatbot analytics
    async getChatbotAnalytics(userId) {
        try {
            const messages = await this.getChatHistory(userId, 100);
            const userMessages = messages.filter(msg => msg.sender === 'user');
            const botMessages = messages.filter(msg => msg.sender === 'bot');
            
            // Analyze common topics
            const topics = {
                course: 0,
                assignment: 0,
                progress: 0,
                technical: 0,
                general: 0
            };
            
            userMessages.forEach(msg => {
                const text = msg.text.toLowerCase();
                if (text.includes('course') || text.includes('lesson') || text.includes('module')) {
                    topics.course++;
                } else if (text.includes('assignment') || text.includes('homework')) {
                    topics.assignment++;
                } else if (text.includes('progress') || text.includes('performance')) {
                    topics.progress++;
                } else if (text.includes('error') || text.includes('problem') || text.includes('issue')) {
                    topics.technical++;
                } else {
                    topics.general++;
                }
            });
            
            return {
                totalMessages: messages.length,
                userMessages: userMessages.length,
                botMessages: botMessages.length,
                topics,
                lastInteraction: messages.length > 0 ? messages[messages.length - 1].timestamp : null
            };
        } catch (error) {
            console.error('Error getting chatbot analytics:', error);
            return null;
        }
    },

    // Get learning tips based on user's progress
    async getLearningTips(userId) {
        try {
            const courses = await this.getUserCourses(userId);
            const progress = await this.getUserProgress(userId);
            
            const tips = [];
            
            if (courses.length === 0) {
                tips.push("Start by exploring your assigned courses in the 'My Courses' section.");
            } else {
                const activeCourses = courses.filter(course => course.status === 'active');
                const lowProgressCourses = activeCourses.filter(course => (course.progress || 0) < 30);
                
                if (lowProgressCourses.length > 0) {
                    tips.push(`Focus on completing one course at a time. You have ${lowProgressCourses.length} courses with low progress.`);
                }
                
                if (activeCourses.length > 3) {
                    tips.push("You have many active courses. Consider focusing on 2-3 courses at a time for better retention.");
                }
            }
            
            if (progress.length > 0) {
                const recentProgress = progress.slice(-7);
                const avgProgress = recentProgress.reduce((sum, p) => sum + (p.progress || 0), 0) / recentProgress.length;
                
                if (avgProgress < 20) {
                    tips.push("Try to spend at least 30 minutes daily on your courses for consistent progress.");
                } else if (avgProgress > 80) {
                    tips.push("Excellent progress! Keep up the great work and consider helping others in your department.");
                }
            }
            
            if (tips.length === 0) {
                tips.push("Maintain a consistent learning schedule and take regular breaks to improve retention.");
            }
            
            return tips;
        } catch (error) {
            console.error('Error getting learning tips:', error);
            return ["Keep learning consistently and don't hesitate to ask questions!"];
        }
    }
}; 