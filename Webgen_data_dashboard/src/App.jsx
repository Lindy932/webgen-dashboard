import React from 'react';
import {Header, Footer, Dashboard} from './components';
import Navbar from './components/Navbar/Navbar';


const App = () => {
  return <div>
    <video src="/assets/background.mp4" className="vid-bg" autoPlay loop muted></video>
    <Header />
    <Footer />
  </div>
}

export default App