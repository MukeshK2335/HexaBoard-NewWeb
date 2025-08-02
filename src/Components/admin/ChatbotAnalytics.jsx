import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { chatbotService } from '../../services/chatbotService';
import '../../Style/ChatbotAnalytics.css';

const ChatbotAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [userAnalytics, setUserAnalytics] = useState(null);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    useEffect(() => {
        loadAnalytics();
        loadUsers();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            
            // Get all users with chatbot interactions
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            const allUsers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            let totalMessages = 0;
            let totalUsers = 0;
            let topicStats = {
                course: 0,
                assignment: 0,
                progress: 0,
                technical: 0,
                general: 0
            };

            // Get analytics for each user
            for (const user of allUsers) {
                if (user.role === 'fresher') {
                    const userAnalytics = await chatbotService.getChatbotAnalytics(user.id);
                    if (userAnalytics && userAnalytics.totalMessages > 0) {
                        totalMessages += userAnalytics.totalMessages;
                        totalUsers++;
                        
                        // Aggregate topic statistics
                        Object.keys(topicStats).forEach(topic => {
                            topicStats[topic] += userAnalytics.topics[topic] || 0;
                        });
                    }
                }
            }

            setAnalytics({
                totalMessages,
                totalUsers,
                topicStats,
                averageMessagesPerUser: totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('role', '==', 'fresher'));
            const snapshot = await getDocs(q);
            const freshers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(freshers);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const loadUserAnalytics = async (userId) => {
        try {
            const userAnalytics = await chatbotService.getChatbotAnalytics(userId);
            setUserAnalytics(userAnalytics);
        } catch (error) {
            console.error('Error loading user analytics:', error);
        }
    };

    const handleUserSelect = (userId) => {
        setSelectedUser(userId);
        loadUserAnalytics(userId);
    };

    const formatTopicData = (topicStats) => {
        return Object.entries(topicStats).map(([topic, count]) => ({
            name: topic.charAt(0).toUpperCase() + topic.slice(1),
            value: count
        })).filter(item => item.value > 0);
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="loading">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h2>Chatbot Analytics</h2>
                <p>Monitor chatbot usage and user interactions</p>
            </div>

            {/* Overall Statistics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Messages</h3>
                    <p className="stat-number">{analytics?.totalMessages || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Users</h3>
                    <p className="stat-number">{analytics?.totalUsers || 0}</p>
                </div>
                <div className="stat-card">
                    <h3>Avg Messages/User</h3>
                    <p className="stat-number">{analytics?.averageMessagesPerUser || 0}</p>
                </div>
            </div>

            {/* Topic Distribution Chart */}
            <div className="chart-section">
                <h3>Topic Distribution</h3>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={formatTopicData(analytics?.topicStats || {})}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {formatTopicData(analytics?.topicStats || {}).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* User Selection */}
            <div className="user-section">
                <h3>Individual User Analytics</h3>
                <div className="user-selector">
                    <select 
                        value={selectedUser || ''} 
                        onChange={(e) => handleUserSelect(e.target.value)}
                    >
                        <option value="">Select a user</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name || user.email} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>

                {userAnalytics && (
                    <div className="user-analytics">
                        <div className="user-stats">
                            <div className="user-stat">
                                <span>Total Messages:</span>
                                <strong>{userAnalytics.totalMessages}</strong>
                            </div>
                            <div className="user-stat">
                                <span>User Messages:</span>
                                <strong>{userAnalytics.userMessages}</strong>
                            </div>
                            <div className="user-stat">
                                <span>Bot Responses:</span>
                                <strong>{userAnalytics.botMessages}</strong>
                            </div>
                            <div className="user-stat">
                                <span>Last Interaction:</span>
                                <strong>
                                    {userAnalytics.lastInteraction 
                                        ? new Date(userAnalytics.lastInteraction).toLocaleDateString()
                                        : 'Never'
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="user-topics">
                            <h4>Topic Breakdown</h4>
                            <div className="topic-bars">
                                {Object.entries(userAnalytics.topics).map(([topic, count]) => (
                                    <div key={topic} className="topic-bar">
                                        <span className="topic-name">{topic}</span>
                                        <div className="topic-bar-container">
                                            <div 
                                                className="topic-bar-fill"
                                                style={{ 
                                                    width: `${(count / userAnalytics.userMessages) * 100}%`,
                                                    backgroundColor: COLORS[Object.keys(userAnalytics.topics).indexOf(topic) % COLORS.length]
                                                }}
                                            ></div>
                                        </div>
                                        <span className="topic-count">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Learning Tips */}
            <div className="tips-section">
                <h3>Learning Tips for Users</h3>
                <div className="tips-grid">
                    {users.slice(0, 5).map(async (user) => {
                        const tips = await chatbotService.getLearningTips(user.id);
                        return (
                            <div key={user.id} className="tip-card">
                                <h4>{user.name || user.email}</h4>
                                <ul>
                                    {tips.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChatbotAnalytics; 