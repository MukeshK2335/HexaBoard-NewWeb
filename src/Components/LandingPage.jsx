import '../Style/LandingPage.css';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png'; // replace with actual path

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="landing-container">

            <div className="logo-container">
                <img src={logo} alt="HexaBoard Logo" className="logo-img" />
                <span className="logo-text">exaBoard</span>
            </div>

            <section className="landing-hero">
                <h1>Welcome to HexaBoard</h1>
                <p>Your smart training dashboard for Maverick onboarding.</p>
                <button className="login-btn" onClick={() => navigate('/login')}>
                    Login
                </button>
            </section>

            <section className="features-section">
                <h2>Key Features</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <h3>Agentic Framework</h3>
                        <p>Monitor real-time queue and AI training workflows seamlessly.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Fresher Filtering</h3>
                        <p>Filter by skill, department & performance instantly.</p>
                    </div>
                    <div className="feature-card">
                        <h3>Progress Reports</h3>
                        <p>Generate CSV reports for performance and logs.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
