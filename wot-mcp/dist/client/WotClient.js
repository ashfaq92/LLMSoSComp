/**
 * WotClient
 *
 * Connects to WoT Things using node-wot and provides
 * a simplified interface for the MCP bridge.
 */
import { Servient } from '@node-wot/core';
import * as HttpPkg from '@node-wot/binding-http';
import * as CoapPkg from '@node-wot/binding-coap';
import * as MqttPkg from '@node-wot/binding-mqtt';
const HttpClientFactory = HttpPkg.HttpClientFactory || HttpPkg.default?.HttpClientFactory;
const HttpsClientFactory = HttpPkg.HttpsClientFactory || HttpPkg.default?.HttpsClientFactory;
const CoapClientFactory = CoapPkg.CoapClientFactory || CoapPkg.default?.CoapClientFactory;
const MqttClientFactory = MqttPkg.MqttClientFactory || MqttPkg.default?.MqttClientFactory;
import { logger } from '../utils/Logger.js';
export class WotClient {
    servient;
    wotHelper;
    consumedThings = new Map();
    eventSubscriptions = new Map();
    initialized = false;
    constructor(config = {}) {
        if (config.servient) {
            this.servient = config.servient;
        }
        else {
            this.servient = new Servient();
            if (config.http) {
                const HttpFactoryCtor = HttpClientFactory;
                let httpFactoryInstance;
                if (typeof HttpFactoryCtor === 'function') {
                    httpFactoryInstance = new HttpFactoryCtor();
                }
                else if (HttpFactoryCtor && typeof HttpFactoryCtor.default === 'function') {
                    httpFactoryInstance = new (HttpFactoryCtor.default)();
                }
                else if (HttpFactoryCtor && typeof HttpFactoryCtor.HttpClientFactory === 'function') {
                    httpFactoryInstance = new (HttpFactoryCtor.HttpClientFactory)();
                }
                else {
                    httpFactoryInstance = HttpFactoryCtor;
                }
                if (httpFactoryInstance) {
                    this.servient.addClientFactory(httpFactoryInstance);
                }
                const HttpsFactoryCtor = HttpsClientFactory;
                let httpsFactoryInstance;
                if (typeof HttpsFactoryCtor === 'function') {
                    httpsFactoryInstance = new HttpsFactoryCtor();
                }
                else if (HttpsFactoryCtor && typeof HttpsFactoryCtor.default === 'function') {
                    httpsFactoryInstance = new (HttpsFactoryCtor.default)();
                }
                else if (HttpsFactoryCtor && typeof HttpsFactoryCtor.HttpsClientFactory === 'function') {
                    httpsFactoryInstance = new (HttpsFactoryCtor.HttpsClientFactory)();
                }
                else {
                    httpsFactoryInstance = HttpsFactoryCtor;
                }
                if (httpsFactoryInstance) {
                    this.servient.addClientFactory(httpsFactoryInstance);
                }
            }
            if (config.coap) {
                const CoapFactoryCtor = CoapClientFactory;
                let coapFactoryInstance;
                if (typeof CoapFactoryCtor === 'function') {
                    coapFactoryInstance = new CoapFactoryCtor();
                }
                else if (CoapFactoryCtor && typeof CoapFactoryCtor.default === 'function') {
                    coapFactoryInstance = new (CoapFactoryCtor.default)();
                }
                else if (CoapFactoryCtor && typeof CoapFactoryCtor.CoapClientFactory === 'function') {
                    coapFactoryInstance = new (CoapFactoryCtor.CoapClientFactory)();
                }
                else {
                    coapFactoryInstance = CoapFactoryCtor;
                }
                if (coapFactoryInstance) {
                    this.servient.addClientFactory(coapFactoryInstance);
                }
            }
            if (config.mqtt) {
                const MqttFactoryCtor = MqttClientFactory;
                let mqttFactoryInstance;
                if (typeof MqttFactoryCtor === 'function') {
                    mqttFactoryInstance = new MqttFactoryCtor();
                }
                else if (MqttFactoryCtor && typeof MqttFactoryCtor.default === 'function') {
                    mqttFactoryInstance = new (MqttFactoryCtor.default)();
                }
                else if (MqttFactoryCtor && typeof MqttFactoryCtor.MqttClientFactory === 'function') {
                    mqttFactoryInstance = new (MqttFactoryCtor.MqttClientFactory)();
                }
                else {
                    mqttFactoryInstance = MqttFactoryCtor;
                }
                if (mqttFactoryInstance) {
                    this.servient.addClientFactory(mqttFactoryInstance);
                }
            }
        }
    }
    /**
     * Initialize the WoT client
     */
    async start() {
        if (this.initialized)
            return;
        this.wotHelper = await this.servient.start();
        this.initialized = true;
    }
    /**
     * Stop the client and clean up
     */
    async stop() {
        // Unsubscribe from all events
        for (const [thingId, subs] of this.eventSubscriptions) {
            for (const [, sub] of subs) {
                await sub.stop();
            }
        }
        this.eventSubscriptions.clear();
        this.consumedThings.clear();
        await this.servient.shutdown();
        this.initialized = false;
    }
    /**
     * Consume a Thing from its TD URL or object
     */
    async consume(tdOrUrl) {
        if (!this.initialized) {
            await this.start();
        }
        let td;
        if (typeof tdOrUrl === 'string') {
            td = await this.wotHelper.requestThingDescription(tdOrUrl);
        }
        else {
            td = tdOrUrl;
        }
        const thing = await this.wotHelper.consume(td);
        const thingId = this.extractThingId(td);
        logger.debug(`Consumed thing: ${thingId}`);
        const wrapper = { thing, td };
        this.consumedThings.set(thingId, wrapper);
        return wrapper;
    }
    /**
     * Get a consumed thing by ID
     */
    getThing(thingId) {
        return this.consumedThings.get(thingId);
    }
    /**
     * Get all consumed things
     */
    getAllThings() {
        return this.consumedThings;
    }
    /**
     * Read a property from a Thing
     */
    async readProperty(thingId, propertyName) {
        const wrapper = this.consumedThings.get(thingId);
        if (!wrapper) {
            throw new Error(`Thing not found: ${thingId}`);
        }
        try {
            const output = await wrapper.thing.readProperty(propertyName);
            const value = await output.value();
            logger.debug(`Read property ${thingId}.${propertyName}:`, value);
            return value;
        }
        catch (error) {
            logger.error(`Failed to read property ${thingId}.${propertyName}:`, error);
            throw new Error(`Failed to read property '${propertyName}' from '${thingId}': ${error.message || error}`);
        }
    }
    /**
     * Write a property to a Thing
     */
    async writeProperty(thingId, propertyName, value) {
        const wrapper = this.consumedThings.get(thingId);
        if (!wrapper) {
            throw new Error(`Thing not found: ${thingId}`);
        }
        try {
            logger.debug(`Writing property ${thingId}.${propertyName}:`, value);
            await wrapper.thing.writeProperty(propertyName, value);
        }
        catch (error) {
            logger.error(`Failed to write property ${thingId}.${propertyName}:`, error);
            throw new Error(`Failed to write property '${propertyName}' to '${thingId}': ${error.message || error}`);
        }
    }
    /**
     * Invoke an action on a Thing
     */
    async invokeAction(thingId, actionName, params) {
        const wrapper = this.consumedThings.get(thingId);
        if (!wrapper) {
            throw new Error(`Thing not found: ${thingId}`);
        }
        try {
            logger.debug(`Invoking action ${thingId}.${actionName} with params:`, params);
            logger.debug(`Params type: ${typeof params}, JSON: ${JSON.stringify(params)}`);
            const output = await wrapper.thing.invokeAction(actionName, params);
            if (output) {
                const result = await output.value();
                logger.debug(`Action ${thingId}.${actionName} result:`, result);
                return result;
            }
            return undefined;
        }
        catch (error) {
            logger.error(`Failed to invoke action ${thingId}.${actionName}:`, error);
            throw new Error(`Failed to invoke action '${actionName}' on '${thingId}': ${error.message || error}`);
        }
    }
    /**
     * Subscribe to events from a Thing
     */
    async subscribeEvent(thingId, eventName, callback) {
        const wrapper = this.consumedThings.get(thingId);
        if (!wrapper) {
            throw new Error(`Thing not found: ${thingId}`);
        }
        logger.debug(`Subscribing to event ${thingId}.${eventName}`);
        // Initialize subscription map for this thing
        if (!this.eventSubscriptions.has(thingId)) {
            this.eventSubscriptions.set(thingId, new Map());
        }
        const thingSubs = this.eventSubscriptions.get(thingId);
        // Unsubscribe if already subscribed
        if (thingSubs.has(eventName)) {
            await thingSubs.get(eventName).stop();
        }
        // Subscribe to the event
        const sub = await wrapper.thing.subscribeEvent(eventName, async (output) => {
            const data = await output.value();
            logger.debug(`Received event ${thingId}.${eventName}:`, data);
            callback(eventName, data);
        });
        thingSubs.set(eventName, sub);
    }
    /**
     * Unsubscribe from an event
     */
    async unsubscribeEvent(thingId, eventName) {
        const thingSubs = this.eventSubscriptions.get(thingId);
        if (!thingSubs)
            return;
        const sub = thingSubs.get(eventName);
        if (sub) {
            await sub.stop();
            thingSubs.delete(eventName);
        }
    }
    /**
     * Subscribe to all events from a Thing
     */
    async subscribeAllEvents(thingId, callback) {
        const wrapper = this.consumedThings.get(thingId);
        if (!wrapper) {
            throw new Error(`Thing not found: ${thingId}`);
        }
        const events = wrapper.td.events;
        if (!events)
            return;
        for (const eventName of Object.keys(events)) {
            await this.subscribeEvent(thingId, eventName, callback);
        }
    }
    /**
     * Extract thing ID from TD
     */
    extractThingId(td) {
        if (td.id) {
            const parts = td.id.split(/[:/]/);
            return parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        return td.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
}
