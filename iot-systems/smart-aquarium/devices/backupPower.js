import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';
const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;
const servient = new Servient();
servient.addServer(new HttpServer({ port: 9102 }));

servient.start().then(async (WoT) => {
    console.log('Simulated BackupPower Device starting...');
    const thing = await WoT.produce({
        title: "BackupPower",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: {
            no_sec: { scheme: "nosec" }
        },
        security: ["no_sec"],
        properties: {},
        actions: {
            enableBackupPower: {
                title: "Enable Backup Power",
                description: "Enables the backup power source for the aquarium"
            }
        },
        events: {}
    });

    thing.setActionHandler("enableBackupPower", async () => {
        console.log("🔋 Backup power enabled");
        return null;
    });

    await thing.expose();
    console.log('BackupPower exposed at http://localhost:9102/backuppower');
});
