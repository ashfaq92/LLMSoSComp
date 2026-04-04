import fetch from "node-fetch";

async function invokeAction(url, payload, timeoutMs = 10000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const options = { method: "POST", headers: {}, signal: controller.signal };
    if (payload !== undefined) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(payload);
    }

    console.log("START:", url);
    try {
        const res = await fetch(url, options);
        const text = await res.text();
        console.log("DONE:", url, res.status, res.statusText, text);
        if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);
        return text;
    } finally {
        clearTimeout(t);
    }
}

await invokeAction("http://localhost:9100/smartaquariumsystem/actions/HandleCriticalWaterAlert");
await invokeAction("http://localhost:8000/smarthomesystem/actions/handleAlert");
console.log("SoS workflow complete");