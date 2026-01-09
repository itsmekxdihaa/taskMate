import { app as e, BrowserWindow as t } from "electron";
import n from "path";
import { fileURLToPath as a } from "url";
const l = a(import.meta.url), i = n.dirname(l);
let o;
function r() {
  o = new t({
    width: 1e3,
    height: 700,
    webPreferences: {
      preload: n.join(i, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), process.env.VITE_DEV_SERVER_URL ? o.loadURL(process.env.VITE_DEV_SERVER_URL) : o.loadFile(n.join(i, "../dist/index.html"));
}
e.on("window-all-closed", () => {
  process.platform !== "darwin" && e.quit();
});
e.on("activate", () => {
  t.getAllWindows().length === 0 && r();
});
e.whenReady().then(r);
