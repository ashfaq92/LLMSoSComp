import fs from 'fs';
import fetch from 'node-fetch';


export function getDeviceUrlFromTDD(tddPath, deviceName) {
    /**
     * Get the URL for a device by deviceName from a TDD (Thing Description Directory) JSON file.
     * @param {string} tddPath - Path to the TDD JSON file
     * @param {string} deviceName - Name of the device to look up (case-insensitive)
     * @returns {string} URL of the device
     * @throws if device not found or file error
     */
    let url = null;
    try {
        const tddRaw = fs.readFileSync(tddPath, 'utf-8');
        const tdd = JSON.parse(tddRaw);
        if (Array.isArray(tdd.things)) {
            const entry = tdd.things.find(t => t.deviceName && t.deviceName.toLowerCase() === deviceName.toLowerCase());
            if (entry && entry.url) {
                url = entry.url;
            }
        }
        if (!url) {
            throw new Error(`No device '${deviceName}' found in ${tddPath}`);
        }
        return url;
    } catch (err) {
        throw new Error(`Failed to read device '${deviceName}' URL from ${tddPath}: ${err.message}`);
    }
}



// Generic helper to proxy an action from the system Thing to a device Thing
export function proxyActionHandler(targetThing, targetAction) {
    return async (input) => {
        // console.log(`Proxy handler called for action: ${targetAction} with input:`, input);
        try {
            await targetThing.invokeAction(targetAction, input);
            console.log(`Proxied action ${targetAction} to device successfully`);
            return { status: 'ok' };
        } catch (err) {
            console.error(`Proxying action ${targetAction} failed:`, err);
            return { status: 'error', error: err.message || String(err) };
        }
    };
}



// Generic helper to proxy an action to a Node-RED HTTP endpoint
export function  proxyNodeRedActionHandler(endpointUrl) {
    return async (input) => {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: input ? JSON.stringify(input) : undefined
        });
        if (!response.ok) throw new Error('Node-RED workflow failed');
        let result;
        try {
            result = await response.json();
        } catch {
            result = { status: 'Node-RED workflow triggered' };
        }
        return result;
    };
}