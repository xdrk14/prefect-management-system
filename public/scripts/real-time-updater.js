/**
 * Real-Time Update System for Prefect Management
 * Provides live updates across all connected clients using Server-Sent Events (SSE)
 * Prevents the need for manual page refreshes when other users make changes
 */

class RealTimeUpdateManager {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.updateQueue = [];
    this.lastUpdateTimestamp = Date.now();
    this.updateHandlers = new Map();
    this.userId = this.generateUserId();
    this.currentPage = this.detectCurrentPage();

    console.log('[FIRE] Initializing Real-Time Update Manager (Clean Edition)');
    this.init();
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('events.html') || path.includes('events')) return 'events';
    if (path.includes('dashboard.html') || path.includes('dashboard')) return 'dashboard';
    if (path.includes('accounts.html') || path.includes('accounts')) return 'accounts';
    if (path.includes('aquila.html')) return 'aquila';
    if (path.includes('cetus.html')) return 'cetus';
    if (path.includes('cygnus.html')) return 'cygnus';
    if (path.includes('ursa.html')) return 'ursa';
    if (path.includes('central.html')) return 'central';
    return 'main';
  }

  init() {
    this.connect();
    this.setupHeartbeat();
    this.setupVisibilityHandling();
    this.registerDefaultHandlers();
    this.createConnectionIndicator();
  }

  async connect() {
    if (this.eventSource) this.eventSource.close();

    try {
      console.log('[CONNECT] Establishing SSE link...');
      
      let tokenParam = '';
      const auth = window.firebaseAuth || window.firebase?.auth?.();
      if (auth?.currentUser) {
        const token = await auth.currentUser.getIdToken();
        tokenParam = `&token=${encodeURIComponent(token)}`;
      }

      const sseUrl = `/api/sse/updates?userId=${this.userId}&page=${this.currentPage}&ts=${Date.now()}${tokenParam}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('[SUCCESS] Live connection active');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected');
        this.lastUpdateTimestamp = Date.now();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'heartbeat') {
             this.lastUpdateTimestamp = Date.now();
             return;
          }
          this.processUpdate(data);
        } catch (e) {
          console.warn('[SSE] Parse error:', e.message);
        }
      };

      this.eventSource.onerror = (err) => {
        console.warn('[SSE] Connection error, backing off...');
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
        this.handleReconnect();
      };

    } catch (e) {
      console.error('[CRITICAL] SSE failure:', e);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('[SSE] Max retries reached');
      this.updateConnectionStatus('failed');
    }
  }

  processUpdate(update) {
    if (update.userId === this.userId) return; // Skip own updates

    console.log('[LIVE] Change detected:', update.type);
    this.updateQueue.push({ ...update, received: Date.now() });

    // Handle by type
    switch (update.type) {
      case 'prefect-created':
      case 'prefect-updated':
      case 'prefect-deleted':
        this.handlePrefectUpdate(update);
        break;
      case 'event-created':
      case 'event-updated':
      case 'event-deleted':
        this.handleEventUpdate(update);
        break;
      case 'attendance-added':
      case 'attendance-removed':
        this.handleAttendanceUpdate(update);
        break;
      case 'offense-added':
        this.handleOffenseUpdate(update);
        break;
      default:
        this.callHandlers(update.type, update);
    }
    
    // Limits
    if (this.updateQueue.length > 50) this.updateQueue.shift();
  }

  handlePrefectUpdate(update) {
    this.showNotify(update);
    // Refresh UI
    if (window.prefectManager?.refreshData) window.prefectManager.refreshData();
    if (window.dashboardManager?.refreshData) window.dashboardManager.refreshData();
  }

  handleEventUpdate(update) {
    this.showNotify(update);
    if (window.eventManager?.refreshAllData) window.eventManager.refreshAllData();
    if (window.dashboardManager?.refreshData) window.dashboardManager.refreshData();
  }

  handleAttendanceUpdate(update) {
    if (this.currentPage === 'events' && window.eventManager?.currentEventForAttendance?.eventId === update.eventId) {
       window.eventManager.loadCurrentAttendees?.();
    }
    if (window.dashboardManager?.refreshData) window.dashboardManager.refreshData();
  }

  handleOffenseUpdate(update) {
    this.showNotify(update);
    if (window.prefectManager?.refreshData) window.prefectManager.refreshData();
    if (window.dashboardManager?.refreshData) window.dashboardManager.refreshData();
  }

  registerUpdateHandler(type, cb) {
    if (!this.updateHandlers.has(type)) this.updateHandlers.set(type, []);
    this.updateHandlers.get(type).push(cb);
  }

  callHandlers(type, data) {
    (this.updateHandlers.get(type) || []).forEach(cb => {
      try { cb(data); } catch (e) { console.error('[HAND] err:', e); }
    });
  }

  registerDefaultHandlers() { /* Place reserved for static integrations */ }

  broadcastUpdate(type, data) {
    if (!this.isConnected) return;
    
    const payload = {
      type,
      userId: this.userId,
      page: this.currentPage,
      ts: Date.now(),
      ...data
    };

    fetch('/api/sse/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.warn('[SEND] fail:', e));
  }

  setupHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.broadcastUpdate('heartbeat', { alive: true });
      }
      if (Date.now() - this.lastUpdateTimestamp > 90000) this.connect(); // 90sec stale
    }, 45000);
  }

  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isConnected) {
         // Tiny catchup gap
         setTimeout(() => this.forceRefresh(), 500);
      }
    });
  }

  forceRefresh() {
    if (window.eventManager?.refreshAllData) window.eventManager.refreshAllData();
    if (window.dashboardManager?.refreshData) window.dashboardManager.refreshData();
    if (window.prefectManager?.refreshData) window.prefectManager.refreshData();
  }

  createConnectionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'rt-indicator';
    indicator.style.cssText = 'display:none; position:fixed; bottom:10px; right:10px; z-index:9999; padding:4px 8px; border-radius:12px; font-size:10px; font-weight:bold; color:white; opacity:0; transition:opacity 0.5s;';
    document.body.appendChild(indicator);
  }

  updateConnectionStatus(state) {
    const el = document.getElementById('rt-indicator');
    if (!el) return;
    
    switch(state) {
      case 'connected':
        el.textContent = '● LIVE';
        el.style.backgroundColor = '#10b981';
        el.style.opacity = '0.5';
        el.style.display = 'block';
        break;
      case 'disconnected':
        el.textContent = '○ Reconnecting...';
        el.style.backgroundColor = '#f59e0b';
        el.style.opacity = '1';
        el.style.display = 'block';
        break;
      case 'failed':
        el.textContent = '× Connection Failed';
        el.style.backgroundColor = '#ef4444';
        el.style.display = 'block';
        break;
    }
  }

  showNotify(update) {
    if (this.currentPage === 'accounts') return; // Stealthier on config pages
    
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 right-4 bg-gray-900/90 text-white px-4 py-2 rounded-lg shadow-xl z-[9999] transform translate-y-20 transition-transform duration-300';
    toast.innerHTML = `<span class="text-blue-400">⚡</span> ${this.formatLabel(update.type)}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-20'), 10);
    setTimeout(() => {
       toast.classList.add('translate-y-20');
       setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  formatLabel(type) {
    return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  notifyUpdate(type, data) { this.broadcastUpdate(type, data); }
  onUpdate(type, cb) { this.registerUpdateHandler(type, cb); }
}

// Global Instantiation
document.addEventListener('DOMContentLoaded', () => {
    window.realTimeUpdater = new RealTimeUpdateManager();
    
    // Inject integration hooks
    setTimeout(() => {
      if (window.eventManager) {
        const _add = window.eventManager.addNewEvent;
        if (_add) window.eventManager.addNewEvent = async function(...args) {
          const res = await _add.apply(this, args);
          window.realTimeUpdater.notifyUpdate('event-created', { data: args[0] });
          return res;
        };
      }
    }, 2000);
});
