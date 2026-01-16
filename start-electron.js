const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');

// 直接加载主进程文件
const mainPath = path.join(__dirname, 'src/main/index.ts');

// 使用 ts-node 运行 TypeScript 文件
const child = spawn('npx', ['ts-node', mainPath], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
});

child.on('error', (err) => {
  console.error('Failed to start subprocess:', err);
});

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});
