/// <reference types="vite/client" />
// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from "electron";
import * as path from "path";
const run_path = path.join(path.resolve(__dirname, ""), "../../");
import * as fs from "fs";
import Store from "electron-store";
var store = new Store();
import contextMenu from "electron-context-menu";

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

app.commandLine.appendSwitch("enable-experimental-web-platform-features", "enable");
app.commandLine.appendSwitch("disable-web-security");

app.whenReady().then(() => {
    create_main_window(store.get("window.last") as string);
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
    })) as BrowserWindow;

    if (r?.m) main_window.maximize();
    if (typeof r?.x == "number") main_window.setBounds({ x: r.x });
    if (typeof r?.y == "number") main_window.setBounds({ y: r.y });

    main_to_search_l[window_name] = [];

    let url = "https://xlinkote.netlify.app/#" + (id || "");

    // 自定义界面
    main_window.loadURL(url);

    if (dev) main_window.webContents.openDevTools();

    main_window.webContents.setWindowOpenHandler(({ url }) => {
        create_main_window(new URL(url).hash.slice(1));
        return { action: "deny" };
    });

    main_window.on("close", () => {
        store.set(`window.${id}`, {
            x: main_window.getNormalBounds().x,
            y: main_window.getNormalBounds().y,
            w: main_window.getNormalBounds().width,
            h: main_window.getNormalBounds().height,
            m: main_window.isMaximized(),
        });
    });
    main_window.on("closed", () => {
        delete main_window_l[window_name];
        store.set("window.last", id);
    });

    return window_name;
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
            search_w.close();
        }, 1000);
    });
    search_w.webContents.on("focus", () => {
        clearTimeout(close_time);
    });
}
