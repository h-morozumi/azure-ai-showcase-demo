import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopPage } from './pages/TopPage';
import { SpeechAvatarDemoPage } from './pages/SpeechAvatarDemoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/speech-avatar-demo" element={<SpeechAvatarDemoPage />} />
        <Route path="*" element={<TopPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
