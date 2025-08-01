import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc, 
    addDoc,
    query,
    where,
    serverTimestamp 
} from 'firebase/firestore';
import { 
    BookOpen, 
    Play, 
    CheckCircle, 
    Clock, 
    Award, 
    FileText,
    BarChart3,
    Target,
    Star,
    Heart,
    Users,
    Calendar
} from 'lucide-react';
import '../../Style/FresherLearning.css';

const FresherLearning = () => {
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [progress, setProgress] = useState({});
    const [activeFilter, setActiveFilter] = useState('All Courses');
    const [fresherData, setFresherData] = useState(null);

    useEffect(() => {
        if (auth.currentUser) {
            fetchUserData();
        }
    }, []);

    const fetchUserData = async () => {
        try {
            const userId = auth.currentUser.uid;
            
            // Fetch user data
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();
            setFresherData(userData);
            
            const enrolledCourseIds = userData?.enrolledCourses || [];
            
            // Fetch all courses
            const coursesSnapshot = await getDocs(collection(db, 'courses'));
            const allCourses = coursesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Add sample courses if none exist
            const sampleCourses = [
                {
                    id: 'web-dev-2024',
                    title: 'Complete Web Development Bootcamp 2024',
                    description: 'Learn HTML, CSS, JavaScript, React, Node.js, MongoDB and more!',
                    instructor: 'Sarah Johnson',
                    instructorTitle: 'Full Stack Developer & Instructor',
                    rating: 4.7,
                    reviews: 15420,
                    duration: '42.5 hours',
                    lectures: 385,
                    level: 'All Levels',
                    price: 89.99,
                    originalPrice: 199.99,
                    discount: '55% off',
                    category: 'Technical',
                    difficulty: 'Beginner',
                    image: 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                    id: 'data-science-ml',
                    title: 'Data Science & Machine Learning Masterclass',
                    description: 'Master Python, NumPy, Pandas, Scikit-learn, TensorFlow and more!',
                    instructor: 'Dr. Michael Chen',
                    instructorTitle: 'Senior Data Scientist at Google',
                    rating: 4.8,
                    reviews: 8920,
                    duration: '58.5 hours',
                    lectures: 425,
                    level: 'Intermediate',
                    price: 129.99,
                    originalPrice: 299.99,
                    discount: '57% off',
                    category: 'Technical',
                    difficulty: 'Intermediate',
                    image: 'https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                    id: 'digital-marketing',
                    title: 'Digital Marketing & Social Media Strategy',
                    description: 'Learn SEO, SEM, Social Media Marketing, Email Marketing and more!',
                    instructor: 'Emma Rodriguez',
                    instructorTitle: 'Digital Marketing Expert & Consultant',
                    rating: 4.6,
                    reviews: 6230,
                    duration: '28.5 hours',
                    lectures: 245,
                    level: 'Beginner',
                    price: 69.99,
                    originalPrice: 149.99,
                    discount: '53% off',
                    category: 'Business',
                    difficulty: 'Beginner',
                    image: 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg?auto=compress&cs=tinysrgb&w=400'
                }
            ];
            
            const coursesToUse = allCourses.length > 0 ? allCourses : sampleCourses;
            
            // Separate enrolled and available courses
            const enrolled = coursesToUse.filter(course => enrolledCourseIds.includes(course.id));
            const available = coursesToUse.filter(course => !enrolledCourseIds.includes(course.id));
            
            setEnrolledCourses(enrolled);
            setAvailableCourses(coursesToUse);
            
            // Fetch user progress
            const progressQuery = query(
                collection(db, 'userProgress'),
                where('userId', '==', userId)
            );
            const progressSnapshot = await getDocs(progressQuery);
            const progressData = {};
            progressSnapshot.docs.forEach(doc => {
                const data = doc.data();
                progressData[data.courseId] = data;
            });
            
            // Add sample progress data
            const sampleProgress = {
                'web-dev-2024': { overallProgress: 75 },
                'data-science-ml': { overallProgress: 45 },
                'digital-marketing': { overallProgress: 20 }
            };
            
            setProgress({ ...progressData, ...sampleProgress });
            
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const enrollInCourse = async (courseId) => {
        try {
            const userId = auth.currentUser.uid;
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            const currentEnrolled = userDoc.data()?.enrolledCourses || [];
            
            await updateDoc(userRef, {
                enrolledCourses: [...currentEnrolled, courseId]
            });
            
            // Create initial progress record
            await addDoc(collection(db, 'userProgress'), {
                userId,
                courseId,
                completedModules: [],
                overallProgress: 0,
                startedAt: serverTimestamp(),
                lastAccessedAt: serverTimestamp()
            });
            
            fetchUserData();
        } catch (error) {
            console.error('Error enrolling in course:', error);
        }
    };

    const getFilteredCourses = () => {
        switch (activeFilter) {
            case 'In Progress':
                return availableCourses.filter(course => 
                    progress[course.id] && progress[course.id].overallProgress > 0 && progress[course.id].overallProgress < 100
                );
            case 'Completed':
                return availableCourses.filter(course => 
                    progress[course.id] && progress[course.id].overallProgress === 100
                );
            case 'Wishlist':
                return []; // Implement wishlist functionality
            default:
                return availableCourses;
        }
    };

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star 
                key={i} 
                size={14} 
                className={i < Math.floor(rating) ? 'star-filled' : 'star-empty'}
                fill={i < Math.floor(rating) ? '#fbbf24' : 'none'}
            />
        ));
    };

    return (
        <div className="learning-container">
            <div className="learning-header">
                <div className="header-content">
                    <h1>My Learning</h1>
                    <div className="user-info">
                        <span>{fresherData?.name || 'Fresher'} ▼</span>
                    </div>
                </div>
                <div className="learning-subtitle">
                    <h2>My Learning</h2>
                    <p>Continue where you left off</p>
                </div>
            </div>

            <div className="filter-tabs">
                {['All Courses', 'In Progress', 'Completed', 'Wishlist'].map(filter => (
                    <button
                        key={filter}
                        className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            <div className="courses-grid">
                {getFilteredCourses().map(course => (
                    <div key={course.id} className="course-card">
                        <div className="course-image">
                            <img src={course.image} alt={course.title} />
                            {progress[course.id] && (
                                <div className="progress-circle">
                                    <span>{progress[course.id].overallProgress}%</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="course-content">
                            <h3 className="course-title">{course.title}</h3>
                            <p className="course-description">{course.description}</p>
                            
                            <div className="instructor-info">
                                <div className="instructor-avatar">
                                    <Users size={16} />
                                </div>
                                <div className="instructor-details">
                                    <span className="instructor-name">{course.instructor}</span>
                                    <span className="instructor-title">{course.instructorTitle}</span>
                                </div>
                            </div>
                            
                            <div className="course-rating">
                                <div className="stars">
                                    {renderStars(course.rating)}
                                </div>
                                <span className="rating-number">{course.rating}</span>
                                <span className="review-count">({course.reviews.toLocaleString()})</span>
                            </div>
                            
                            <div className="course-meta">
                                <span className="duration">
                                    <Clock size={14} />
                                    {course.duration}
                                </span>
                                <span className="lectures">
                                    <FileText size={14} />
                                    {course.lectures} lectures
                                </span>
                                <span className="level">{course.level}</span>
                            </div>
                            
                            <div className="course-footer">
                                <div className="pricing">
                                    <span className="current-price">${course.price}</span>
                                    <span className="original-price">${course.originalPrice}</span>
                                    <span className="discount">{course.discount}</span>
                                </div>
                                
                                <div className="course-actions">
                                    {progress[course.id] ? (
                                        <button className="continue-btn">
                                            Continue Learning
                                        </button>
                                    ) : (
                                        <button 
                                            className="enroll-btn"
                                            onClick={() => enrollInCourse(course.id)}
                                        >
                                            Enroll Now
                                        </button>
                                    )}
                                    <button className="wishlist-btn">
                                        <Heart size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FresherLearning;