// 测试开发服务器启动
const { spawn } = require('child_process');

console.log('开始启动开发服务器...\n');

const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit'
});

devProcess.on('error', (error) => {
  console.error('启动失败:', error);
});

devProcess.on('exit', (code) => {
  console.log(`\n进程退出，代码: ${code}`);
});

// 10秒后提示
setTimeout(() => {
  console.log('\n提示:');
  console.log('1. 如果 Electron 窗口已打开，请检查窗口内容');
  console.log('2. 打开开发者工具查看控制台输出 (Ctrl+Shift+I 或 Cmd+Option+I)');
  console.log('3. 查看控制台中的调试信息');
  console.log('4. 如果页面空白，检查是否有 JavaScript 错误');
}, 10000);
