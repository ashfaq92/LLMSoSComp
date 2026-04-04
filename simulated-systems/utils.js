import fs from 'fs';
import fetch from 'node-fetch';


export function getDeviceUrl(tddPath, deviceName) {
    try {
        return getDeviceUrlFromTDD(tddPath, deviceName);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}


export async function consumeThing(WoT, url, label) {
    try {
        const td = await WoT.requestThingDescription(url);
        const thing = await WoT.consume(td);
        console.log(`SmartHomeSystem: Consumed ${label} at`, url);
        return thing;
    } catch (err) {
        console.error(`SmartHomeSystem: Failed to consume ${label}:`, err);
        process.exit(1);
    }
}

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

async function unwrapWotData(maybeWrapped) {
    if (maybeWrapped && typeof maybeWrapped.value === 'function') {
        return await maybeWrapped.value();
    }
    return maybeWrapped;
}

export function proxyActionHandler(targetThing, targetAction) {
    return async (input) => {
        try {
            // Unwrap incoming action input from exposed Thing
            const realInput = await unwrapWotData(input);

            // Invoke consumed Thing action
            const interactionOutput = await targetThing.invokeAction(targetAction, realInput);

            // Unwrap ActionInteractionOutput to primitive/object value
            const realOutput = await unwrapWotData(interactionOutput);

            console.log('Proxied action', targetAction, 'input:', realInput);
            console.log('Proxied action', targetAction, 'output:', realOutput);

            return realOutput;
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