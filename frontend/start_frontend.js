#!/usr/bin/env node
/**
 * 使用 uv 启动 InvestAI 前端服务
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkUv() {
    return new Promise((resolve) => {
        const uvCheck = spawn('uv', ['--version']);
        uvCheck.on('close', (code) => {
            resolve(code === 0);
        });
        uvCheck.on('error', () => {
            resolve(false);
        });
    });
}

async function installDependencies() {
    return new Promise((resolve, reject) => {
        console.log('📦 Installing frontend dependencies...');
        const npm = spawn('npm', ['install'], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        npm.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
        
        npm.on('error', (err) => {
            reject(err);
        });
    });
}

async function startFrontend() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting InvestAI frontend with Vite...');
        const vite = spawn('npm', ['run', 'dev', '--', '--port', '3001'], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        vite.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Frontend start failed with code ${code}`));
            }
        });
        
        vite.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        // 检查是否有 package.json
        if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
            throw new Error('package.json not found in frontend directory');
        }
        
        // 安装依赖
        await installDependencies();
        
        // 启动前端
        await startFrontend();
        
    } catch (error) {
        console.error('❌ Error starting frontend:', error.message);
        process.exit(1);
    }
}

// 处理中断信号
process.on('SIGINT', () => {
    console.log('\n✋ Frontend stopped by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n✋ Frontend stopped');
    process.exit(0);
});

main();