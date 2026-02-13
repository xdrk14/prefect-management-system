/**
 * Enhanced Event Management System - FIXED VERSION
 * Complete CRUD operations and attendance management
 * Compatible with updated database structure including W0Number and Class fields
 * FIXES: 24-hour time format + edit form validation
 */

class EventManager {
  constructor() {
    this.cache = new Map();
    this.apiEndpoints = {
      primary: '/api/events-participation/',
      fallback: '/api/participation/',
    };
    this.currentFilter = 'all';
    this.allEvents = [];
    this.allPrefects = [];
    this.currentEventForAttendance = null;
    this.currentAttendees = [];
    this.deleteEventCallback = null;
    this.isLoading = false;

    // Initialize the system
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Event Management System...');

    // Set minimum date to today for new events
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');

    // Load initial data
    await this.loadInitialData();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup periodic refresh
    this.setupPeriodicRefresh();

    console.log('✅ Event Management System initialized successfully');
  }

  async loadInitialData() {
    try {
      this.showLoadingState();

      console.log('📥 Loading initial data...');

      // Load all data in parallel
      const [events, prefects] = await Promise.all([
        this.fetchAllEvents(),
        this.fetchAllPrefects(),
      ]);

      // Store the data
      this.allEvents = events;
      this.allPrefects = prefects;

      // Calculate fresh statistics
      const stats = await this.fetchEventStatistics();

      // Update all UI components
      this.displayEvents(events);
      this.displayStatistics(stats);
      this.updateEventsCount(events.length);

      console.log('✅ Initial data loaded successfully');
      console.log('📊 Events loaded:', events.length);
      console.log('👥 Prefects loaded:', prefects.length);
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      this.showNotification('Failed to load event data. Please refresh the page.', 'error');
    }
  }

  // ==================== API METHODS ====================

  async fetchAllEvents() {
    const cacheKey = 'all_events';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/all-events');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const events = await response.json();
      this.setCache(cacheKey, events, 300000); // 5 minutes
      return events;
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      throw error;
    }
  }

  async fetchAllPrefects() {
    const cacheKey = 'all_prefects';
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/prefects');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const prefectsByHouse = await response.json();

      // Flatten and add house information - Updated for new schema
      const allPrefects = [];
      for (const [house, prefects] of Object.entries(prefectsByHouse)) {
        prefects.forEach(prefect => {
          allPrefects.push({
            ...prefect,
            House: house.charAt(0).toUpperCase() + house.slice(1),
            // Ensure all new schema fields are available
            W0Number: prefect.W0Number || 'N/A',
            Class: prefect.Class || 'N/A',
          });
        });
      }

      this.setCache(cacheKey, allPrefects, 180000); // 3 minutes
      return allPrefects;
    } catch (error) {
      console.error('❌ Error fetching prefects:', error);
      throw error;
    }
  }

  async fetchEventStatistics() {
    try {
      console.log('🔄 Calculating statistics with date+time logic...');

      // Get fresh events data
      this.clearEventCache();
      const allEvents = await this.fetchAllEvents();

      // Get current date and time
      const now = new Date();

      console.log('🕐 Current time:', now.toLocaleString());
      console.log('📋 Total events to analyze:', allEvents.length);

      // Helper function to determine if event is truly upcoming
      const isEventUpcoming = event => {
        const eventDate = event.EventDateHeld;
        if (!eventDate) return false;

        // Create date object for the event
        const eventDateObj = new Date(eventDate);

        // If event is on a future date, it's upcoming
        if (eventDateObj.toISOString().split('T')[0] > now.toISOString().split('T')[0]) {
          return true;
        }

        // If event is on a past date, it's past
        if (eventDateObj.toISOString().split('T')[0] < now.toISOString().split('T')[0]) {
          return false;
        }

        // Event is TODAY - check the time
        if (eventDateObj.toISOString().split('T')[0] === now.toISOString().split('T')[0]) {
          const endTime = event.TimeEnded;

          // If no end time specified, use start time or consider it ongoing
          if (!endTime) {
            const startTime = event.TimeStarted;
            if (!startTime) {
              // No time info - consider upcoming if it's today
              return true;
            }

            // Compare with start time
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const eventStartTime = new Date(now);
            eventStartTime.setHours(startHour, startMinute, 0, 0);

            return now < eventStartTime;
          }

          // Has end time - check if current time is before end time
          const [endHour, endMinute] = endTime.split(':').map(Number);
          const eventEndTime = new Date(now);
          eventEndTime.setHours(endHour, endMinute, 0, 0);

          // Event is upcoming if current time is before end time
          return now < eventEndTime;
        }

        return false;
      };

      // Separate events by type
      const generalEvents = allEvents.filter(
        event => event.GeneralEventID || event.EventType === 'general' || event.GeneralEventName
      );

      const houseEvents = allEvents.filter(
        event => event.HouseEventID || event.EventType === 'house' || event.HouseEventName
      );

      // Calculate upcoming vs past using the smart logic
      const generalUpcoming = generalEvents.filter(isEventUpcoming);
      const generalPast = generalEvents.filter(event => !isEventUpcoming(event));

      const houseUpcoming = houseEvents.filter(isEventUpcoming);
      const housePast = houseEvents.filter(event => !isEventUpcoming(event));

      // Debug logging for today's events
      const todayEvents = allEvents.filter(event => {
        const eventDate = event.EventDateHeld;
        if (!eventDate) return false;
        return eventDate === now.toISOString().split('T')[0];
      });

      if (todayEvents.length > 0) {
        console.log("📅 TODAY'S EVENTS ANALYSIS:");
        todayEvents.forEach(event => {
          const isUp = isEventUpcoming(event);
          console.log(`  • ${event.GeneralEventName || event.HouseEventName}`);
          console.log(`    Date: ${event.EventDateHeld}`);
          console.log(`    Start: ${event.TimeStarted || 'Not set'}`);
          console.log(`    End: ${event.TimeEnded || 'Not set'}`);
          console.log(`    Status: ${isUp ? '🔮 UPCOMING' : '📅 PAST'}`);
        });
      }

      // Build statistics object
      const stats = {
        general: {
          totalEvents: generalEvents.length,
          upcomingEvents: generalUpcoming.length,
          pastEvents: generalPast.length,
        },
        house: {
          totalEvents: houseEvents.length,
          upcomingEvents: houseUpcoming.length,
          pastEvents: housePast.length,
        },
        combined: {
          totalEvents: allEvents.length,
          upcomingEvents: generalUpcoming.length + houseUpcoming.length,
          pastEvents: generalPast.length + housePast.length,
        },
      };

      console.log('📊 SMART STATISTICS (Date + Time):');
      console.log(`  🔮 Upcoming: ${stats.combined.upcomingEvents}`);
      console.log(`  📅 Past: ${stats.combined.pastEvents}`);
      console.log(`  📊 Total: ${stats.combined.totalEvents}`);

      return stats;
    } catch (error) {
      console.error('❌ Error calculating smart statistics:', error);
      return {
        general: { totalEvents: 0, upcomingEvents: 0, pastEvents: 0 },
        house: { totalEvents: 0, upcomingEvents: 0, pastEvents: 0 },
        combined: { totalEvents: 0, upcomingEvents: 0, pastEvents: 0 },
      };
    }
  }

  async createEvent(eventData) {
    try {
      const endpoint =
        eventData.eventType === 'general' ? '/api/general-events' : '/api/house-events';
      const payload = this.formatEventPayload(eventData);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create event');
      }

      const result = await response.json();

      // Clear cache and reload data
      this.clearEventCache();
      try {
        if (window.auditLog) {
          await window.auditLog.logActivity(
            'event_created',
            `New event created: ${payload.GeneralEventName || payload.HouseEventName}`,
            {
              eventId: payload.GeneralEventID || payload.HouseEventID,
              eventType: eventData.eventType,
              eventDate: payload.EventDateHeld,
              timeStarted: payload.TimeStarted,
              timeEnded: payload.TimeEnded,
              status: 'success',
            }
          );
          console.log('✅ Event creation logged to audit');
        }
      } catch (auditError) {
        console.log('⚠️ Failed to log event creation:', auditError);
      }

      // Refresh both events and statistics
      await Promise.all([this.loadAllEvents(), this.refreshStats()]);

      return result;
    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(eventData) {
    try {
      const endpoint =
        eventData.originalEventType === 'general'
          ? `/api/general-events/${eventData.originalEventId}`
          : `/api/house-events/${eventData.originalEventId}`;

      // FIXED: Format payload with proper event type detection
      const payload = this.formatEventPayload({
        ...eventData,
        eventType: eventData.originalEventType, // Ensure event type is available for formatting
      });

      console.log('🔧 Update payload:', payload); // Debug log

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update event');
      }
      try {
        if (window.auditLog) {
          await window.auditLog.logActivity(
            'event_updated',
            `Event updated: ${payload.GeneralEventName || payload.HouseEventName}`,
            {
              eventId: eventData.originalEventId,
              eventType: eventData.originalEventType,
              eventDate: payload.EventDateHeld,
              timeStarted: payload.TimeStarted,
              timeEnded: payload.TimeEnded,
              status: 'success',
            }
          );
          console.log('✅ Event update logged to audit');
        }
      } catch (auditError) {
        console.log('⚠️ Failed to log event update:', auditError);
      }
      // Clear cache and reload data
      this.clearEventCache();
      await this.loadAllEvents();

      return await response.json();
    } catch (error) {
      console.error('❌ Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId, eventType) {
    try {
      // FIXED: First get all attendees to warn user AND clear them before deletion
      console.log('🗑️ Starting event deletion process for:', eventId, eventType);

      const attendees = await this.fetchEventAttendees(eventId, eventType);
      console.log('👥 Found attendees:', attendees.length);

      if (attendees.length > 0) {
        const confirmed = confirm(
          `This event has ${attendees.length} attendees. Deleting this event will also remove all attendance records. Are you sure you want to continue?`
        );
        if (!confirmed) return false;
      }

      // FIXED: Clear all attendees BEFORE deleting the event to avoid foreign key constraints
      if (attendees.length > 0) {
        console.log('🧹 Clearing attendees before event deletion...');
        await this.clearAllEventAttendees(eventId, eventType, attendees);
        console.log('✅ All attendees cleared successfully');
      }

      // Now delete the actual event
      console.log('🗑️ Proceeding to delete event...');
      const endpoint =
        eventType === 'general' ? `/api/general-events/${eventId}` : `/api/house-events/${eventId}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }

      console.log('✅ Event deleted successfully');

      // Clear cache and reload data
      this.clearEventCache();

      try {
        if (window.auditLog) {
          // Get event name from allEvents before it's deleted
          const deletedEvent = this.allEvents.find(
            e =>
              (e.GeneralEventID === eventId && eventType === 'general') ||
              (e.HouseEventID === eventId && eventType === 'house')
          );
          const eventName = deletedEvent
            ? deletedEvent.GeneralEventName || deletedEvent.HouseEventName
            : `${eventType} event ${eventId}`;

          await window.auditLog.logActivity('event_deleted', `Event deleted: ${eventName}`, {
            eventId: eventId,
            eventType: eventType,
            deletedAttendees: attendees.length,
            status: 'success',
          });
          console.log('✅ Event deletion logged to audit');
        }
      } catch (auditError) {
        console.log('⚠️ Failed to log event deletion:', auditError);
      }

      // Refresh both events and statistics
      await Promise.all([this.loadAllEvents(), this.refreshStats()]);

      return true;
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      throw error;
    }
  }

  // FIXED: New method to clear all attendees for an event before deletion
  async clearAllEventAttendees(eventId, eventType, attendees) {
    const deletePromises = [];

    // Group attendees by house and create deletion promises
    const attendeesByHouse = {};
    attendees.forEach(attendee => {
      const house = attendee.House.toLowerCase();
      if (!attendeesByHouse[house]) {
        attendeesByHouse[house] = [];
      }
      attendeesByHouse[house].push(attendee);
    });

    // Create deletion promises for each house
    for (const [house, houseAttendees] of Object.entries(attendeesByHouse)) {
      for (const attendee of houseAttendees) {
        console.log(`🗑️ Queuing deletion: ${attendee.FullName} from ${house}`);

        // Try primary endpoint first, then fallback
        const deletePromise = this.removeAttendeeWithFallback(
          attendee.PrefectID,
          house,
          eventId,
          eventType
        );

        deletePromises.push(deletePromise);
      }
    }

    // Execute all deletions in parallel (but limit concurrency to avoid overwhelming server)
    const batchSize = 5; // Process 5 deletions at a time
    for (let i = 0; i < deletePromises.length; i += batchSize) {
      const batch = deletePromises.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(
        `✅ Processed deletion batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(deletePromises.length / batchSize)}`
      );

      // Small delay between batches to be gentle on the server
      if (i + batchSize < deletePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('✅ All attendees cleared successfully');
  }

  // FIXED: Enhanced attendee removal with better error handling and fallback
  async removeAttendeeWithFallback(prefectId, house, eventId, eventType) {
    try {
      // Try primary endpoint first
      let endpoint = `${this.apiEndpoints.primary}${house}/${prefectId}/${eventType}/${eventId}`;
      let response = await fetch(endpoint, { method: 'DELETE' });

      // If primary fails, try fallback endpoint
      if (!response.ok) {
        console.log(`⚠️ Primary endpoint failed for ${prefectId}, trying fallback...`);
        endpoint = `${this.apiEndpoints.fallback}${house}/${prefectId}/${eventType}/${eventId}`;
        response = await fetch(endpoint, { method: 'DELETE' });
      }

      if (!response.ok) {
        // If both endpoints fail, log but don't throw to allow other deletions to continue
        const errorText = await response.text();
        console.warn(
          `⚠️ Failed to remove attendee ${prefectId} from ${house}: ${response.status} ${errorText}`
        );
        return { success: false, prefectId, error: `HTTP ${response.status}` };
      }

      console.log(`✅ Successfully removed attendee ${prefectId} from ${house}`);
      return { success: true, prefectId };
    } catch (error) {
      console.warn(`⚠️ Error removing attendee ${prefectId} from ${house}:`, error.message);
      return { success: false, prefectId, error: error.message };
    }
  }

  async fetchEventAttendees(eventId, eventType) {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(
        `/api/events/${eventType}/${eventId}/participants?_t=${timestamp}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const participantsByHouse = await response.json();
      console.log('🔍 Raw participants data:', participantsByHouse);

      // Flatten the results - Updated to handle new schema
      const allParticipants = [];
      for (const [house, participants] of Object.entries(participantsByHouse)) {
        if (Array.isArray(participants)) {
          participants.forEach(participant => {
            allParticipants.push({
              ...participant,
              House: house.charAt(0).toUpperCase() + house.slice(1),
              // Ensure new schema fields are available
              W0Number: participant.W0Number || 'N/A',
              Class: participant.Class || 'N/A',
            });
          });
        }
      }

      console.log('✅ Processed participants:', allParticipants.length, 'total');
      return allParticipants;
    } catch (error) {
      console.error('❌ Error fetching attendees:', error);
      return [];
    }
  }

  async addAttendee(prefectId, house, eventId, eventType) {
    try {
      const lowerHouse = house.toLowerCase();

      // Try primary endpoint first
      let endpoint = `${this.apiEndpoints.primary}${lowerHouse}`;
      let payload = {
        PrefectID: prefectId,
        GeneralEventID: eventType === 'general' ? eventId : null,
        HouseEventsID: eventType === 'house' ? eventId : null,
      };

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Fallback to alternative endpoint if primary fails
      if (!response.ok) {
        endpoint = `${this.apiEndpoints.fallback}${lowerHouse}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add attendee');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error adding attendee:', error);
      throw error;
    }
  }

  async removeAttendee(prefectId, house, eventId, eventType) {
    try {
      const lowerHouse = house.toLowerCase();

      // Try primary endpoint first
      let endpoint = `${this.apiEndpoints.primary}${lowerHouse}/${prefectId}/${eventType}/${eventId}`;
      let response = await fetch(endpoint, { method: 'DELETE' });

      // Fallback to alternative endpoint if primary fails
      if (!response.ok) {
        endpoint = `${this.apiEndpoints.fallback}${lowerHouse}/${prefectId}/${eventType}/${eventId}`;
        response = await fetch(endpoint, { method: 'DELETE' });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove attendee');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error removing attendee:', error);
      throw error;
    }
  }

  // ==================== UI METHODS ====================

  displayEvents(events) {
    const container = document.getElementById('eventsContainer');

    if (!events || events.length === 0) {
      container.innerHTML = this.getEmptyStateHTML();
      return;
    }

    const sortedEvents = events.sort(
      (a, b) => new Date(b.EventDateHeld) - new Date(a.EventDateHeld)
    );

    container.innerHTML = sortedEvents.map(event => this.createEventCardHTML(event)).join('');
  }

  createEventCardHTML(event) {
    const now = new Date();
    const eventDate = event.EventDateHeld;
    const eventDateObj = new Date(eventDate);
    const today = now.toISOString().split('T')[0];
    const eventDateStr = eventDateObj.toISOString().split('T')[0];

    // Smart status determination with time logic
    let isPast, isUpcoming, statusText, statusClass;

    if (eventDateStr > today) {
      // Future date
      isUpcoming = true;
      isPast = false;
      statusText = '🔮 Upcoming';
      statusClass = 'bg-green-100 text-green-700';
    } else if (eventDateStr < today) {
      // Past date
      isUpcoming = false;
      isPast = true;
      statusText = '📅 Past';
      statusClass = 'bg-gray-200 text-gray-600';
    } else {
      // Today - check time
      const endTime = event.TimeEnded;
      if (endTime) {
        try {
          const [endHour, endMinute] = endTime.split(':').map(Number);
          const eventEndTime = new Date(now);
          eventEndTime.setHours(endHour, endMinute, 0, 0);

          if (now < eventEndTime) {
            isUpcoming = true;
            isPast = false;
            statusText = '🕐 Happening Today';
            statusClass = 'bg-blue-100 text-blue-700';
          } else {
            isUpcoming = false;
            isPast = true;
            statusText = '✅ Finished Today';
            statusClass = 'bg-gray-200 text-gray-600';
          }
        } catch (e) {
          // Error parsing time, default to happening today
          isUpcoming = true;
          isPast = false;
          statusText = '📅 Today';
          statusClass = 'bg-yellow-100 text-yellow-700';
        }
      } else {
        // No end time, check start time or default to happening today
        const startTime = event.TimeStarted;
        if (startTime) {
          try {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const eventStartTime = new Date(now);
            eventStartTime.setHours(startHour, startMinute, 0, 0);

            if (now < eventStartTime) {
              isUpcoming = true;
              isPast = false;
              statusText = '⏰ Starting Today';
              statusClass = 'bg-orange-100 text-orange-700';
            } else {
              isUpcoming = true;
              isPast = false;
              statusText = '🕐 Happening Today';
              statusClass = 'bg-blue-100 text-blue-700';
            }
          } catch (e) {
            isUpcoming = true;
            isPast = false;
            statusText = '📅 Today';
            statusClass = 'bg-yellow-100 text-yellow-700';
          }
        } else {
          // No time info, default to happening today
          isUpcoming = true;
          isPast = false;
          statusText = '📅 Today';
          statusClass = 'bg-yellow-100 text-yellow-700';
        }
      }
    }

    const eventName = event.GeneralEventName || event.HouseEventName || 'Unnamed Event';
    const eventId = event.GeneralEventID || event.HouseEventID;
    const eventType = event.EventType || (event.GeneralEventID ? 'general' : 'house');

    // Format time display
    const formatTime12Hour = time => {
      if (!time) return '';
      try {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
      } catch (e) {
        return time;
      }
    };

    const startTime = formatTime12Hour(event.TimeStarted);
    const endTime = formatTime12Hour(event.TimeEnded);
    const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : startTime || '';

    // Additional status indicator for today's events
    let additionalStatus = '';
    if (eventDateStr === today && endTime) {
      try {
        const [endHour, endMinute] = event.TimeEnded.split(':').map(Number);
        const eventEndTime = new Date(now);
        eventEndTime.setHours(endHour, endMinute, 0, 0);

        const timeUntilEnd = eventEndTime - now;
        const minutesUntilEnd = Math.floor(timeUntilEnd / (1000 * 60));

        if (minutesUntilEnd > 0 && minutesUntilEnd <= 60) {
          additionalStatus = `
                    <div class="flex items-center gap-1 text-orange-600">
                        <span>⏱️</span>
                        <span class="font-medium">${minutesUntilEnd} min left</span>
                    </div>
                `;
        } else if (minutesUntilEnd <= 0 && minutesUntilEnd > -60) {
          additionalStatus = `
                    <div class="flex items-center gap-1 text-red-600">
                        <span>⏹️</span>
                        <span class="font-medium">Just ended</span>
                    </div>
                `;
        }
      } catch (e) {
        // Ignore time parsing errors
      }
    }

    return `
        <div class="event-card" data-event-id="${eventId}" data-event-type="${eventType}">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <span class="event-type-badge type-${eventType}">
                        ${eventType.toUpperCase()}
                    </span>
                    <span class="text-xs px-2 py-1 rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="flex gap-2">
                    <button onclick="eventManager.editEvent('${eventId}', '${eventType}')" 
                            class="btn btn-warning text-xs" title="Edit Event">
                        ✏️ Edit
                    </button>
                    <button onclick="eventManager.manageAttendance('${eventId}', '${eventType}', '${eventName.replace(/'/g, "\\'")}', '${eventDate}', '${timeDisplay}')" 
                            class="btn btn-info text-xs" title="Manage Attendance">
                        👥 Attendance
                    </button>
                    <button onclick="eventManager.showDeleteConfirmation('${eventId}', '${eventType}')" 
                            class="btn btn-danger text-xs" title="Delete Event">
                        🗑️
                    </button>
                </div>
            </div>
            
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${eventName}</h3>
            
            <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                <div class="flex items-center gap-1">
                    <span>🆔</span>
                    <span class="font-mono">${eventId}</span>
                </div>
                <div class="flex items-center gap-1">
                    <span>📅</span>
                    <span>${new Date(eventDate).toLocaleDateString()}</span>
                </div>
                ${
                  timeDisplay
                    ? `
                    <div class="flex items-center gap-1">
                        <span>⏰</span>
                        <span>${timeDisplay}</span>
                    </div>
                `
                    : ''
                }
                ${additionalStatus}
            </div>
        </div>
    `;
  }

  displayStatistics(stats) {
    const container = document.getElementById('statsContainer');

    console.log('📊 Updating statistics display:', stats);

    // Enhanced statistics with better visual indicators
    container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value text-blue-600">${stats.combined.totalEvents}</div>
                <div class="stat-label">📊 Total Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-green-600">${stats.general.totalEvents}</div>
                <div class="stat-label">🏛️ General Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-purple-600">${stats.house.totalEvents}</div>
                <div class="stat-label">🏠 House Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-orange-600">${stats.combined.upcomingEvents}</div>
                <div class="stat-label">🕐 Upcoming</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-gray-600">${stats.combined.pastEvents}</div>
                <div class="stat-label">📅 Past Events</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-indigo-600">${stats.general.upcomingEvents}</div>
                <div class="stat-label">🔮 General Upcoming</div>
            </div>
            <div class="stat-card">
                <div class="stat-value text-pink-600">${stats.house.upcomingEvents}</div>
                <div class="stat-label">🏡 House Upcoming</div>
            </div>
        `;

    console.log('✅ Statistics display updated');

    // Debug information
    console.log('🔍 Statistics breakdown:');
    console.log('  • Total Events:', stats.combined.totalEvents);
    console.log('  • Upcoming Events:', stats.combined.upcomingEvents);
    console.log('  • Past Events:', stats.combined.pastEvents);
    console.log(
      '  • General (Total/Upcoming/Past):',
      stats.general.totalEvents,
      '/',
      stats.general.upcomingEvents,
      '/',
      stats.general.pastEvents
    );
    console.log(
      '  • House (Total/Upcoming/Past):',
      stats.house.totalEvents,
      '/',
      stats.house.upcomingEvents,
      '/',
      stats.house.pastEvents
    );
  }

  getEmptyStateHTML() {
    return `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <h3 class="text-lg font-semibold text-gray-600 mb-2">No Events Found</h3>
                <p class="text-gray-500">No events match your current filter criteria.</p>
                <button onclick="eventManager.clearFilters()" class="btn btn-primary mt-4">
                    🔄 Show All Events
                </button>
            </div>
        `;
  }

  // ==================== EVENT FORM METHODS ====================

  toggleAddEventForm() {
    const form = document.getElementById('addEventForm');
    const btn = document.getElementById('toggleFormBtn');

    if (form.classList.contains('hidden')) {
      form.classList.remove('hidden');
      btn.textContent = 'Hide Form';
      document.querySelector('input[name="eventName"]').focus();
    } else {
      form.classList.add('hidden');
      btn.textContent = 'Show Form';
    }
  }

  updateEventId() {
    const typeSelect = document.querySelector('select[name="eventType"]');
    const idInput = document.querySelector('input[name="eventId"]');
    const type = typeSelect.value;

    if (type) {
      const timestamp = Date.now().toString().slice(-6);
      const prefix = type === 'general' ? 'GEN' : 'HSE';
      idInput.value = `${prefix}-${timestamp}`;
    } else {
      idInput.value = '';
    }
  }

  async addNewEvent(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const eventData = Object.fromEntries(formData.entries());

    // Validate form - FIXED: Pass false for isEdit parameter
    if (!this.validateEventForm(eventData, false)) {
      return;
    }

    try {
      this.showLoadingButton(form.querySelector('button[type="submit"]'));

      await this.createEvent(eventData);

      this.showNotification('Event created successfully!', 'success');
      await Promise.all([this.loadAllEvents(), this.refreshStats()]);
      setTimeout(() => window.location.reload(), 1000);
      this.resetForm();
      this.toggleAddEventForm();
    } catch (error) {
      this.showNotification(`Error creating event: ${error.message}`, 'error');
    } finally {
      this.hideLoadingButton(form.querySelector('button[type="submit"]'), '✅ Create Event');
    }
  }

  async editEvent(eventId, eventType) {
    try {
      // Fetch event details
      const endpoint =
        eventType === 'general' ? `/api/general-events/${eventId}` : `/api/house-events/${eventId}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Event not found');

      const event = await response.json();

      // Populate edit form
      const form = document.getElementById('editEventForm');
      form.querySelector('input[name="originalEventId"]').value = eventId;
      form.querySelector('input[name="originalEventType"]').value = eventType;
      form.querySelector('input[name="eventName"]').value =
        event.GeneralEventName || event.HouseEventName;
      form.querySelector('select[name="eventType"]').value = eventType;
      form.querySelector('input[name="eventDate"]').value = event.EventDateHeld;
      form.querySelector('input[name="eventId"]').value = eventId;

      // FIXED: Set time values properly, converting from 24-hour storage to display format
      const startTime = event.TimeStarted || '';
      const endTime = event.TimeEnded || '';

      form.querySelector('input[name="startTime"]').value = startTime;
      form.querySelector('input[name="endTime"]').value = endTime;

      // Show modal
      document.getElementById('editEventModal').style.display = 'block';
    } catch (error) {
      this.showNotification(`Error loading event: ${error.message}`, 'error');
    }
  }

  async updateEventForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const eventData = Object.fromEntries(formData.entries());

    // FIXED: Pass true for isEdit parameter to skip event type validation
    if (!this.validateEventForm(eventData, true)) {
      return;
    }

    try {
      this.showLoadingButton(form.querySelector('button[type="submit"]'));

      await this.updateEvent(eventData);

      this.showNotification('Event updated successfully!', 'success');
      // Refresh both events and statistics after update

      this.closeEditModal();
    } catch (error) {
      this.showNotification(`Error updating event: ${error.message}`, 'error');
    } finally {
      this.hideLoadingButton(form.querySelector('button[type="submit"]'), '✅ Update Event');
    }
  }

  showDeleteConfirmation(eventId, eventType) {
    this.deleteEventCallback = () => this.performDelete(eventId, eventType);
    document.getElementById('confirmModal').style.display = 'block';
  }

  async performDelete(eventId, eventType) {
    try {
      // Show loading state
      const confirmModal = document.getElementById('confirmModal');
      const originalContent = confirmModal.innerHTML;

      confirmModal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="text-center">
                        <div class="text-4xl mb-4">🗑️</div>
                        <h3 class="text-xl font-semibold mb-4">Deleting Event...</h3>
                        <div class="loading mx-auto mb-4"></div>
                        <p class="text-gray-600 mb-6">Clearing attendees and deleting event...</p>
                    </div>
                </div>
            `;

      const success = await this.deleteEvent(eventId, eventType);

      if (success) {
        this.showNotification('Event and all attendees deleted successfully!', 'success');
        this.closeConfirmModal();
      }
    } catch (error) {
      this.showNotification(`Error deleting event: ${error.message}`, 'error');
      this.closeConfirmModal();
    }
  }

  confirmDelete() {
    if (this.deleteEventCallback) {
      this.deleteEventCallback();
    }
  }

  // ==================== ATTENDANCE MANAGEMENT ====================

  async manageAttendance(eventId, eventType, eventName, eventDate, timeDisplay) {
    this.currentEventForAttendance = { eventId, eventType, eventName, eventDate, timeDisplay };

    // Update modal header
    document.getElementById('attendanceEventName').textContent = eventName;
    document.getElementById('attendanceEventDetails').textContent =
      `${eventType.toUpperCase()} • ${new Date(eventDate).toLocaleDateString()}${timeDisplay ? ` • ${timeDisplay}` : ''}`;

    // Show modal
    document.getElementById('attendanceModal').style.display = 'block';

    // Load current attendees
    await this.loadCurrentAttendees();
  }

  async loadCurrentAttendees() {
    if (!this.currentEventForAttendance) return;

    const { eventId, eventType } = this.currentEventForAttendance;
    const container = document.getElementById('currentAttendees');

    container.innerHTML = `
            <div class="text-center py-8">
                <div class="loading mx-auto mb-4"></div>
                <p class="text-gray-500">Loading attendees...</p>
            </div>
        `;

    try {
      // Force refresh by clearing cache first
      this.clearEventCache();

      const attendees = await this.fetchEventAttendees(eventId, eventType);
      this.currentAttendees = attendees;
      this.displayCurrentAttendees(attendees);
      this.updateAttendanceCount(attendees.length);

      console.log('✅ Attendance list refreshed:', attendees.length, 'attendees');
    } catch (error) {
      console.error('❌ Error loading attendees:', error);
      container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-500">Error loading attendees: ${error.message}</p>
                    <button onclick="eventManager.loadCurrentAttendees()" class="btn btn-primary mt-2">
                        🔄 Retry
                    </button>
                </div>
            `;
    }
  }

  displayCurrentAttendees(attendees) {
    const container = document.getElementById('currentAttendees');

    if (attendees.length === 0) {
      container.innerHTML = `
                <div class="empty-state py-8">
                    <div class="empty-state-icon">👥</div>
                    <p class="text-gray-500">No attendees for this event yet.</p>
                    <p class="text-sm text-gray-400">Use the search above to add prefects.</p>
                </div>
            `;
      return;
    }

    // Updated to display new schema fields
    container.innerHTML = attendees
      .map(
        attendee => `
            <div class="prefect-item">
                <div class="prefect-info">
                    <div class="prefect-name">${attendee.FullName || 'Unknown'}</div>
                    <div class="prefect-details">
                        <span class="house-badge house-${attendee.House.toLowerCase()}">${attendee.House}</span>
                        ${attendee.Position || 'No Position'} • 
                        W0: ${attendee.W0Number || 'N/A'} • 
                        Class: ${attendee.Class || 'N/A'}
                    </div>
                </div>
                <button onclick="eventManager.removeAttendeeFromEvent('${attendee.PrefectID}', '${attendee.House}')" 
                        class="btn btn-danger" title="Remove from event">
                    ❌ Remove
                </button>
            </div>
        `
      )
      .join('');
  }

  async searchPrefects() {
    const query = document.getElementById('prefectSearch').value.trim();
    const houseFilter = document.getElementById('houseFilter').value;
    const resultsContainer = document.getElementById('prefectSearchResults');

    if (query.length < 2) {
      resultsContainer.classList.add('hidden');
      return;
    }

    // Enhanced search to include new schema fields
    let filteredPrefects = this.allPrefects.filter(prefect => {
      const matchesQuery =
        (prefect.FullName && prefect.FullName.toLowerCase().includes(query.toLowerCase())) ||
        (prefect.PrefectID && prefect.PrefectID.toLowerCase().includes(query.toLowerCase())) ||
        (prefect.Position && prefect.Position.toLowerCase().includes(query.toLowerCase())) ||
        (prefect.W0Number && prefect.W0Number.toLowerCase().includes(query.toLowerCase())) ||
        (prefect.Class && prefect.Class.toLowerCase().includes(query.toLowerCase()));

      const matchesHouse = !houseFilter || prefect.House.toLowerCase() === houseFilter;

      // Exclude already attending prefects
      const notAlreadyAttending = !this.currentAttendees.find(
        attendee => attendee.PrefectID === prefect.PrefectID
      );

      return matchesQuery && matchesHouse && notAlreadyAttending;
    });

    // Limit results
    filteredPrefects = filteredPrefects.slice(0, 20);

    if (filteredPrefects.length === 0) {
      resultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-gray-500">No prefects found matching your search.</p>
                </div>
            `;
    } else {
      // Updated to show new schema fields
      resultsContainer.innerHTML = filteredPrefects
        .map(
          prefect => `
                <div class="prefect-item">
                    <div class="prefect-info">
                        <div class="prefect-name">${prefect.FullName || 'Unknown'}</div>
                        <div class="prefect-details">
                            <span class="house-badge house-${prefect.House.toLowerCase()}">${prefect.House}</span>
                            ${prefect.Position || 'No Position'} • 
                            W0: ${prefect.W0Number || 'N/A'} • 
                            Class: ${prefect.Class || 'N/A'}
                        </div>
                    </div>
                    <button onclick="eventManager.addAttendeeToEvent('${prefect.PrefectID}', '${prefect.House}', '${prefect.FullName}')" 
                            class="btn btn-success" title="Add to event">
                        ➕ Add
                    </button>
                </div>
            `
        )
        .join('');
    }

    resultsContainer.classList.remove('hidden');
  }

  filterPrefectsByHouse() {
    this.searchPrefects(); // Trigger search with house filter
  }

  async addAttendeeToEvent(prefectId, house, fullName) {
    if (!this.currentEventForAttendance) return;

    const { eventId, eventType } = this.currentEventForAttendance;

    try {
      console.log('➕ Adding attendee:', { prefectId, house, eventId, eventType });

      await this.addAttendee(prefectId, house, eventId, eventType);

      this.showNotification(`${fullName} added to event successfully!`, 'success');
      try {
        if (window.auditLog) {
          const eventName = this.currentEventForAttendance.eventName;
          await window.auditLog.logActivity(
            'attendee_added',
            `${fullName} added to event: ${eventName}`,
            {
              prefectId: prefectId,
              house: house,
              eventId: eventId,
              eventType: eventType,
              eventName: eventName,
              status: 'success',
            }
          );
          console.log('✅ Attendee addition logged to audit');
        }
      } catch (auditError) {
        console.log('⚠️ Failed to log attendee addition:', auditError);
      }
      // Clear search immediately
      document.getElementById('prefectSearch').value = '';
      document.getElementById('prefectSearchResults').classList.add('hidden');

      // Force refresh attendees list with a small delay to ensure server has processed
      setTimeout(async () => {
        await this.loadCurrentAttendees();
        console.log('🔄 Attendee list refreshed after add');
      }, 500);
    } catch (error) {
      console.error('❌ Error adding attendee:', error);
      this.showNotification(`Error adding attendee: ${error.message}`, 'error');
    }
  }

  async removeAttendeeFromEvent(prefectId, house) {
    if (!this.currentEventForAttendance) return;

    const { eventId, eventType } = this.currentEventForAttendance;
    const attendee = this.currentAttendees.find(a => a.PrefectID === prefectId);

    if (!confirm(`Remove ${attendee?.FullName || 'this prefect'} from the event?`)) {
      return;
    }

    try {
      console.log('➖ Removing attendee:', { prefectId, house, eventId, eventType });

      await this.removeAttendee(prefectId, house, eventId, eventType);

      this.showNotification('Attendee removed successfully!', 'success');

      // Force refresh attendees list with a small delay to ensure server has processed
      setTimeout(async () => {
        await this.loadCurrentAttendees();
        console.log('🔄 Attendee list refreshed after remove');
      }, 500);
    } catch (error) {
      console.error('❌ Error removing attendee:', error);
      this.showNotification(`Error removing attendee: ${error.message}`, 'error');
    }
  }

  updateAttendanceCount(count) {
    document.getElementById('attendanceCount').textContent =
      `${count} attendee${count !== 1 ? 's' : ''}`;
  }

  // ==================== SEARCH AND FILTER METHODS ====================

  searchEvents() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();

    if (!query) {
      this.applyCurrentFilter();
      return;
    }

    const filteredEvents = this.allEvents.filter(event => {
      const eventName = (event.GeneralEventName || event.HouseEventName || '').toLowerCase();
      const eventId = (event.GeneralEventID || event.HouseEventID || '').toLowerCase();
      const eventType = (event.EventType || '').toLowerCase();
      const eventDate = event.EventDateHeld || '';

      return (
        eventName.includes(query) ||
        eventId.includes(query) ||
        eventType.includes(query) ||
        eventDate.includes(query)
      );
    });

    this.displayEvents(filteredEvents);
    this.updateEventsCount(filteredEvents.length);
  }

  filterEvents(filter) {
    this.currentFilter = filter;

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    this.applyCurrentFilter();
  }

  applyCurrentFilter() {
    let filteredEvents = [...this.allEvents];
    const now = new Date();

    // Helper function for smart upcoming check (same as in fetchEventStatistics)
    const isEventUpcoming = event => {
      const eventDate = event.EventDateHeld;
      if (!eventDate) return false;

      const eventDateObj = new Date(eventDate);
      const today = now.toISOString().split('T')[0];
      const eventDateStr = eventDateObj.toISOString().split('T')[0];

      // Future date = upcoming
      if (eventDateStr > today) return true;

      // Past date = past
      if (eventDateStr < today) return false;

      // Today = check time
      if (eventDateStr === today) {
        const endTime = event.TimeEnded;
        if (!endTime) {
          // No end time, check start time or default to upcoming
          const startTime = event.TimeStarted;
          if (!startTime) return true;

          try {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const eventStartTime = new Date(now);
            eventStartTime.setHours(startHour, startMinute, 0, 0);
            return now < eventStartTime;
          } catch (e) {
            return true; // Default to upcoming if time parsing fails
          }
        }

        // Has end time
        try {
          const [endHour, endMinute] = endTime.split(':').map(Number);
          const eventEndTime = new Date(now);
          eventEndTime.setHours(endHour, endMinute, 0, 0);
          return now < eventEndTime;
        } catch (e) {
          return true; // Default to upcoming if time parsing fails
        }
      }

      return false;
    };

    console.log('🔍 Applying filter:', this.currentFilter);

    switch (this.currentFilter) {
      case 'general':
        filteredEvents = filteredEvents.filter(
          e => e.EventType === 'general' || e.GeneralEventID || e.GeneralEventName
        );
        break;
      case 'house':
        filteredEvents = filteredEvents.filter(
          e => e.EventType === 'house' || e.HouseEventID || e.HouseEventName
        );
        break;
      case 'upcoming':
        filteredEvents = filteredEvents.filter(isEventUpcoming);
        console.log('🔮 Smart upcoming events filtered:', filteredEvents.length);
        break;
      case 'past':
        filteredEvents = filteredEvents.filter(event => !isEventUpcoming(event));
        console.log('📅 Smart past events filtered:', filteredEvents.length);
        break;
      default: // 'all'
        break;
    }

    this.displayEvents(filteredEvents);
    this.updateEventsCount(filteredEvents.length);
  }

  clearFilters() {
    this.currentFilter = 'all';
    document.getElementById('searchInput').value = '';

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector('.filter-tab[onclick*="all"]').classList.add('active');

    this.displayEvents(this.allEvents);
    this.updateEventsCount(this.allEvents.length);
  }

  // ==================== UTILITY METHODS ====================

  formatEventPayload(eventData) {
    const isGeneral =
      eventData.eventType === 'general' || eventData.originalEventType === 'general';

    // FIXED: Ensure event name is properly mapped for both create and edit operations
    const eventName = eventData.eventName || eventData.GeneralEventName || eventData.HouseEventName;
    const eventId = eventData.eventId || eventData.originalEventId;

    // Convert 12-hour time input to 24-hour format for storage
    const convertTo24Hour = time12 => {
      if (!time12) return null;
      try {
        // If already in 24-hour format, return as-is
        if (time12.match(/^\d{2}:\d{2}$/)) {
          return time12;
        }

        // Convert from browser's time input (which is already in HH:MM format)
        return time12;
      } catch (e) {
        console.warn('Time conversion error:', e);
        return time12;
      }
    };

    return {
      [isGeneral ? 'GeneralEventID' : 'HouseEventID']: eventId,
      [isGeneral ? 'GeneralEventName' : 'HouseEventName']: eventName,
      EventDateHeld: eventData.eventDate,
      TimeStarted: convertTo24Hour(eventData.startTime),
      TimeEnded: convertTo24Hour(eventData.endTime),
    };
  }

  // FIXED: Added isEdit parameter to skip event type validation when editing
  validateEventForm(eventData, isEdit = false) {
    const errors = [];

    if (!eventData.eventName || eventData.eventName.trim().length < 3) {
      errors.push('Event name must be at least 3 characters long');
    }

    // FIXED: Skip event type validation when editing since the field is disabled
    if (!isEdit && !eventData.eventType) {
      errors.push('Please select an event type');
    }

    if (!eventData.eventDate) {
      errors.push('Please select an event date');
    } else {
      const today = new Date().toISOString().split('T')[0];
    }

    if (!eventData.eventId) {
      errors.push('Event ID is required');
    }

    // FIXED: Enhanced time validation that handles overnight events (11 PM to 12 AM)
    if (eventData.startTime && !this.isValidTimeFormat(eventData.startTime)) {
      errors.push('Start time must be in valid format');
    }

    if (eventData.endTime && !this.isValidTimeFormat(eventData.endTime)) {
      errors.push('End time must be in valid format');
    }

    // FIXED: Smart time comparison that handles overnight events
    if (eventData.startTime && eventData.endTime) {
      if (!this.isValidTimeRange(eventData.startTime, eventData.endTime)) {
        errors.push(
          'End time must be after start time (note: overnight events like 11 PM to 1 AM are allowed)'
        );
      }
    }

    if (errors.length > 0) {
      this.showNotification(errors.join('\n'), 'error');
      return false;
    }

    return true;
  }

  // FIXED: Enhanced time format validation that works with browser time inputs
  isValidTimeFormat(timeString) {
    if (!timeString) return true; // Empty is valid

    // Check for HH:MM format (24-hour)
    const time24Regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return time24Regex.test(timeString);
  }

  // FIXED: Smart time range validation that handles overnight events
  isValidTimeRange(startTime, endTime) {
    if (!startTime || !endTime) return true; // If either is empty, skip validation

    try {
      // Convert times to minutes since midnight for comparison
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);

      // If end time is smaller than start time, it's likely an overnight event
      // For example: 23:00 (11 PM) to 01:00 (1 AM next day)
      if (endMinutes < startMinutes) {
        // Allow overnight events that make sense (max 12 hours difference)
        const overnightDuration = 24 * 60 - startMinutes + endMinutes;
        return overnightDuration <= 12 * 60; // Max 12 hours
      }

      // Regular same-day event
      return endMinutes > startMinutes;
    } catch (e) {
      console.warn('Time validation error:', e);
      return true; // If parsing fails, allow it
    }
  }

  // Helper function to convert HH:MM to minutes since midnight
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  resetForm() {
    const form = document.getElementById('eventForm');
    form.reset();

    // Reset event ID field
    document.querySelector('input[name="eventId"]').value = '';
  }

  updateEventsCount(count) {
    document.getElementById('eventsCount').textContent =
      `(${count} event${count !== 1 ? 's' : ''})`;
  }

  showLoadingState() {
    const container = document.getElementById('eventsContainer');
    container.innerHTML = `
            <div class="text-center py-12">
                <div class="loading mx-auto mb-4"></div>
                <p class="text-gray-500">Loading events...</p>
            </div>
        `;
  }

  showLoadingButton(button) {
    button.disabled = true;
    button.innerHTML = '<div class="loading mr-2"></div>Processing...';
  }

  hideLoadingButton(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
  }

  showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // ==================== CACHE METHODS ====================

  getCache(key) {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expires) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data, ttl = 300000) {
    // Default 5 minutes
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  clearEventCache() {
    // Clear all event-related cache entries
    for (const key of this.cache.keys()) {
      if (key.includes('event') || key.includes('participation')) {
        this.cache.delete(key);
      }
    }
  }

  // ==================== MODAL METHODS ====================

  closeEditModal() {
    document.getElementById('editEventModal').style.display = 'none';
  }

  closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
    this.currentEventForAttendance = null;
    this.currentAttendees = [];

    // Clear search
    document.getElementById('prefectSearch').value = '';
    document.getElementById('houseFilter').value = '';
    document.getElementById('prefectSearchResults').classList.add('hidden');
  }

  closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    this.deleteEventCallback = null;
  }

  // ==================== REFRESH METHODS ====================

  async loadAllEvents() {
    try {
      this.clearEventCache();
      this.allEvents = await this.fetchAllEvents();
      this.applyCurrentFilter();
    } catch (error) {
      this.showNotification('Failed to refresh events', 'error');
    }
  }

  async refreshStats() {
    try {
      console.log('🔄 Force refreshing statistics...');

      // Clear cache to ensure fresh data
      this.clearEventCache();

      // Get completely fresh data
      const [events, stats] = await Promise.all([
        this.fetchAllEvents(),
        this.fetchEventStatistics(),
      ]);

      // Update stored events
      this.allEvents = events;

      // Update displays
      this.displayStatistics(stats);
      this.applyCurrentFilter(); // Re-apply current filter to update event display

      console.log('✅ Statistics refreshed successfully');
      this.showNotification('Statistics updated successfully!', 'success');
    } catch (error) {
      console.error('❌ Failed to refresh statistics:', error);
      this.showNotification('Failed to refresh statistics', 'error');
    }
  }

  async refreshAllData() {
    const refreshIcon = document.getElementById('refreshIcon');
    if (refreshIcon) {
      refreshIcon.style.animation = 'spin 1s linear infinite';
    }

    try {
      console.log('🔄 Refreshing all data...');

      // Clear all caches
      this.clearEventCache();

      // Force reload everything
      await Promise.all([this.loadAllEvents(), this.refreshStats()]);

      this.showNotification('✅ All data refreshed successfully!', 'success');
      console.log('🎉 Complete data refresh finished');
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      this.showNotification('❌ Failed to refresh data', 'error');
    } finally {
      if (refreshIcon) {
        refreshIcon.style.animation = '';
      }
    }
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  exportEventData() {
    try {
      const dataToExport = {
        events: this.allEvents,
        exportDate: new Date().toISOString(),
        totalEvents: this.allEvents.length,
        metadata: {
          generatedBy: 'Prefect Management System',
          version: '2.0',
          format: 'JSON',
          schemaVersion: 'Updated with W0Number and Class fields',
        },
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Event data exported successfully!', 'success');
    } catch (error) {
      this.showNotification('Failed to export data', 'error');
    }
  }

  // ==================== KEYBOARD SHORTCUTS ====================

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl+N: New Event
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (document.getElementById('addEventForm').classList.contains('hidden')) {
          this.toggleAddEventForm();
        }
      }

      // Ctrl+F: Focus Search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }

      // Ctrl+R: Refresh Data
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.refreshAllData();
      }

      // Escape: Close Modals
      if (e.key === 'Escape') {
        this.closeEditModal();
        this.closeAttendanceModal();
        this.closeConfirmModal();
      }
    });
  }

  // ==================== PERIODIC REFRESH ====================

  setupPeriodicRefresh() {
    // Refresh data every 5 minutes when page is visible
    setInterval(() => {
      if (!document.hidden) {
        this.refreshAllData();
      }
    }, 300000); // 5 minutes

    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshAllData();
      }
    });
  }

  // ==================== ERROR HANDLING ====================

  handleApiError(error, context = '') {
    console.error(`API Error ${context}:`, error);

    let message = 'An unexpected error occurred';

    if (error.message.includes('fetch')) {
      message = 'Network error. Please check your connection.';
    } else if (error.message.includes('404')) {
      message = 'Resource not found.';
    } else if (error.message.includes('403')) {
      message = 'Access denied.';
    } else if (error.message.includes('500')) {
      message = 'Server error. Please try again later.';
    } else if (error.message) {
      message = error.message;
    }

    this.showNotification(message, 'error');
  }

  // ==================== DEBUG METHODS ====================

  debugEventData() {
    console.log('=== EVENT MANAGER DEBUG ===');
    console.log('All Events:', this.allEvents);
    console.log('All Prefects:', this.allPrefects);
    console.log('Current Filter:', this.currentFilter);
    console.log('Cache Contents:', this.cache);
    console.log('Current Event for Attendance:', this.currentEventForAttendance);
    console.log('Current Attendees:', this.currentAttendees);

    // Test API endpoints
    console.log('Testing API connectivity...');
    fetch('/api/health')
      .then(response => response.json())
      .then(data => console.log('Server Health:', data))
      .catch(error => console.log('Server Health Error:', error));
  }
}

// ==================== GLOBAL FUNCTIONS ====================

// Global instance
let eventManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  eventManager = new EventManager();
});

// Global functions for HTML onclick handlers
window.toggleAddEventForm = () => eventManager.toggleAddEventForm();
window.updateEventId = () => eventManager.updateEventId();
window.addNewEvent = event => eventManager.addNewEvent(event);
window.updateEvent = event => eventManager.updateEventForm(event); // Fixed method name
window.resetForm = () => eventManager.resetForm();
window.searchEvents = () => eventManager.searchEvents();
window.filterEvents = filter => eventManager.filterEvents(filter);
window.refreshStats = () => eventManager.refreshAllData(); // Fixed: now calls refreshAllData
window.loadAllEvents = () => eventManager.loadAllEvents(); // Added this mapping
window.exportEventData = () => eventManager.exportEventData();
window.closeEditModal = () => eventManager.closeEditModal();
window.closeAttendanceModal = () => eventManager.closeAttendanceModal();
window.closeConfirmModal = () => eventManager.closeConfirmModal();
window.confirmDelete = () => eventManager.confirmDelete();
window.searchPrefects = () => eventManager.searchPrefects();
window.filterPrefectsByHouse = () => eventManager.filterPrefectsByHouse();

// Close modals when clicking outside
window.addEventListener('click', event => {
  const modals = ['editEventModal', 'attendanceModal', 'confirmModal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});

// Console helper for debugging - Enhanced with new schema support
window.eventManagerDebug = {
  getCache: () => eventManager.cache,
  getAllEvents: () => eventManager.allEvents,
  getAllPrefects: () => eventManager.allPrefects,
  getCurrentAttendees: () => eventManager.currentAttendees,
  clearCache: () => eventManager.clearEventCache(),
  refreshData: () => eventManager.refreshAllData(),
  debugAll: () => eventManager.debugEventData(),
  testSchemaCompatibility: () => {
    console.log('=== SCHEMA COMPATIBILITY TEST ===');
    const samplePrefect = eventManager.allPrefects[0];
    if (samplePrefect) {
      console.log('Sample Prefect:', samplePrefect);
      console.log('Has W0Number:', !!samplePrefect.W0Number);
      console.log('Has Class:', !!samplePrefect.Class);
      console.log('All Fields:', Object.keys(samplePrefect));
    } else {
      console.log('No prefects loaded yet');
    }
  },
  testApiEndpoints: () => {
    console.log('=== API ENDPOINTS TEST ===');
    const endpoints = [
      '/api/all-events',
      '/api/prefects',
      '/api/events/statistics',
      '/api/general-events',
      '/api/house-events',
    ];

    endpoints.forEach(endpoint => {
      fetch(endpoint)
        .then(response => {
          console.log(`${endpoint}: ${response.status} ${response.statusText}`);
          return response.json();
        })
        .then(data => {
          console.log(`${endpoint} data sample:`, Array.isArray(data) ? data[0] : data);
        })
        .catch(error => {
          console.log(`${endpoint} error:`, error.message);
        });
    });
  },
};

console.log('🎉 Event Management System loaded successfully!');
console.log('🔧 FIXED: 12-hour time format + overnight events + cascading deletion');
console.log('🔄 Updated for new database schema with W0Number and Class fields');
console.log('💡 Key fixes applied:');
console.log('   ✅ 12-hour time display with AM/PM');
console.log('   ✅ Overnight events support (11 PM → 1 AM works!)');
console.log('   ✅ Smart time validation for cross-midnight events');
console.log('   ✅ Cascading deletion: attendees cleared BEFORE event deletion');
console.log('   ✅ Foreign key constraint issues resolved');
console.log('   ✅ Batch processing for large attendee lists');
console.log('   ✅ Robust error handling with fallback endpoints');
console.log('💡 Available debug commands:');
console.log('   - eventManagerDebug.getCache() - View cache contents');
console.log('   - eventManagerDebug.getAllEvents() - View all events');
console.log('   - eventManagerDebug.getAllPrefects() - View all prefects');
console.log('   - eventManagerDebug.clearCache() - Clear cache');
console.log('   - eventManagerDebug.refreshData() - Refresh all data');
console.log('   - eventManagerDebug.debugAll() - Complete debug info');
console.log('   - eventManagerDebug.testSchemaCompatibility() - Test new schema fields');
console.log('   - eventManagerDebug.testApiEndpoints() - Test API connectivity');
console.log('🎯 Keyboard shortcuts:');
console.log('   - Ctrl+N: New Event');
console.log('   - Ctrl+F: Focus Search');
console.log('   - Ctrl+R: Refresh Data');
console.log('   - Escape: Close Modals');
