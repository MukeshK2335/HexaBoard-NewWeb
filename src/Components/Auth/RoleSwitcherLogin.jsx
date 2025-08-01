import React, { useState } from 'react';
import { auth, db } from '../../firebase';
import {
    signInWithEmailAndPassword
} from 'firebase/auth';
import {
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../Style/RoleSwitcherLogin.css';

const RoleSwitcherLogin = () => {
    const [role, setRole] = useState('fresher');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const getUserIP = async () => {
        try {
            const res = await fetch('https://api64.ipify.org?format=json');
            const data = await res.json();
            return data.ip || 'Unknown';
        } catch (err) {
            console.error('IP fetch error:', err);
            return 'Unknown';
        }
    };

    const logLoginEvent = async (uid, role) => {
        const ip = await getUserIP();
        await addDoc(collection(db, 'loginLogs'), {
            uid,
            role,
            ip,
            timestamp: serverTimestamp(),
        });
    };

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('Please enter email and password.');
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                setError('User not registered in Firestore.');
                return;
            }

            const userRole = userDoc.data().role;
            if (!userRole) {
                setError('No role assigned. Contact admin.');
                return;
            }

            if (userRole !== role) {
                setError(`This account is not a ${role}.`);
                return;
            }

            await logLoginEvent(uid, userRole); // 🔥 Logs login info

            navigate(`/${userRole}`);
        } catch (err) {
            const code = err.code;
            if (code === 'auth/user-not-found') setError('User not found.');
            else if (code === 'auth/wrong-password') setError('Wrong password.');
            else if (code === 'auth/invalid-email') setError('Invalid email.');
            else setError('Login failed: ' + err.message);
        }
    };

    return (
        <div className="login-container">
            <h1 className="login-heading">HexaBoard Login</h1>

            <div className="tabs">
                <button
                    className={role === 'fresher' ? 'active' : ''}
                    onClick={() => setRole('fresher')}
                >
                    Fresher
                </button>
                <button
                    className={role === 'admin' ? 'active' : ''}
                    onClick={() => setRole('admin')}
                >
                    Admin
                </button>
            </div>

            <div className="form">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button onClick={handleLogin}>Login</button>
                {error && <p className="error">{error}</p>}
            </div>
        </div>
    );
};

export default RoleSwitcherLogin;
