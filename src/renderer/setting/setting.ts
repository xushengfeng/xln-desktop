/// <reference types="vite/client" />
let config_path = new URLSearchParams(location.search).get("config_path");
const path = require("path") as typeof import("path");
const { shell, ipcRenderer } = require("electron") as typeof import("electron");
const os = require("os") as typeof import("os");
const fs = require("fs") as typeof import("fs");

document.querySelectorAll("#tab_bar a").forEach((el: HTMLAnchorElement) => {
    let url = new URL(el.href);
    url.search = location.search;
    el.href = url.toString();
});

let old_store = JSON.parse(fs.readFileSync(path.join(config_path, "config.json"), "utf-8")) as typeof default_setting;
function t(t: string) {
    return t;
}

let default_setting = {
    主要: {
        硬件加速: true,
        后台: false,
    },
    外观: { 深色模式: "", 缩放: 1, 字体: { 主要字体: "", 等宽字体: "", 大小: 14 } },
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

if (old_store?.["window"]) default_setting["window"] = old_store["window"];
if (old_store?.搜索?.引擎) default_setting.搜索.引擎 = old_store.搜索.引擎;

function add_o(t1: Object, t2: Object) {
    let ot = structuredClone(t1);
    function w(i: string, o1: Object, o2: Object) {
        if (typeof o1[i] == "object") {
            for (let x in o1[i]) {
                if (o2[i]) w(x, o1[i], o2[i]);
            }
        } else {
            if (o2[i]) o1[i] = o2[i];
        }
    }
    for (let i in ot) {
        w(i, ot, t2);
    }
    console.log(ot);

    return ot;
}

old_store = add_o(default_setting, old_store) as typeof default_setting;

const xstore = old_store;

let store = { path: path.join(config_path, "config.json") };

document.getElementById("set_default_setting").onclick = () => {
    if (confirm("将会把所有设置恢复成默认，无法撤销")) {
        ipcRenderer.send("setting", "set_default_setting");
        give_up = true;
        location.reload();
    }
};

document.getElementById("menu").onclick = (e) => {
    let el = <HTMLElement>e.target;
    if (el.tagName == "LI") {
        let i = 0;
        document
            .getElementById("menu")
            .querySelectorAll("li")
            .forEach((lel, n) => {
                if (lel == el) {
                    i = n;
                    return;
                }
            });
        document.getElementsByTagName("html")[0].scrollTop = document.querySelectorAll("h1")[i].offsetTop;
    }
};

function get_radio(el: HTMLElement) {
    return (<HTMLInputElement>el.querySelector("input[type=radio]:checked")).value;
}
function set_radio(el: HTMLElement, value: string) {
    (
        <HTMLInputElement>el.querySelector(`input[type=radio][value="${value}"]`) ||
        el.querySelector(`input[type=radio]`)
    ).checked = true;
}

let 缩放l = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.2, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
for (let i of 缩放l) {
    let op = document.createElement("option");
    op.value = String(i);
    op.innerText = Math.floor(i * 100) + "%";
    document.getElementById("全局缩放").append(op);
}
let font_size_l = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 56, 64, 72];
for (let i of font_size_l) {
    let op = document.createElement("option");
    op.value = String(i);
    op.innerText = String(i);
    document.getElementById("字体大小").append(op);
}
const font_size_el = document.getElementById("字体大小") as HTMLInputElement;
font_size_el.onchange = () => {
    字体.大小 = Number(font_size_el.value);
};

let font_l = ["sans-serif", "serif", "monospace"];
// @ts-ignore
for (let i of await window.queryLocalFonts()) {
    if (!font_l.includes(i.family)) {
        font_l.push(i.family);
    }
}
for (let i of font_l) {
    let op = document.createElement("option");
    op.value = i;
    op.innerText = i;
    document.getElementById("主要字体").append(op.cloneNode(true));
    document.getElementById("等宽字体").append(op);
}

(<HTMLInputElement>document.getElementById("后台")).checked = old_store.主要.后台;

set_radio(document.getElementById("深色模式"), old_store?.外观?.深色模式);
document.getElementById("深色模式").onclick = () => {
    ipcRenderer.send("theme", get_radio(document.getElementById("深色模式")));
};

(<HTMLInputElement>document.getElementById("全局缩放")).value = String(old_store.外观.缩放);

var 字体 = old_store.外观.字体;
document.documentElement.style.setProperty("--main-font", 字体.主要字体);
document.documentElement.style.setProperty("--monospace", 字体.等宽字体);
(<HTMLInputElement>document.getElementById("主要字体")).value = 字体.主要字体;
(<HTMLInputElement>document.getElementById("等宽字体")).value = 字体.等宽字体;
(<HTMLInputElement>document.getElementById("字体大小")).value = String(字体.大小);

(<HTMLInputElement>document.getElementById("主要字体")).oninput = () => {
    字体.主要字体 = (<HTMLInputElement>document.getElementById("主要字体")).value;
    document.documentElement.style.setProperty("--main-font", 字体.主要字体);
};
(<HTMLInputElement>document.getElementById("等宽字体")).oninput = () => {
    字体.等宽字体 = (<HTMLInputElement>document.getElementById("等宽字体")).value;
    document.documentElement.style.setProperty("--monospace", 字体.等宽字体);
};

var o_搜索引擎 = old_store.搜索.引擎;
if (o_搜索引擎) {
    var text = "";
    var default_en = `<div id="默认搜索引擎">`;
    for (let i in o_搜索引擎) {
        text += `${o_搜索引擎[i][0]}, ${o_搜索引擎[i][1]}\n`;
        default_en += `<label><input type="radio" name="默认搜索引擎" value="${o_搜索引擎[i][0]}">${o_搜索引擎[i][0]}</label>`;
    }
    (<HTMLInputElement>document.getElementById("搜索引擎")).value = text;
    default_en += `</div>`;
    document.getElementById("默认搜索引擎div").innerHTML = default_en;
    set_radio(document.getElementById("默认搜索引擎"), old_store.搜索.默认);
}
document.getElementById("搜索引擎").onchange = () => {
    o_搜索引擎 = [];
    var text = (<HTMLInputElement>document.getElementById("搜索引擎")).value;
    var text_l = text.split("\n");
    var default_en = `<div id="默认搜索引擎">`;
    for (let i in text_l) {
        var r = /(\S+)\W*[,，:：]\W*(\S+)/g;
        var l = text_l[i].replace(r, "$1,$2").split(",");
        if (l[0] != "") {
            o_搜索引擎[i] = [l[0], l[1]];
            default_en += `<label><input type="radio" name="默认搜索引擎" value="${l[0]}">${l[0]}</label>`;
        }
    }
    default_en += `</div>`;
    document.getElementById("默认搜索引擎div").innerHTML = default_en;
    set_radio(document.getElementById("默认搜索引擎"), o_搜索引擎[0][0]);
};

var proxy_l = ["http", "https", "ftp", "socks"];

var 代理 = old_store.网络.代理;
set_radio(document.getElementById("代理"), 代理.mode);
(<HTMLInputElement>document.getElementById("pacScript")).value = 代理.pacScript;
get_proxy();
(<HTMLInputElement>document.getElementById("proxyBypassRules")).value = 代理.proxyBypassRules;

set_proxy_el();
document.getElementById("代理").onclick = set_proxy_el;
function set_proxy_el() {
    const m = get_radio(document.getElementById("代理"));
    const pacScript_el = document.getElementById("pacScript_p");
    const proxyRules_el = document.getElementById("proxyRules_p");
    const proxyBypassRules_el = document.getElementById("proxyBypassRules_p");
    switch (m) {
        case "direct":
            pacScript_el.style.display = proxyRules_el.style.display = proxyBypassRules_el.style.display = "none";
            break;
        case "auto_detect":
            pacScript_el.style.display = proxyRules_el.style.display = "none";
            proxyBypassRules_el.style.display = "block";
            break;
        case "pac_script":
            pacScript_el.style.display = "block";
            proxyRules_el.style.display = "none";
            proxyBypassRules_el.style.display = "block";
            break;
        case "fixed_servers":
            proxyRules_el.style.display = "block";
            pacScript_el.style.display = "none";
            proxyBypassRules_el.style.display = "block";
            break;
        case "system":
            pacScript_el.style.display = proxyRules_el.style.display = "none";
            proxyBypassRules_el.style.display = "block";
            break;
    }
}

function get_proxy() {
    let l = 代理.proxyRules.split(";") as string[];
    for (let rule of l) {
        for (let x of proxy_l) {
            if (rule.includes(x + "=")) {
                (<HTMLInputElement>document.getElementById(`proxy_${x}`)).value = rule.replace(x + "=", "");
            }
        }
    }
}
function set_proxy() {
    let l = [];
    for (let x of proxy_l) {
        let v = (<HTMLInputElement>document.getElementById(`proxy_${x}`)).value;
        if (v) {
            l.push(`${x}=${v}`);
        }
    }
    return l.join(";");
}

(<HTMLInputElement>document.getElementById("硬件加速")).checked = old_store.主要.硬件加速;

set_radio(<HTMLInputElement>document.getElementById("检查更新频率"), old_store.更新.频率);
(<HTMLInputElement>document.getElementById("dev")).checked = old_store.更新.dev;

document.getElementById("打开config").title = store.path;
document.getElementById("打开config").onclick = () => {
    shell.openPath(store.path);
};

var give_up = false;
document.getElementById("give_up_setting_b").oninput = () => {
    give_up = (<HTMLInputElement>document.getElementById("give_up_setting_b")).checked;
    if (give_up) fs.writeFileSync(store.path, JSON.stringify(old_store, null, 2));
};

window.onbeforeunload = () => {
    try {
        save_setting();
    } catch {
        ipcRenderer.send("setting", "save_err");
    }
    ipcRenderer.send("setting", "reload_main");
};

window.onblur = save_setting;

function save_setting() {
    if (give_up) return;
    old_store.主要.后台 = (<HTMLInputElement>document.getElementById("后台")).checked;
    old_store.外观.缩放 = Number((<HTMLInputElement>document.getElementById("全局缩放")).value);
    old_store.外观.字体 = 字体;
    if (o_搜索引擎) old_store.搜索.引擎 = o_搜索引擎;
    old_store.搜索.默认 = get_radio(document.getElementById("默认搜索引擎"));
    old_store.网络.代理 = {
        mode: get_radio(document.getElementById("代理")),
        pacScript: (<HTMLInputElement>document.getElementById("pacScript")).value,
        proxyRules: set_proxy(),
        proxyBypassRules: (<HTMLInputElement>document.getElementById("proxyBypassRules")).value,
    };
    old_store.主要.硬件加速 = (<HTMLInputElement>document.getElementById("硬件加速")).checked;
    old_store.更新.dev = (<HTMLInputElement>document.getElementById("dev")).checked;
    old_store.更新.频率 = get_radio(document.getElementById("检查更新频率"));
    if (user_data_path_inputed)
        fs.writeFile("preload_config", (<HTMLInputElement>document.getElementById("user_data_path")).value, (e) => {
            if (e) throw new Error(t("保存失败，请确保软件拥有运行目录的修改权限，或重新使用管理员模式打开软件"));
        });
    fs.writeFileSync(path.join(config_path, "config.json"), JSON.stringify(xstore, null, 2));
}

// 查找
document.getElementById("find_b_close").onclick = () => {
    find((<HTMLInputElement>document.getElementById("find_input")).value);
};
document.getElementById("find_input").oninput = () => {
    find((<HTMLInputElement>document.getElementById("find_input")).value);
};
document.getElementById("find_b_last").onclick = () => {
    find_focus_i = (find_focus_i - 1) % find_ranges.length;
    if (find_focus_i < 0) {
        find_focus_i = find_ranges.length - 1;
    }
    jump_to_range(find_focus_i);
};
document.getElementById("find_b_next").onclick = () => {
    find_focus_i = (find_focus_i + 1) % find_ranges.length;
    jump_to_range(find_focus_i);
};
function jump_to_range(i: number) {
    let rect = find_ranges[i].getBoundingClientRect();
    document.getElementById("find_t").innerText = `${i + 1} / ${find_ranges.length}`;
    document.documentElement.scrollTo(0, rect.top - document.body.getBoundingClientRect().top);
}
let allTextNodes = [];
window.onload = () => {
    const treeWalker = document.createTreeWalker(document.getElementById("main"), NodeFilter.SHOW_TEXT);
    let currentNode = treeWalker.nextNode();
    allTextNodes = [];
    while (currentNode) {
        allTextNodes.push(currentNode);
        currentNode = treeWalker.nextNode();
    }
    console.log(allTextNodes);
};
let find_ranges: Range[] = [];
let find_focus_i = 0;
function find(t: string) {
    // @ts-ignore
    CSS.highlights.clear();

    const str = t.trim().toLowerCase();
    if (!str) {
        document.getElementById("find_t").innerText = ``;
        return;
    }

    const ranges = allTextNodes
        .map((el) => {
            return { el, text: el.textContent.toLowerCase() };
        })
        .map(({ text, el }) => {
            const indices = [];
            let startPos = 0;
            while (startPos < text.length) {
                const index = text.indexOf(str, startPos);
                if (index === -1) break;
                indices.push(index);
                startPos = index + str.length;
            }

            return indices.map((index) => {
                const range = new Range();
                range.setStart(el, index);
                range.setEnd(el, index + str.length);
                return range;
            });
        });

    find_ranges = ranges.flat();
    find_focus_i = 0;
    jump_to_range(find_focus_i);

    // @ts-ignore
    const searchResultsHighlight = new Highlight(...ranges.flat());
    // @ts-ignore
    CSS.highlights.set("search-results", searchResultsHighlight);
}

var path_info = `<br>
                ${t("临时目录：")}${os.tmpdir()}${os.platform() == "win32" ? "\\" : "/"}xlinkote<br>
                ${t("运行目录：")}${__dirname}`;
document.createTextNode(path_info);
document.getElementById("user_data_divs").insertAdjacentHTML("afterend", path_info);
try {
    (<HTMLInputElement>document.getElementById("user_data_path")).value =
        fs.readFileSync("preload_config").toString().trim() || store.path.replace(/[/\\]config\.json/, "");
} catch (error) {
    (<HTMLInputElement>document.getElementById("user_data_path")).value = store.path.replace(/[/\\]config\.json/, "");
}
var user_data_path_inputed = false;
document.getElementById("user_data_path").oninput = () => {
    document.getElementById("user_data_divs").classList.add("user_data_divs");
    user_data_path_inputed = true;
};
document.getElementById("move_user_data").onclick = () => {
    ipcRenderer.send("setting", "move_user_data", (<HTMLInputElement>document.getElementById("user_data_path")).value);
};

document.getElementById("reload").onclick = () => {
    save_setting();
    ipcRenderer.send("setting", "reload");
};

var version = `<div>${t("本机系统内核:")} ${os.type()} ${os.release()}</div>`;
var version_l = ["electron", "node", "chrome", "v8"];
for (let i in version_l) {
    version += `<div>${version_l[i]}: ${process.versions[version_l[i]]}</div>`;
}
document.getElementById("versions_info").insertAdjacentHTML("afterend", version);

import pack from "../../../package.json?raw";
var package_json = JSON.parse(pack);
document.getElementById("name").innerHTML = package_json.name;
document.getElementById("version").innerHTML = package_json.version;
document.getElementById("description").innerHTML = t(package_json.description);
document.getElementById("version").onclick = () => {
    fetch("https://api.github.com/repos/xushengfeng/xln-desktop/releases", { method: "GET", redirect: "follow" })
        .then((response) => response.json())
        .then((re) => {
            console.log(re);
            if (document.getElementById("update_info").innerHTML) return;
            let l = [];
            for (let r of re) {
                if (
                    !package_json.version.includes("beta") &&
                    !package_json.version.includes("alpha") &&
                    !old_store.更新.dev
                ) {
                    if (!r.draft && !r.prerelease) l.push(r);
                } else {
                    l.push(r);
                }
            }
            function tag(text: string) {
                let tag = document.createElement("span");
                tag.innerText = t(text);
                return tag;
            }
            for (let i in l) {
                const r = l[i];
                let div = document.createElement("div");
                let tags = document.createElement("div");
                let h = document.createElement("h1");
                h.innerText = r.name;
                let p = document.createElement("p");
                p.innerHTML = r.body.replace(/\r\n/g, "<br>");
                div.append(tags, h, p);
                document.getElementById("update_info").append(div);
                if (i == "0") {
                    let tag_el = tag("最新版本");
                    tag_el.title = t("点击下载");
                    tag_el.classList.add("download_tag");
                    tags.append(tag_el);
                    tag_el.onclick = () => {
                        shell.openExternal(r.html_url);
                    };
                }
                if (r.name == package_json.version) {
                    tags.append(tag("当前版本"));
                    if (i != "0") {
                        (<HTMLElement>document.getElementById("menu").lastElementChild).style.color = "#335EFE";
                    }
                    break;
                }
            }
        })
        .catch((error) => console.log("error", error));
};

if (old_store.更新.频率 == "setting") {
    setTimeout(() => {
        document.getElementById("version").click();
    }, 10);
}

document.getElementById("info").innerHTML = `<div>${t("项目主页:")} <a href="${package_json.homepage}">${
    package_json.homepage
}</a></div>
    <div><a href="https://github.com/xushengfeng/xln-desktop/releases/tag/${package_json.version}">${t(
    "更新日志"
)}</a></div>
    <div><a href="https://github.com/xushengfeng/xln-desktop/issues">${t("错误报告与建议")}</a></div>
    <div>${t("本软件遵循")} <a href="https://www.gnu.org/licenses/gpl-3.0.html">${package_json.license}</a></div>
    <div>${t("本软件基于")} <a href="https://xln-desktop.vercel.app/readme/all_license.json">${t("这些软件")}</a></div>
    <div>Copyright (C) 2021 ${package_json.author.name} ${package_json.author.email}</div>`;

document.getElementById("about").onclick = (e) => {
    console.log(e.target);
    if ((<HTMLElement>e.target).tagName == "A") {
        e.preventDefault();
        shell.openExternal((<HTMLAnchorElement>e.target).href);
    }
};

ipcRenderer.on("about", (event, arg) => {
    if (arg != undefined) {
        location.hash = "#about";
    }
});
