/**
 * EventBuffer
 *
 * Buffers WoT events for MCP resource access.
 * Maintains a fixed-size circular buffer per event URI.
 */
export class EventBuffer {
    buffers = new Map();
    maxEvents;
    eventTtlMs;
    lastUpdated = new Map();
    constructor(options = {}) {
        this.maxEvents = options.maxEventsPerUri ?? 100;
        this.eventTtlMs = options.eventTtlMs ?? 60 * 60 * 1000; // 1 hour
    }
    /**
     * Add an event to the buffer
     */
    push(uri, eventType, data) {
        if (!this.buffers.has(uri)) {
            this.buffers.set(uri, []);
        }
        const buffer = this.buffers.get(uri);
        const event = {
            timestamp: new Date().toISOString(),
            eventType,
            data
        };
        buffer.push(event);
        // Enforce max size (circular buffer)
        if (buffer.length > this.maxEvents) {
            buffer.shift();
        }
        this.lastUpdated.set(uri, event.timestamp);
        return event;
    }
    /**
     * Get all events for a URI
     */
    get(uri) {
        this.pruneExpired(uri);
        return this.buffers.get(uri) ?? [];
    }
    /**
     * Get events since a specific timestamp
     */
    getSince(uri, since) {
        const events = this.get(uri);
        const sinceDate = new Date(since).getTime();
        return events.filter(e => new Date(e.timestamp).getTime() > sinceDate);
    }
    /**
     * Get the most recent N events
     */
    getRecent(uri, count) {
        const events = this.get(uri);
        return events.slice(-count);
    }
    /**
     * Get last updated timestamp for a URI
     */
    getLastUpdated(uri) {
        return this.lastUpdated.get(uri);
    }
    /**
     * Check if buffer has any events
     */
    has(uri) {
        return this.buffers.has(uri) && this.buffers.get(uri).length > 0;
    }
    /**
     * Get total event count for a URI
     */
    count(uri) {
        return this.buffers.get(uri)?.length ?? 0;
    }
    /**
     * Get all URIs with buffered events
     */
    getUris() {
        return Array.from(this.buffers.keys());
    }
    /**
     * Clear events for a URI
     */
    clear(uri) {
        this.buffers.delete(uri);
        this.lastUpdated.delete(uri);
    }
    /**
     * Clear all events
     */
    clearAll() {
        this.buffers.clear();
        this.lastUpdated.clear();
    }
    /**
     * Initialize buffer for a URI (even if no events yet)
     */
    initialize(uri) {
        if (!this.buffers.has(uri)) {
            this.buffers.set(uri, []);
        }
    }
    /**
     * Remove expired events from a buffer
     */
    pruneExpired(uri) {
        const buffer = this.buffers.get(uri);
        if (!buffer)
            return;
        const cutoff = Date.now() - this.eventTtlMs;
        const pruned = buffer.filter(e => new Date(e.timestamp).getTime() > cutoff);
        if (pruned.length !== buffer.length) {
            this.buffers.set(uri, pruned);
        }
    }
    /**
     * Get summary statistics
     */
    getStats() {
        let totalEvents = 0;
        let oldestEvent;
        for (const [, buffer] of this.buffers) {
            totalEvents += buffer.length;
            if (buffer.length > 0) {
                const oldest = buffer[0].timestamp;
                if (!oldestEvent || oldest < oldestEvent) {
                    oldestEvent = oldest;
                }
            }
        }
        return {
            totalEvents,
            uriCount: this.buffers.size,
            oldestEvent
        };
    }
}
