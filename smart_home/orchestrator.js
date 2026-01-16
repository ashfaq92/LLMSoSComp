#!/usr/bin/env node

/**
 * Smart Home Orchestrator
 * Starts the entire smart home ecosystem:
 * 1. Thing Directory (port 8080)
 * 2. Device Simulators (ports 8081-8083)
 * 3. Generic Device Adapter Service (ports 9000+)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const processes = [];

function startProcess(name, script, cwd = process.cwd()) {
  return new Promise((resolve) => {
    console.log(`⏳ Starting ${name}...`);
    
    const proc = spawn('node', [script], { 
      cwd,
      stdio: 'inherit',
      shell: true 
    });
    
    processes.push(proc);
    
    // Give it time to start
    setTimeout(() => {
      console.log(`✅ ${name} started\n`);
      resolve(proc);
    }, 2000);
  });
}

async function start() {
  console.log('\n🏠 Smart Home Ecosystem Starting...\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // 1. Start Thing Directory
    await startProcess(
      '📚 Thing Directory',
      'smart_home/thingDirectory.js'
    );
    
    // 2. Start Device Simulators
    await startProcess(
      '💡 Light Device',
      'smart_home/devices/lightDevice.js'
    );
    
    await startProcess(
      '🌡️  Thermostat Device',
      'smart_home/devices/thermostatDevice.js'
    );
    
    await startProcess(
      '🔒 Door Lock Device',
      'smart_home/devices/doorLockDevice.js'
    );
    
    // 3. Start Generic Adapter (watches directory)
    await startProcess(
      '🚀 Generic Device Adapter',
      'smart_home/devices/genericDeviceAdapter.js'
    );
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n🎉 Smart Home Ecosystem Ready!\n');
    console.log('📚 Thing Directory:      http://localhost:8080/things/all');
    console.log('💡 Light Device:         http://localhost:8081/.well-known/wot');
    console.log('🌡️  Thermostat Device:    http://localhost:8082/.well-known/wot');
    console.log('🔒 Door Lock Device:     http://localhost:8083/.well-known/wot');
    console.log('\n⚡ Generic Adapters (auto-created on ports 9000+)\n');
    console.log('Press Ctrl+C to stop all services\n');
    
  } catch (error) {
    console.error('❌ Failed to start ecosystem:', error.message);
    cleanup();
    process.exit(1);
  }
}

function cleanup() {
  console.log('\n\n🛑 Shutting down Smart Home Ecosystem...');
  processes.forEach(proc => {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

start().catch(console.error);
