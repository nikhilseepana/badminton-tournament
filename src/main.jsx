import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';
import 'antd/dist/reset.css';
import App from './App.jsx';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { TournamentsProvider } from './context/TournamentsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#334155',
            borderRadius: 14,
            fontFamily: "'Nunito Sans', 'Avenir Next', 'SF Pro Display', 'Segoe UI', sans-serif",
            fontSize: 14,
            colorBgContainer: '#ffffff',
            colorText: '#1f2937',
          },
        }}
      >
        <TournamentsProvider>
          <App />
        </TournamentsProvider>
      </ConfigProvider>
    </HashRouter>
  </React.StrictMode>
);
