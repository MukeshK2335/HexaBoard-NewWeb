import React from 'react';
import '../../Style/AgentStatus.css';

const AgentStatus = () => {
    const agents = [
        { name: 'Onboarding Agent', queue: 3, latency: '120ms', errors: 0 },
        { name: 'Assessment Agent', queue: 1, latency: '80ms', errors: 1 },
        { name: 'Profile Agent', queue: 0, latency: '50ms', errors: 0 },
    ];

    return (
        <div className="agent-section">
            <h2 className="agent-title"> Agentic Framework Status</h2>
            <div className="agent-table-wrapper">
                <table className="agent-table">
                    <thead>
                    <tr>
                        <th>Agent</th>
                        <th>Queue</th>
                        <th>Latency</th>
                        <th>Errors</th>
                    </tr>
                    </thead>
                    <tbody>
                    {agents.map((a, i) => (
                        <tr key={i}>
                            <td>{a.name}</td>
                            <td>{a.queue}</td>
                            <td>{a.latency}</td>
                            <td className={a.errors > 0 ? 'error-cell' : ''}>{a.errors}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AgentStatus;
