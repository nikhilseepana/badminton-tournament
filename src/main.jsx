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
            colorPrimary: '#2563eb',
            borderRadius: 14,
            fontFamily: "'SF Pro Display', 'Avenir Next', 'Segoe UI', sans-serif",
            fontSize: 14,
            colorBgContainer: '#ffffff',
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
