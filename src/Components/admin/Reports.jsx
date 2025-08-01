import React from 'react';
import '../../Style/Repots.css';

const Reports = () => {
    return (
        <div className="report-section">
            <h2 className="report-title"> Generate Reports</h2>
            <div className="report-controls">
                <select className="report-dropdown">
                    <option>Department-wise</option>
                    <option>Individual</option>
                </select>
                <button className="download-btn">⬇️ Download Report</button>
            </div>
        </div>
    );
};

export default Reports;
