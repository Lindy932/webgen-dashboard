import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* Video Background */}
      <video className="dashboard-video" autoPlay muted loop>
        <source src="/assets/background.mp4" type="video/mp4" />
      </video>

      {/* Content Section */}
      <div className="content-box">
        <h2>Dashboard Content</h2>
      </div>

      {/* Image Section */}
      <div className="image-box">
        <img src="/assets/bodyparts.png" alt="Anatomical Heatmap" className="dashboard-image" />
      </div>
    </div>
  );
};

export default Dashboard;
