import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
// 如果页面空白，可以尝试使用简单版本：import App from "./App-simple.vue";
import App from "./App.vue";

console.log("开始初始化 Vue 应用...");
console.log("Vue createApp:", typeof createApp);
console.log("ElementPlus:", typeof ElementPlus);
console.log("window.electronAPI:", typeof window.electronAPI);

// 检查 electronAPI 是否可用
if (!window.electronAPI) {
  console.warn("警告: window.electronAPI 未定义，preload 脚本可能未正确加载");
  console.warn("这可能是正常的，如果 preload 脚本正在加载中");
}

const app = createApp(App);

// 错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.error("Vue 错误:", err, info);
  // 不显示 alert，避免阻塞
  console.error("错误详情:", {
    error: err,
    instance: _instance,
    info: info,
  });
};

app.use(ElementPlus);
console.log("ElementPlus 已注册");

// 检查 DOM 元素
const appElement = document.getElementById("app");
console.log("app 元素:", appElement);

if (!appElement) {
  console.error("找不到 #app 元素！");
  document.body.innerHTML =
    '<div style="padding: 20px; color: red; font-size: 16px;">错误: 找不到 #app 元素</div>';
} else {
  // 挂载应用
  try {
    app.mount("#app");
    console.log("应用已成功挂载到 #app");
  } catch (error: any) {
    console.error("应用挂载失败:", error);
    console.error("错误堆栈:", error.stack);
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 20px; color: red; font-size: 16px;">
          <h2>应用挂载失败</h2>
          <p>错误信息: ${error.message}</p>
          <p>请查看控制台获取更多信息</p>
        </div>
      `;
    }
  }
}
