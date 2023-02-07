/// <reference types="vite/client" />
// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, nativeTheme, BrowserView } from "electron";
import * as path from "path";
const run_path = path.join(path.resolve(__dirname, ""), "../../");
import * as fs from "fs";
import url from "node:url";
const cors = require("cors-anywhere");

// 自定义用户路径
try {
    var userDataPath = fs.readFileSync(path.join(run_path, "preload_config")).toString().trim();
    if (userDataPath) {
        if (app.isPackaged) {
            userDataPath = path.join(run_path, "../../", userDataPath);
        } else {
            userDataPath = path.join(run_path, userDataPath);
        }
        app.setPath("userData", userDataPath);
    }
} catch (e) {}

// 其他应用打开
if (process.platform == "linux")
    ipcMain.on("run_path", (event) => {
        event.returnValue = run_path;
    });

var /** 是否开启开发模式 */ dev: boolean;
// 自动开启开发者模式
if (process.argv.includes("-d") || import.meta.env.DEV) {
    dev = true;
} else {
    dev = false;
}

/** 加载网页 */
function renderer_path(window: BrowserWindow | Electron.WebContents, file_name: string, q?: Electron.LoadFileOptions) {
    if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
        let main_url = `${process.env["ELECTRON_RENDERER_URL"]}/${file_name}`;
        let x = new url.URL(main_url);
        if (q) {
            if (q.search) x.search = q.search;
            if (q.query) {
                for (let i in q.query) {
                    x.searchParams.set(i, q.query[i]);
                }
            }
            if (q.hash) x.hash = q.hash;
        }
        window.loadURL(x.toString());
    } else {
        window.loadFile(path.join(__dirname, "../renderer", file_name), q);
    }
}

app.commandLine.appendSwitch("enable-experimental-web-platform-features", "enable");

var server = cors
    .createServer({
        originWhitelist: [],
        requireHeader: ["origin", "x-requested-with"],
        removeHeaders: ["cookie", "cookie2"],
    })
    .listen(18888, "localhost", () => {});

app.whenReady().then(() => {
    create_main_window();
});

app.on("window-all-closed", () => {
    server.close();
});

var the_icon = null;
if (process.platform == "win32") {
    the_icon = path.join(run_path, "assets/logo/icon.ico");
} else {
    the_icon = path.join(run_path, "assets/logo/1024x1024.png");
}

const isMac = process.platform === "darwin";

// 主页面
var main_window_l: { [n: number]: BrowserWindow } = {};

/**
 * @type {Object.<number, Array.<number>>}
 */
var main_to_search_l: { [n: number]: Array<number> } = {};
async function create_main_window() {
    var window_name = new Date().getTime();
    var main_window = (main_window_l[window_name] = new BrowserWindow({
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
        icon: the_icon,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
        show: true,
    })) as BrowserWindow & { html: string };

    main_to_search_l[window_name] = [];

    // 自定义界面
    renderer_path(main_window, "index.html");

    if (dev) main_window.webContents.openDevTools();

    main_window.on("close", () => {
        for (let i of main_window.getBrowserViews()) {
            // @ts-ignore
            i?.webContents?.destroy();
        }
    });

    main_window.on("closed", () => {
        delete main_window_l[window_name];
    });

    main_window.webContents.on("found-in-page", (e, r) => {
        main_window.webContents.send("found", r.activeMatchOrdinal, r.matches);
    });

    // 浏览器大小适应
    main_window.on("resize", () => {
        setTimeout(() => {
            var [w, h] = main_window.getContentSize();
            for (let i of main_window.getBrowserViews()) {
                if (i.getBounds().width != 0) i.setBounds({ x: 0, y: 32, width: w, height: h - 32 });
            }
        }, 0);
    });

    return window_name;
}

var search_window_l: { [n: number]: BrowserView } = {};
ipcMain.on("open_url", (event, url) => {
    create_browser(BrowserWindow.fromWebContents(event.sender), url);
});

/** 创建浏览器页面 */
async function create_browser(window: BrowserWindow, url: string) {
    var win_name = new Date().getTime();

    let main_window = window;

    if (main_window.isDestroyed()) return;
    min_views(main_window);
    var view = new Date().getTime();
    let security = true;
    var search_view = (search_window_l[view] = new BrowserView({ webPreferences: { webSecurity: security } }));
    window.addBrowserView(search_view);
    search_view.webContents.loadURL(url);
    var [w, h] = main_window.getContentSize();
    search_view.setBounds({ x: 0, y: 32, width: w, height: h - 32 });
    main_window.setContentSize(w, h + 1);
    main_window.setContentSize(w, h);
    search_view.webContents.setWindowOpenHandler(({ url }) => {
        create_browser(main_window, url);
        return { action: "deny" };
    });
    if (dev) search_view.webContents.openDevTools();
    if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "new", url);
    search_view.webContents.on("page-title-updated", (event, title) => {
        if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "title", title);
    });
    search_view.webContents.on("page-favicon-updated", (event, favlogo) => {
        if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "icon", favlogo);
    });
    search_view.webContents.on("did-navigate", (event, url) => {
        if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "url", url);
    });
    search_view.webContents.on("did-start-loading", () => {
        if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "load", true);
    });
    search_view.webContents.on("did-stop-loading", () => {
        if (!main_window.isDestroyed()) main_window.webContents.send("url", win_name, view, "load", false);
    });
    search_view.webContents.on("did-fail-load", (event, err_code, err_des) => {
        renderer_path(search_view.webContents, "browser_bg.html", {
            query: { type: "did-fail-load", err_code: String(err_code), err_des },
        });
        if (dev) search_view.webContents.openDevTools();
    });
    search_view.webContents.on("render-process-gone", () => {
        renderer_path(search_view.webContents, "browser_bg.html", { query: { type: "render-process-gone" } });
        if (dev) search_view.webContents.openDevTools();
    });
    search_view.webContents.on("unresponsive", () => {
        renderer_path(search_view.webContents, "browser_bg.html", { query: { type: "unresponsive" } });
        if (dev) search_view.webContents.openDevTools();
    });
    search_view.webContents.on("responsive", () => {
        search_view.webContents.loadURL(url);
    });
    search_view.webContents.on("certificate-error", () => {
        renderer_path(search_view.webContents, "browser_bg.html", { query: { type: "certificate-error" } });
        if (dev) search_view.webContents.openDevTools();
    });
}

ipcMain.on("tab_view", (e, id, arg, arg2) => {
    let main_window = BrowserWindow.fromWebContents(e.sender);
    let search_window = search_window_l[id];
    switch (arg) {
        case "close":
            main_window.removeBrowserView(search_window);
            // @ts-ignore
            search_window.webContents.destroy();
            delete search_window_l[id];
            if (main_window.getBrowserViews().length == 0) {
                main_window.close();
            }
            break;
        case "top":
            // 有时直接把主页面当成浏览器打开，这时pid未初始化就触发top了，直接忽略
            if (!main_window) return;
            main_window.setTopBrowserView(search_window);
            min_views(main_window);
            search_window.setBounds({
                x: 0,
                y: 32,
                width: main_window.getContentBounds().width,
                height: main_window.getContentBounds().height - 32,
            });
            break;
        case "stop":
            search_window.webContents.stop();
            break;
        case "reload":
            search_window.webContents.reload();
            break;
        case "save_html":
            main_window["html"] = arg2;
            min_views(main_window);
            break;
        case "dev":
            search_window.webContents.openDevTools();
            break;
    }
});

/** 最小化某个窗口的所有标签页 */
function min_views(main_window: BrowserWindow) {
    for (let v of main_window.getBrowserViews()) {
        v.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    }
}
