/// <reference types="vite/client" />
// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell, Tray } from "electron";
import * as path from "path";
const run_path = path.join(path.resolve(__dirname, ""), "../../");
import * as fs from "fs";
import Store from "electron-store";
let default_setting = {
    主要: {
        硬件加速: true,
        后台: false,
    },
    外观: { 深色模式: "system", 缩放: 1, 字体: { 主要字体: "sans-serif", 等宽字体: "monospace", 大小: 16 } },
    笔记: { 摘录: "" },
    搜索: {
        引擎: [
            ["Google", "https://www.google.com/search?q=%s"],
            ["百度", "https://www.baidu.com/s?wd=%s"],
            ["必应", "https://cn.bing.com/search?q=%s"],
            ["Yandex", "https://yandex.com/search/?text=%s"],
        ],
        默认: "必应",
    },
    网络: {
        代理: {
            mode: "direct",
            pacScript: "",
            proxyRules: "",
            proxyBypassRules: "",
        },
    },
    更新: {
        检查更新: true,
        频率: "setting",
        dev: false,
        上次更新时间: 0,
    },
};
var store = new Store({ defaults: default_setting });
import contextMenu from "electron-context-menu";
import url from "node:url";

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

function t(t: string) {
    return t;
}

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

app.commandLine.appendSwitch("enable-experimental-web-platform-features", "enable");
app.commandLine.appendSwitch("disable-web-security");
if (!store.get("主要.硬件加速")) {
    app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
    create_main_window(store.get("window.last") as string);

    function neww() {
        let main_window = new BrowserWindow({
            backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
            icon: the_icon,
            show: false,
            frame: false,
        });
        main_window.loadURL("https://xlinkote.netlify.app");
        return main_window;
    }
    let main_window = neww();

    let tray = new Tray(
        process.platform == "linux" ? `${run_path}/assets/logo/32x32.png` : `${run_path}/assets/logo/16x16.png`
    );
    let contextMenu = Menu.buildFromTemplate([
        {
            label: t("摘录"),
            click: () => {
                create_main_window(store.get("笔记.摘录"));
            },
        },
        {
            label: t("设置"),
            click: () => {
                create_setting_window();
            },
        },
        {
            type: "separator",
        },
        {
            label: t("重启"),
            click: () => {
                app.relaunch();
                app.exit(0);
            },
        },
        {
            label: t("退出"),
            click: () => {
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);

    nativeTheme.themeSource = store.get("外观.深色模式") as "system" | "light" | "dark";
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
async function create_main_window(id: string) {
    var window_name = new Date().getTime();
    let r = store.get(`window.${id}`) as { x: number; y: number; w: number; h: number; m: boolean };
    var main_window = (main_window_l[window_name] = new BrowserWindow({
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
        icon: the_icon,
        show: true,
        width: r?.w || 800,
        height: r?.h || 600,
        webPreferences: {
            defaultFontFamily: store.get("外观.字体.主要字体"),
            defaultFontSize: store.get("外观.字体.主要字体") as number,
        },
    })) as BrowserWindow;

    if (r?.m) main_window.maximize();
    if (typeof r?.x == "number") main_window.setBounds({ x: r.x });
    if (typeof r?.y == "number") main_window.setBounds({ y: r.y });

    main_to_search_l[window_name] = [];

    let url = "https://xlinkote.netlify.app/#" + (id || "");

    // 自定义界面
    main_window.loadURL(url);

    if (dev) main_window.webContents.openDevTools();

    await main_window.webContents.session.setProxy(store.get("网络.代理"));

    main_window.webContents.setWindowOpenHandler(({ url }) => {
        create_main_window(new URL(url).hash.slice(1));
        return { action: "deny" };
    });

    main_window.webContents.on("did-finish-load", () => {
        main_window.webContents.setZoomFactor((store.get("外观.缩放") as number) || 1.0);
    });
    main_window.on("close", () => {
        store.set(`window.${id || ""}`, {
            x: main_window.getNormalBounds().x,
            y: main_window.getNormalBounds().y,
            w: main_window.getNormalBounds().width,
            h: main_window.getNormalBounds().height,
            m: main_window.isMaximized(),
        });
    });
    main_window.on("closed", () => {
        delete main_window_l[window_name];
        store.set("window.last", id || "");
        check_w();
    });

    return window_name;
}

function check_w() {
    if (BrowserWindow.getAllWindows().length == 1 && !store.get("主要.后台")) {
        app.quit();
    }
}

contextMenu({
    prepend: (defaultActions, parameters, browserWindow) => [
        {
            label: "搜索“{selection}”",
            visible: parameters.selectionText.trim().length > 0,
            click: () => {
                shell.openExternal(get_search_url(parameters.selectionText));
            },
        },
        {
            label: "临时搜索“{selection}”",
            visible: parameters.selectionText.trim().length > 0,
            click: () => {
                search_window(get_search_url(parameters.selectionText));
            },
        },
    ],
    showInspectElement: false,
    showSelectAll: false,
    showSearchWithGoogle: false,
    showLookUpSelection: false,
    showLearnSpelling: false,
    labels: {
        copy: "复制",
        cut: "剪切",
        paste: "粘贴",
    },
});

function get_search_url(text: string) {
    for (let i of store.get("搜索.引擎") as [string, string][]) {
        if (i[0] == store.get("搜索.默认")) {
            return i[1].replace("%s", encodeURIComponent(text));
        }
    }
    return `https://cn.bing.com/search?q=${encodeURIComponent(text)}`;
}

function search_window(url: string) {
    let search_w = new BrowserWindow({
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
        icon: the_icon,
        show: true,
    });

    search_w.loadURL(url);

    let close_time = null;

    search_w.webContents.on("blur", () => {
        close_time = setTimeout(() => {
            if (!search_w.isDestroyed) search_w.close();
        }, 1000);
    });
    search_w.webContents.on("focus", () => {
        clearTimeout(close_time);
    });
}

/** 加载网页 */
function renderer_path(window: BrowserWindow | Electron.WebContents, file_name: string, q?: Electron.LoadFileOptions) {
    if (!q) {
        q = { query: { config_path: app.getPath("userData") } };
    } else if (!q.query) {
        q.query = { config_path: app.getPath("userData") };
    } else {
        q.query["config_path"] = app.getPath("userData");
    }
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

function create_setting_window() {
    let setting_window = new BrowserWindow({
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
        icon: the_icon,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
    });

    // 自定义界面
    renderer_path(setting_window, "setting.html");

    if (dev) setting_window.webContents.openDevTools();
}

ipcMain.on("theme", (e, v) => {
    nativeTheme.themeSource = v;
    store.set("外观.深色模式", v);
});

ipcMain.on("setting", (e, v) => {
    switch (v) {
        case "save_err":
            console.log("设置保存错误");
            break;

        default:
            break;
    }
});
