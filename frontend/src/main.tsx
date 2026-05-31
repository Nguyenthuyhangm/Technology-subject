import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { WishlistProvider } from './context/WishlistProvider';
import { monitor } from './util/monitoring';

monitor.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
    // Bỏ thẻ <React.StrictMode> đi
    <WishlistProvider>
      <App />
    </WishlistProvider>
);