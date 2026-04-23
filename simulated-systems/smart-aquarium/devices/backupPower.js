import { Servient } from '@node-wot/core';
import * as httpBinding from '@node-wot/binding-http';

const HttpServer = httpBinding.HttpServer || httpBinding.default?.HttpServer;

class BackupPower {
    async enableBackupPower() {
        console.log("🔋 Backup power enabled");
    }
}


const port = 9114;
const servient = new Servient();
servient.addServer(new HttpServer({ port: port }));


servient.start().then(async (WoT) => {
    console.log('Simulated BackupPower Device starting...');
    const backupPower = new BackupPower();
    const thing = await WoT.produce({
        title: "BackupPower",
        "@context": ["https://www.w3.org/2022/wot/td/v1.1"],
        "@type": ["Thing"],
        securityDefinitions: { no_sec: { scheme: "nosec" } },
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

    thing.setActionHandler("enableBackupPower", backupPower.enableBackupPower.bind(backupPower));
    await thing.expose();
    console.log(`BackupPower exposed at http://localhost:${port}/backuppower`);
    const td = await thing.getThingDescription();
    try {
        await fetch('http://localhost:9101/things', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(td)
        });
    } catch (err) {
        console.warn('Could not register TD with TDD:', err.message);
    }
});
