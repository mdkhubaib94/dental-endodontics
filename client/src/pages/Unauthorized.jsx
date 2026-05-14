// pages/Unauthorized.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Unauthorized.css';

const Unauthorized = () => {
    const navigate = useNavigate();

    const handleGoToLogin = () => {
        navigate('/login');
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="unauth-container">
            <div className="unauth-content">
                <div className="unauth-error-icon">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#dc3545" strokeWidth="2" />
                        <path d="M15 9l-6 6" stroke="#dc3545" strokeWidth="2" />
                        <path d="M9 9l6 6" stroke="#dc3545" strokeWidth="2" />
                    </svg>
                </div>

                <h1 className="unauth-title">403 - Access Denied</h1>

                <div className="unauth-message">
                    <h2>Unauthorized Access Attempt</h2>
                    <p>You don't have permission to access this resource. This could be because:</p>
                    <ul className="unauth-reason-list">
                        <li>Your session has expired</li>
                        <li>You don't have the required permissions</li>
                        <li>Your account has been suspended</li>
                        <li>You're trying to access a restricted area</li>
                    </ul>
                </div>

                <div className="unauth-security-notice">
                    <div className="unauth-security-icon">🔒</div>
                    <p>For security reasons, your session data has been cleared.</p>
                    <small>Please log in again to continue.</small>
                </div>

                <div className="unauth-action-buttons">
                    <button
                        className="unauth-btn unauth-btn-primary"
                        onClick={handleGoToLogin}
                    >
                        Go to Login
                    </button>
                    <button
                        className="unauth-btn unauth-btn-secondary"
                        onClick={handleGoHome}
                    >
                        Back to Home
                    </button>
                </div>

                <div className="unauth-help-text">
                    <p>If you believe this is an error, please contact the system administrator.</p>
                    <div className="unauth-contact-info">
                        <small>Email: admin@yourmedical.com | Phone: +91-XXXX-XXXX</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;