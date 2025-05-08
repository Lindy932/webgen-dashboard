import React from 'react'
import "./Navbar.css";

const Navbar = () => {
  return (
  <div className= "navbar-content">
    <div className="navbar-left">
      <img src="/assets/logo.png" alt="Logo" className="header-logo" />
    </div>
    
    <div className="navbar-right">
      <img src="/assets/menu.png" alt="menubtn" className="header-btn"/>
    </div>
    </div>
  )
}

export default Navbar