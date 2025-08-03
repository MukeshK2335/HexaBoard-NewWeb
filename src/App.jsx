import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSwitcherLogin from './Components/Auth/RoleSwitcherLogin.jsx';
import AdminDashboard from './Components/admin/AdminDashboard.jsx';
import FresherDashboard from './Components/fresher/FresherDashboard.jsx';
import ProtectedRoute from './Components/ProtectedRoute.jsx';
import LandingPage from './Components/LandingPage.jsx';
import ViewFresherDashboard from './Components/fresher/ViewFresherDashboard.jsx'; // 👈 NEW component
import FresherLearning from './Components/fresher/FresherLearning.jsx';
import CourseDetailView from './Components/fresher/CourseDetailView.jsx';
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

                {/* ✅ Individual Fresher Dashboard (Admin viewing specific fresher by email) */}
                <Route path="/fresher/:email" element={
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

            </Routes>
        </Router>
    );
}

export default App;
