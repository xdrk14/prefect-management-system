/**
 * Real-Time Update System for Prefect Management
 * Provides live updates across all connected clients using Server-Sent Events (SSE)
 * Falls back to WebSocket if SSE is not supported
 * Prevents the need for manual page refreshes when other users make changes
 */

class RealTimeUpdateManager {
  constructor() {
    this.eventSource = null;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnected = false;
    this.connectionType = null;
    this.updateQueue = [];
    this.lastUpdateTimestamp = Date.now();
    this.updateHandlers = new Map();
    this.userId = this.generateUserId();
    this.currentPage = this.detectCurrentPage();

    console.log('[LOAD] Initializing Real-Time Update Manager');
    console.log(`[ID] User ID: ${this.userId}`);
    console.log(`[PAGE] Current Page: ${this.currentPage}`);

    this.init();
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('events.html') || path.includes('events')) return 'events';
    if (path.includes('dashboard.html') || path.includes('dashboard')) return 'dashboard';
    if (path.includes('aquila.html')) return 'aquila';
    if (path.includes('cetus.html')) return 'cetus';
    if (path.includes('cygnus.html')) return 'cygnus';
    if (path.includes('ursa.html')) return 'ursa';
    if (path.includes('central.html')) return 'central';
    if (path.includes('main.html') || path.includes('main')) return 'main';
    return 'unknown';
  }

  async init() {
    // First, add SSE endpoint to server
    await this.addSSEEndpointToServer();

    // Then establish connection
    this.connectSSE();

    // Set up periodic heartbeat
    this.setupHeartbeat();

    // Set up page visibility handling
    this.setupVisibilityHandling();

    // Register default update handlers
    this.registerDefaultHandlers();

    // Set up connection status indicator
    this.createConnectionIndicator();

    console.log('[SUCCESS] Real-Time Update Manager initialized');
  }

  async addSSEEndpointToServer() {
    // This will be handled by server-side implementation
    // For now, we'll simulate the endpoint existence check
    try {
      const response = await fetch('/api/sse/connect', { method: 'HEAD' });
      if (response.ok) {
        console.log('[SUCCESS] SSE endpoint available');
      } else {
        console.log('[WARNING] SSE endpoint not available, will implement');
      }
    } catch (error) {
      console.log('[WARNING] SSE endpoint check failed, will implement');
    }
  }

  async connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      console.log('[CONNECT] Attempting SSE connection...');
      
      // Get auth token if available
      let tokenParam = '';
      if (window.firebaseAuth?.currentUser) {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        tokenParam = `&token=${token}`;
      }

      // Create SSE connection with user ID and page info
      const sseUrl = `/api/sse/updates?userId=${this.userId}&page=${this.currentPage}&timestamp=${Date.now()}${tokenParam}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('[SUCCESS] SSE Connection established');
        this.isConnected = true;
        this.connectionType = 'SSE';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.updateConnectionStatus('connected');
        this.sendHeartbeat();
      };

      this.eventSource.onmessage = event => {
        this.handleServerUpdate(event.data);
      };

      this.eventSource.addEventListener('prefect-update', event => {
        this.handlePrefectUpdate(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('event-update', event => {
        this.handleEventUpdate(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('attendance-update', event => {
        this.handleAttendanceUpdate(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('offense-update', event => {
        this.handleOffenseUpdate(JSON.parse(event.data));
      });

      this.eventSource.addEventListener('heartbeat', event => {
        const data = JSON.parse(event.data);
        console.log('[HEARTBEAT] Heartbeat received:', data);
        this.lastUpdateTimestamp = Date.now();
      });

      this.eventSource.onerror = error => {
        console.error('[ERROR] SSE Connection error:', error);
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
        this.handleConnectionError();
      };
    } catch (error) {
      console.error('[ERROR] Failed to create SSE connection:', error);
      this.connectWebSocket();
    }
  }

  async connectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
    }

    try {
      console.log('[CONNECT] Attempting WebSocket connection...');

      // Get auth token if available
      let tokenParam = '';
      if (window.firebaseAuth?.currentUser) {
        const token = await window.firebaseAuth.currentUser.getIdToken();
        tokenParam = `&token=${token}`;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/updates?userId=${this.userId}&page=${this.currentPage}${tokenParam}`;

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('[SUCCESS] WebSocket Connection established');
        this.isConnected = true;
        this.connectionType = 'WebSocket';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.updateConnectionStatus('connected');
        this.sendHeartbeat();
      };

      this.websocket.onmessage = event => {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      };

      this.websocket.onerror = error => {
        console.error('[ERROR] WebSocket error:', error);
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
      };

      this.websocket.onclose = () => {
        console.log('[CONNECT] WebSocket connection closed');
        this.isConnected = false;
        this.updateConnectionStatus('disconnected');
        this.handleConnectionError();
      };
    } catch (error) {
      console.error('[ERROR] Failed to create WebSocket connection:', error);
      this.handleConnectionError();
    }
  }

  handleConnectionError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(
        `[LOAD] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        if (this.connectionType === 'SSE' || !this.connectionType) {
          this.connectSSE();
        } else {
          this.connectWebSocket();
        }
      }, delay);
    } else {
      console.error('[ERROR] Max reconnection attempts reached');
      this.updateConnectionStatus('failed');
      this.showConnectionErrorNotification();
    }
  }

  handleServerUpdate(data) {
    try {
      const update = JSON.parse(data);
      this.processUpdate(update);
    } catch (error) {
      console.error('[ERROR] Error parsing server update:', error);
    }
  }

  handleServerMessage(data) {
    if (data.type === 'heartbeat') {
      console.log('[HEARTBEAT] WebSocket heartbeat received');
      this.lastUpdateTimestamp = Date.now();
      return;
    }

    this.processUpdate(data);
  }

  processUpdate(update) {
    // Ignore updates from this user to prevent feedback loops
    if (update.userId === this.userId) {
      console.log('[LOAD] Ignoring own update:', update.type);
      return;
    }

    console.log('[INFO] Processing real-time update:', update);

    // Add to update queue with timestamp
    update.receivedAt = Date.now();
    this.updateQueue.push(update);

    // Process the update based on type
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
      case 'offense-updated':
      case 'offense-deleted':
        this.handleOffenseUpdate(update);
        break;

      case 'cache-invalidate':
        this.handleCacheInvalidation(update);
        break;

      default:
        console.log('[UNKNOWN] Unknown update type:', update.type);
    }

    // Clean old updates from queue (keep last 100)
    if (this.updateQueue.length > 100) {
      this.updateQueue = this.updateQueue.slice(-100);
    }
  }

  // ==================== UPDATE HANDLERS ====================

  handlePrefectUpdate(update) {
    console.log('[INFO] Handling prefect update:', update);

    // Call registered handlers
    this.callHandlers('prefect', update);

    // Update specific UI elements based on current page
    if (
      this.currentPage.includes(update.house?.toLowerCase()) ||
      this.currentPage === 'dashboard' ||
      this.currentPage === 'main'
    ) {
      this.showUpdateNotification(update);

      // If prefect table manager exists, refresh the data
      if (window.prefectManager && typeof window.prefectManager.refreshData === 'function') {
        console.log('[LOAD] Refreshing prefect table data');
        window.prefectManager.refreshData();
      }

      // If dashboard exists, refresh statistics
      if (window.dashboardManager && typeof window.dashboardManager.refreshStats === 'function') {
        console.log('[STATS] Refreshing dashboard statistics');
        window.dashboardManager.refreshStats();
      }
    }
  }

  handleEventUpdate(update) {
    console.log('[INFO] Handling event update:', update);

    // Call registered handlers
    this.callHandlers('event', update);

    // Update UI if on events page or dashboard
    if (this.currentPage === 'events' || this.currentPage === 'dashboard') {
      this.showUpdateNotification(update);

      // If event manager exists, refresh the data
      if (window.eventManager && typeof window.eventManager.refreshAllData === 'function') {
        console.log('[LOAD] Refreshing event manager data');
        window.eventManager.refreshAllData();
      }
    }
  }

  handleAttendanceUpdate(update) {
    console.log('[INFO] Handling attendance update:', update);

    // Call registered handlers
    this.callHandlers('attendance', update);

    // If event manager is open and managing attendance for this event
    if (window.eventManager && window.eventManager.currentEventForAttendance) {
      const currentEvent = window.eventManager.currentEventForAttendance;
      if (currentEvent.eventId === update.eventId && currentEvent.eventType === update.eventType) {
        console.log('[LOAD] Refreshing attendance modal');
        window.eventManager.loadCurrentAttendees();
      }
    }

    this.showUpdateNotification(update);
  }

  handleOffenseUpdate(update) {
    console.log('[INFO] Handling offense update:', update);

    // Call registered handlers
    this.callHandlers('offense', update);

    // Update UI based on current page and house
    if (
      this.currentPage.includes(update.house?.toLowerCase()) ||
      this.currentPage === 'dashboard'
    ) {
      this.showUpdateNotification(update);

      // Refresh relevant data
      if (window.prefectManager && typeof window.prefectManager.refreshData === 'function') {
        window.prefectManager.refreshData();
      }
    }
  }

  handleCacheInvalidation(update) {
    console.log('[INFO] Handling cache invalidation:', update);

    // Clear relevant caches
    if (window.eventManager && typeof window.eventManager.clearEventCache === 'function') {
      window.eventManager.clearEventCache();
    }

    if (window.prefectManager && window.prefectManager.cache) {
      window.prefectManager.cache.clear();
    }

    // Refresh current page data
    this.refreshCurrentPageData();
  }

  // ==================== UTILITY METHODS ====================

  registerUpdateHandler(type, handler) {
    if (!this.updateHandlers.has(type)) {
      this.updateHandlers.set(type, []);
    }
    this.updateHandlers.get(type).push(handler);
    console.log(`[INFO] Registered update handler for type: ${type}`);
  }

  callHandlers(type, update) {
    const handlers = this.updateHandlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(update);
      } catch (error) {
        console.error(`[ERROR] Error in update handler for ${type}:`, error);
      }
    });
  }

  registerDefaultHandlers() {
    // Register default handlers that work with existing managers
    this.registerUpdateHandler('prefect', update => {
      console.log('[INFO] Default prefect handler:', update);
      // Additional default handling can go here
    });

    this.registerUpdateHandler('event', update => {
      console.log('[INFO] Default event handler:', update);
      // Additional default handling can go here
    });

    this.registerUpdateHandler('attendance', update => {
      console.log('[INFO] Default attendance handler:', update);
      // Additional default handling can go here
    });
  }

  // Broadcast update to server (called when this client makes changes)
  broadcastUpdate(type, data) {
    if (!this.isConnected) {
      console.log('[WARNING] Not connected, queuing update for later');
      return;
    }

    const update = {
      type,
      userId: this.userId,
      timestamp: Date.now(),
      page: this.currentPage,
      ...data,
    };

    try {
      if (
        this.connectionType === 'WebSocket' &&
        this.websocket &&
        this.websocket.readyState === WebSocket.OPEN
      ) {
        this.websocket.send(JSON.stringify(update));
        console.log('[SEND] Sent WebSocket update:', update);
      } else {
        // For SSE, we need to send via HTTP POST
        fetch('/api/sse/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        }).catch(error => {
          console.error('[ERROR] Failed to broadcast update via HTTP:', error);
        });
        console.log('[SEND] Sent HTTP update:', update);
      }
    } catch (error) {
      console.error('[ERROR] Failed to broadcast update:', error);
    }
  }

  refreshCurrentPageData() {
    console.log('[LOAD] Refreshing current page data');

    // Refresh based on current page
    switch (this.currentPage) {
      case 'events':
        if (window.eventManager && typeof window.eventManager.refreshAllData === 'function') {
          window.eventManager.refreshAllData();
        }
        break;

      case 'dashboard':
        if (
          window.dashboardManager &&
          typeof window.dashboardManager.loadDashboardData === 'function'
        ) {
          window.dashboardManager.loadDashboardData();
        }
        break;

      case 'aquila':
      case 'cetus':
      case 'cygnus':
      case 'ursa':
      case 'central':
        if (window.prefectManager && typeof window.prefectManager.refreshData === 'function') {
          window.prefectManager.refreshData();
        }
        break;

      default:
        console.log('[INFO] No specific refresh method for page:', this.currentPage);
    }
  }

  // ==================== CONNECTION MANAGEMENT ====================

  setupHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }

      // Check if we've received updates recently
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTimestamp;
      if (timeSinceLastUpdate > 60000) {
        // 60 seconds
        console.log('[WARNING] No updates received recently, checking connection');
        this.checkConnection();
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  sendHeartbeat() {
    this.broadcastUpdate('heartbeat', {
      timestamp: Date.now(),
      page: this.currentPage,
    });
  }

  checkConnection() {
    if (!this.isConnected) {
      console.log('[CONNECT] Connection lost, attempting to reconnect');
      if (this.connectionType === 'SSE') {
        this.connectSSE();
      } else {
        this.connectWebSocket();
      }
    }
  }

  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isConnected) {
        // Page became visible, refresh data to catch up on any missed updates
        console.log('[VISIBLE] Page visible, refreshing data');
        setTimeout(() => {
          this.refreshCurrentPageData();
        }, 1000);
      }
    });
  }

  // ==================== UI UPDATES ====================

  createConnectionIndicator() {
    // Create a small connection status indicator
    const indicator = document.createElement('div');
    indicator.id = 'connectionIndicator';
    indicator.style.cssText = `
        display:none;
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background: #gray;
            color: white;
            opacity: 0.8;
            transition: all 0.3s ease;
            pointer-events: none;
        `;

    document.body.appendChild(indicator);
    this.updateConnectionStatus('connecting');
  }

  updateConnectionStatus(status) {
    const indicator = document.getElementById('connectionIndicator');
    if (!indicator) return;

    switch (status) {
      case 'connecting':
        indicator.textContent = 'Connecting...';
        indicator.innerHTML = '<i class="icon icon-loading icon-spin icon-white"></i> Connecting...';
        indicator.style.background = '#fbbf24';
        break;
      case 'connected':
        indicator.textContent = `Live (${this.connectionType})`;
        indicator.innerHTML = '<i class="icon icon-success icon-white"></i> Live (' + this.connectionType + ')';
        // Hide after 3 seconds if connected
        setTimeout(() => {
          if (indicator.textContent.includes('Live')) {
            indicator.style.opacity = '0.3';
          }
        }, 3000);
        break;
      case 'disconnected':
        indicator.textContent = 'Disconnected';
        indicator.innerHTML = '<i class="icon icon-error icon-white"></i> Disconnected';
        indicator.style.background = '#f59e0b';
        indicator.style.opacity = '0.9';
        break;
      case 'failed':
        indicator.textContent = 'Connection Failed';
        indicator.innerHTML = '<i class="icon icon-error icon-white"></i> Connection Failed';
        indicator.style.background = '#ef4444';
        indicator.style.opacity = '0.9';
        break;
    }
  }

  showUpdateNotification(update) {
    // Create a temporary notification for updates from other users
    const notification = document.createElement('div');
    notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            z-index: 9999;
            background: #3b82f6;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

    // Set notification content based on update type
    let message = '';
    switch (update.type) {
      case 'prefect-created':
        message = `<i class="icon icon-users"></i> New prefect added: ${update.data?.FullName || 'Unknown'}`;
        break;
      case 'prefect-updated':
        message = `<i class="icon icon-users"></i> Prefect updated: ${update.data?.FullName || 'Unknown'}`;
        break;
      case 'prefect-deleted':
        message = `<i class="icon icon-users"></i> Prefect deleted: ${update.data?.FullName || 'Unknown'}`;
        break;
      case 'event-created':
        message = `<i class="icon icon-events"></i> New event created: ${update.data?.eventName || 'Unknown'}`;
        break;
      case 'event-updated':
        message = `<i class="icon icon-events"></i> Event updated: ${update.data?.eventName || 'Unknown'}`;
        break;
      case 'event-deleted':
        message = `<i class="icon icon-events"></i> Event deleted: ${update.data?.eventName || 'Unknown'}`;
        break;
      case 'attendance-added':
        message = `<i class="icon icon-users"></i> Attendee added to event`;
        break;
      case 'attendance-removed':
        message = `<i class="icon icon-users"></i> Attendee removed from event`;
        break;
      case 'offense-added':
        message = `<i class="icon icon-shield"></i> New offense recorded`;
        break;
      default:
        message = `<i class="icon icon-past"></i> Data updated by another user`;
    }

    notification.innerHTML = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto-hide after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  showConnectionErrorNotification() {
    const errorNotification = document.createElement('div');
    errorNotification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10001;
            background: #ef4444;
            color: white;
            padding: 20px;
            border-radius: 12px;
            font-size: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            text-align: center;
            max-width: 400px;
        `;

    errorNotification.innerHTML = `
            <h3 style="margin: 0 0 10px 0; font-size: 18px;"><i class="icon icon-error icon-white"></i> Connection Lost</h3>
            <p style="margin: 0 0 15px 0;">Live updates are not available. You may need to refresh manually to see changes from other users.</p>
            <button onclick="location.reload()" style="background: white; color: #ef4444; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                <i class="icon icon-loading icon-spin"></i> Refresh Page
            </button>
        `;

    document.body.appendChild(errorNotification);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.body.contains(errorNotification)) {
        document.body.removeChild(errorNotification);
      }
    }, 10000);
  }

  // ==================== PUBLIC API ====================

  // Method for other managers to call when they make changes
  notifyUpdate(type, data) {
    this.broadcastUpdate(type, data);
  }

  // Method to register custom update handlers
  onUpdate(type, handler) {
    this.registerUpdateHandler(type, handler);
  }

  // Get connection status
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      userId: this.userId,
      currentPage: this.currentPage,
      updateQueue: this.updateQueue,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Force refresh all data
  forceRefresh() {
    this.refreshCurrentPageData();
  }

  // Disconnect (for cleanup)
  disconnect() {
    console.log('[CONNECT] Disconnecting real-time updates');

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
    this.updateConnectionStatus('disconnected');

    // Remove connection indicator
    const indicator = document.getElementById('connectionIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
}

// ==================== INTEGRATION WITH EXISTING MANAGERS ====================

// Extensions for existing managers to integrate with real-time updates
window.addRealTimeIntegration = function () {
  // Extend Event Manager
  if (window.eventManager) {
    const originalCreateEvent = window.eventManager.createEvent;
    window.eventManager.createEvent = async function (eventData) {
      const result = await originalCreateEvent.call(this, eventData);

      // Notify other users of the new event
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('event-created', {
          eventId: result.GeneralEventID || result.HouseEventID,
          eventName: eventData.eventName,
          eventType: eventData.eventType,
          eventDate: eventData.eventDate,
        });
      }

      return result;
    };

    const originalUpdateEvent = window.eventManager.updateEvent;
    window.eventManager.updateEvent = async function (eventData) {
      const result = await originalUpdateEvent.call(this, eventData);

      // Notify other users of the event update
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('event-updated', {
          eventId: eventData.originalEventId,
          eventName: eventData.eventName,
          eventType: eventData.originalEventType,
        });
      }

      return result;
    };

    const originalDeleteEvent = window.eventManager.deleteEvent;
    window.eventManager.deleteEvent = async function (eventId, eventType) {
      const result = await originalDeleteEvent.call(this, eventId, eventType);

      // Notify other users of the event deletion
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('event-deleted', {
          eventId,
          eventType,
        });
      }

      return result;
    };

    const originalAddAttendee = window.eventManager.addAttendee;
    window.eventManager.addAttendee = async function (prefectId, house, eventId, eventType) {
      const result = await originalAddAttendee.call(this, prefectId, house, eventId, eventType);

      // Notify other users of attendance change
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('attendance-added', {
          prefectId,
          house,
          eventId,
          eventType,
        });
      }

      return result;
    };

    const originalRemoveAttendee = window.eventManager.removeAttendee;
    window.eventManager.removeAttendee = async function (prefectId, house, eventId, eventType) {
      const result = await originalRemoveAttendee.call(this, prefectId, house, eventId, eventType);

      // Notify other users of attendance change
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('attendance-removed', {
          prefectId,
          house,
          eventId,
          eventType,
        });
      }

      return result;
    };
  }

  // Extend Prefect Manager (if available)
  if (window.prefectManager) {
    const originalSaveAllChanges = window.prefectManager.saveAllChanges;
    window.prefectManager.saveAllChanges = async function () {
      const result = await originalSaveAllChanges.call(this);

      // Notify other users of prefect update
      if (window.realTimeUpdater && this.currentEditData) {
        window.realTimeUpdater.notifyUpdate('prefect-updated', {
          prefectId: this.currentEditId,
          house: this.house,
          data: this.currentEditData.prefect,
        });
      }

      return result;
    };

    const originalDeletePrefect = window.prefectManager.deletePrefect;
    window.prefectManager.deletePrefect = async function (prefectId) {
      const prefectData = this.currentEditData?.prefect;
      const result = await originalDeletePrefect.call(this, prefectId);

      // Notify other users of prefect deletion
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('prefect-deleted', {
          prefectId,
          house: this.house,
          data: prefectData,
        });
      }

      return result;
    };

    const originalAddOffense = window.prefectManager.addOffense;
    window.prefectManager.addOffense = async function () {
      const result = await originalAddOffense.call(this);

      // Notify other users of offense addition
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('offense-added', {
          prefectId: this.currentEditId,
          house: this.house,
        });
      }

      return result;
    };

    const originalRemoveOffense = window.prefectManager.removeOffense;
    window.prefectManager.removeOffense = async function (date) {
      const result = await originalRemoveOffense.call(this, date);

      // Notify other users of offense removal
      if (window.realTimeUpdater) {
        window.realTimeUpdater.notifyUpdate('offense-deleted', {
          prefectId: this.currentEditId,
          house: this.house,
          date,
        });
      }

      return result;
    };
  }
};

// ==================== SERVER-SIDE INTEGRATION CODE ====================

// Add this to your server.js file - Server-Side Event (SSE) and WebSocket endpoints

const addRealTimeEndpoints = app => {
  // Store connected clients
  const connectedClients = new Map();
  const updateBroadcast = new Map(); // Store recent updates to send to new connections

  // SSE endpoint for real-time updates
  app.get('/api/sse/updates', (req, res) => {
    const { userId, page, timestamp } = req.query;

    console.log(`[CONNECT] SSE Connection: ${userId} on page ${page}`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Store client connection
    const clientInfo = {
      id: userId,
      page,
      response: res,
      connectedAt: Date.now(),
      lastPing: Date.now(),
    };

    connectedClients.set(userId, clientInfo);

    // Send initial connection confirmation
    res.write(`event: connection\n`);
    res.write(
      `data: ${JSON.stringify({
        type: 'connected',
        userId,
        timestamp: Date.now(),
        connectedClients: connectedClients.size,
      })}\n\n`
    );

    // Send recent updates to new client (last 10 updates)
    const recentUpdates = Array.from(updateBroadcast.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    recentUpdates.forEach(update => {
      if (update.userId !== userId) {
        // Don't send client's own updates back
        res.write(`event: ${update.type}\n`);
        res.write(`data: ${JSON.stringify(update)}\n\n`);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[CONNECT] SSE Disconnected: ${userId}`);
      connectedClients.delete(userId);
    });

    req.on('error', error => {
      console.error(`[ERROR] SSE Error for ${userId}:`, error);
      connectedClients.delete(userId);
    });
  });

  // HTTP endpoint for broadcasting updates (used by SSE clients)
  app.post('/api/sse/broadcast', express.json(), (req, res) => {
    const update = req.body;

    console.log(`[BROADCAST] Broadcasting update:`, update);

    // Store update in broadcast history
    const updateKey = `${update.type}_${update.timestamp}`;
    updateBroadcast.set(updateKey, update);

    // Clean old updates (keep last 50)
    if (updateBroadcast.size > 50) {
      const oldestKey = Array.from(updateBroadcast.keys())[0];
      updateBroadcast.delete(oldestKey);
    }

    // Broadcast to all connected SSE clients
    connectedClients.forEach((client, clientId) => {
      if (clientId !== update.userId && client.response) {
        try {
          client.response.write(`event: ${update.type}\n`);
          client.response.write(`data: ${JSON.stringify(update)}\n\n`);
          client.lastPing = Date.now();
        } catch (error) {
          console.error(`[ERROR] Failed to send to client ${clientId}:`, error);
          connectedClients.delete(clientId);
        }
      }
    });

    res.json({ success: true, broadcastTo: connectedClients.size - 1 });
  });

  // WebSocket support (alternative to SSE)
  if (app.ws) {
    app.ws('/ws/updates', (ws, req) => {
      const userId = req.query.userId;
      const page = req.query.page;

      console.log(`[WS] WebSocket Connection: ${userId} on page ${page}`);

      const clientInfo = {
        id: userId,
        page,
        websocket: ws,
        connectedAt: Date.now(),
        lastPing: Date.now(),
      };

      connectedClients.set(userId, clientInfo);

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: 'connected',
          userId,
          timestamp: Date.now(),
          connectedClients: connectedClients.size,
        })
      );

      // Handle incoming messages
      ws.on('message', message => {
        try {
          const update = JSON.parse(message);
          console.log(`[BROADCAST] WebSocket update from ${userId}:`, update);

          // Store and broadcast update
          const updateKey = `${update.type}_${update.timestamp}`;
          updateBroadcast.set(updateKey, update);

          // Broadcast to all other clients
          connectedClients.forEach((client, clientId) => {
            if (clientId !== userId) {
              try {
                if (client.websocket && client.websocket.readyState === 1) {
                  client.websocket.send(JSON.stringify(update));
                } else if (client.response) {
                  client.response.write(`event: ${update.type}\n`);
                  client.response.write(`data: ${JSON.stringify(update)}\n\n`);
                }
                client.lastPing = Date.now();
              } catch (error) {
                console.error(`[ERROR] Failed to send to client ${clientId}:`, error);
                connectedClients.delete(clientId);
              }
            }
          });
        } catch (error) {
          console.error('[ERROR] Error processing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`[WS] WebSocket Disconnected: ${userId}`);
        connectedClients.delete(userId);
      });

      ws.on('error', error => {
        console.error(`[ERROR] WebSocket Error for ${userId}:`, error);
        connectedClients.delete(userId);
      });
    });
  }

  // Heartbeat endpoint for connection health
  app.get('/api/sse/heartbeat', (req, res) => {
    const now = Date.now();
    const activeClients = [];

    // Clean up stale connections
    connectedClients.forEach((client, clientId) => {
      const timeSinceLastPing = now - client.lastPing;
      if (timeSinceLastPing > 60000) {
        // 1 minute timeout
        console.log(`[CLEAN] Cleaning up stale connection: ${clientId}`);
        connectedClients.delete(clientId);
      } else {
        activeClients.push({
          id: clientId,
          page: client.page,
          connectedFor: now - client.connectedAt,
          lastPing: timeSinceLastPing,
        });
      }
    });

    // Send heartbeat to all connected clients
    const heartbeatData = {
      type: 'heartbeat',
      timestamp: now,
      connectedClients: connectedClients.size,
    };

    connectedClients.forEach((client, clientId) => {
      try {
        if (client.websocket && client.websocket.readyState === 1) {
          client.websocket.send(JSON.stringify(heartbeatData));
        } else if (client.response) {
          client.response.write(`event: heartbeat\n`);
          client.response.write(`data: ${JSON.stringify(heartbeatData)}\n\n`);
        }
        client.lastPing = now;
      } catch (error) {
        console.error(`[ERROR] Heartbeat failed for ${clientId}:`, error);
        connectedClients.delete(clientId);
      }
    });

    res.json({
      connectedClients: connectedClients.size,
      activeClients,
      recentUpdates: updateBroadcast.size,
    });
  });

  // Statistics endpoint
  app.get('/api/sse/stats', (req, res) => {
    const stats = {
      connectedClients: connectedClients.size,
      recentUpdates: updateBroadcast.size,
      clientsByPage: {},
      uptime: process.uptime(),
    };

    connectedClients.forEach(client => {
      stats.clientsByPage[client.page] = (stats.clientsByPage[client.page] || 0) + 1;
    });

    res.json(stats);
  });

  // Start heartbeat interval
  setInterval(() => {
    const heartbeatUrl = `http://localhost:${process.env.PORT || 3000}/api/sse/heartbeat`;
    fetch(heartbeatUrl).catch(error => {
      console.error('[ERROR] Heartbeat fetch error:', error.message);
    });
  }, 30000); // Every 30 seconds

  console.log('[SUCCESS] Real-time update endpoints registered');
  console.log('   [CONNECT] SSE: GET /api/sse/updates');
  console.log('   [BROADCAST] Broadcast: POST /api/sse/broadcast');
  console.log('   [WS] WebSocket: WS /ws/updates');
  console.log('   [HEARTBEAT] Heartbeat: GET /api/sse/heartbeat');
  console.log('   [STATS] Stats: GET /api/sse/stats');
};

// ==================== INITIALIZATION CODE ====================

// Global variable
let realTimeUpdater = null;

// Initialize real-time updates when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[LAUNCH] Starting Real-Time Update System...');

  // Create the real-time updater
  realTimeUpdater = new RealTimeUpdateManager();
  window.realTimeUpdater = realTimeUpdater;

  // Add integration with existing managers after a short delay
  setTimeout(() => {
    if (typeof window.addRealTimeIntegration === 'function') {
      window.addRealTimeIntegration();
      console.log('[SUCCESS] Real-time integration added to existing managers');
    }
  }, 2000);

  // Add debug helper to window
  window.realTimeDebug = {
    getConnectionInfo: () => realTimeUpdater.getConnectionInfo(),
    forceRefresh: () => realTimeUpdater.forceRefresh(),
    broadcastTest: (type, data) => realTimeUpdater.notifyUpdate(type, data),
    disconnect: () => realTimeUpdater.disconnect(),
    reconnect: () => {
      realTimeUpdater.disconnect();
      setTimeout(() => {
        realTimeUpdater.connectSSE();
      }, 1000);
    },
  };
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  if (realTimeUpdater) {
    realTimeUpdater.disconnect();
  }
});

// Export for server-side use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addRealTimeEndpoints };
}

console.log('[SUCCESS] Real-Time Update System loaded!');
console.log('[CONFIG] Features:');
console.log('   [CONNECT] Server-Sent Events (SSE) with WebSocket fallback');
console.log('   [SYNC] Automatic reconnection with exponential backoff');
console.log('   [USERS] Multi-user synchronization');
console.log('   [STATUS] Connection status indicator');
console.log('   [NOTIFY] Real-time notifications for changes');
console.log('   [HEARTBEAT] Heartbeat monitoring');
console.log('   [STATS] Integration with existing Event and Edit managers');
console.log('[TIPS] Debug commands:');
console.log('   - realTimeDebug.getConnectionInfo() - View connection status');
console.log('   - realTimeDebug.forceRefresh() - Force refresh current page');
console.log('   - realTimeDebug.broadcastTest("test", {data: "hello"}) - Test broadcast');
console.log('   - realTimeDebug.disconnect() - Disconnect from real-time updates');
console.log('   - realTimeDebug.reconnect() - Reconnect to real-time updates');
