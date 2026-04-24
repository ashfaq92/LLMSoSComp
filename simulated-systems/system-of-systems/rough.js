import { Servient } from '@node-wot/core';
import pkg from '@node-wot/binding-http';
const { HttpClientFactory } = pkg;

const s = new Servient();
s.addClientFactory(new HttpClientFactory());
const WoT = await s.start();

const td = await (await fetch('http://localhost:8100/smarthomething')).json();
const home = await WoT.consume(td);

await home.writeProperty('occupancyStatus', 'away');
console.log('Set occupancyStatus to away');