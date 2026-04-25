import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layout';
import Dashboard from './pages/Dashboard';
import Hero from './pages/Hero';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Wrap everything in the Layout */}
        <Route path="/" element={<Layout />}>
          
          {/* 2. Define the individual pages */}
          <Route index element={<Hero />} /> {/* The default page */}
          <Route path="dashboard" element={<Dashboard />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;