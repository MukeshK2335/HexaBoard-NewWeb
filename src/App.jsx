import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSwitcherLogin from './Components/Auth/RoleSwitcherLogin.jsx';
import AdminDashboard from './Components/admin/AdminDashboard.jsx';
import FresherDashboard from './Components/fresher/FresherDashboard.jsx';
import ProtectedRoute from './Components/ProtectedRoute.jsx';
import LandingPage from './Components/LandingPage.jsx';
import ViewFresherDashboard from './Components/fresher/ViewFresherDashboard.jsx'; // 👈 NEW component
import FresherLearning from './Components/fresher/FresherLearning.jsx';
import CourseDetailView from './Components/fresher/CourseDetailView.jsx';
import FresherCoursePlayer from './Components/fresher/FresherCoursePlayer.jsx';
import MyCourses from './Components/fresher/MyCourses.jsx';
import AssessmentPage from './Components/assessments/AssessmentPage.jsx';
import DailyQuiz from './Components/fresher/DailyQuiz.jsx';
import CodeChallenge from './Components/fresher/CodeChallenge.jsx';
import './App.css';

function App() {
    return (
        <Router>
            <Routes>

                {/* ✅ Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* ✅ Role Switcher Login */}
                <Route path="/login" element={
                    <div className="outer-box">
                        <div className="inner-wrapper">
                            <RoleSwitcherLogin />
                        </div>
                    </div>
                } />

                {/* ✅ Admin Dashboard (Protected) */}
                <Route path="/admin" element={
                    <ProtectedRoute>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* ✅ Fresher Dashboard (Logged-in Fresher only) */}
                <Route path="/fresher" element={
                    <ProtectedRoute>
                        <FresherDashboard />
                    </ProtectedRoute>
                } />

                {/* ✅ Individual Fresher Dashboard (Admin viewing specific fresher by ID) */}
                <Route path="/admin/fresher/:id" element={
                    <ProtectedRoute>
                        <ViewFresherDashboard />
                    </ProtectedRoute>
                } />

                {/* Fresher Learning Page */}
                <Route path="/fresher/learning" element={
                    <ProtectedRoute>
                        <FresherLearning />
                    </ProtectedRoute>
                } />

                {/* Course Detail View for Freshers */}
                <Route path="/fresher/learning/:courseId" element={
                    <ProtectedRoute>
                        <CourseDetailView />
                    </ProtectedRoute>
                } />

                {/* New Fresher Course Player Route */}
                <Route path="/fresher/course/:courseId" element={
                    <ProtectedRoute>
                        <FresherCoursePlayer />
                    </ProtectedRoute>
                } />

                {/* My Courses Page for Freshers */}
                <Route path="/fresher/my-courses" element={
                    <ProtectedRoute>
                        <MyCourses />
                    </ProtectedRoute>
                } />

                {/* Assessment Page */}
                <Route path="/take-assessment/:assessmentId" element={
                    <ProtectedRoute>
                        <AssessmentPage />
                    </ProtectedRoute>
                } />
                
                {/* Daily Quiz Route */}
                <Route path="/fresher/daily-quiz" element={
                    <ProtectedRoute>
                        <DailyQuiz />
                    </ProtectedRoute>
                } />

                {/* Coding Challenge Route */}
                <Route path="/fresher/code-challenge" element={
                    <ProtectedRoute>
                        <CodeChallenge />
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
