/// <reference types="vite/client" />

import close_svg from "../assets/icons/close.svg";
import reload_svg from "../assets/icons/reload.svg";

const { ipcRenderer, shell, clipboard } = require("electron") as typeof import("electron");

ipcRenderer.send("open_url", "https://xlinkote.netlify.app/");

document.body.className = "fill_t";

var li_list = [];

ipcRenderer.on("url", (event, _pid: number, id: number, arg: string, arg1: any) => {
    if (arg == "new") {
        new_tab(id, arg1);
    }
    if (arg == "title") {
        title(id, arg1);
    }
    if (arg == "url") {
        url(id, arg1);
    }
    if (arg == "load") {
        load(id, arg1);
    }
    document.getElementById("tabs").classList.add("tabs_show");
});

ipcRenderer.on("html", (e, h: string) => {
    document.getElementById("tabs").innerHTML = h;
    document
        .getElementById("tabs")
        .querySelectorAll("li")
        .forEach((li) => {
            绑定li(li);
            li_list.push(li);
        });
    document.getElementById("buttons").onclick = (e) => {
        main_event(e);
    };
    if (document.getElementById("tabs").querySelector("li")) document.getElementById("tabs").classList.add("tabs_show");
});

function 绑定li(li: HTMLLIElement) {
    let id = Number(li.id.replace("id", ""));
    li.onmouseup = (e) => {
        if (e.button == 0) {
            focus_tab(li);
        } else {
            close_tab(li, id);
        }
    };
    let button = li.querySelector("button");
    button.onclick = (e) => {
        e.stopPropagation();
        close_tab(li, id);
    };
}

function new_tab(id: number, url: string) {
    let li = <HTMLLIElement>document.getElementById("tab").cloneNode(true);
    li_list.push(li);
    li.style.display = "flex";
    li.setAttribute("data-url", url);
    document.getElementById("tabs").appendChild(li);
    li.id = "id" + id;
    绑定li(li);
    focus_tab(li);
}

function close_tab(li: HTMLElement, id: number) {
    ipcRenderer.send("tab_view", id, "close");
    var l = document.querySelectorAll("li");
    for (let i in l) {
        if (l[i] === li && document.querySelector(".tab_focus") === li) {
            // 模板排除
            if (Number(i) == l.length - 2) {
                focus_tab(l[l.length - 3]);
            } else {
                focus_tab(l[i + 1]);
            }
        }
    }
    document.getElementById("tabs").removeChild(li);
    if (document.getElementById("tabs").querySelectorAll("li").length == 0) {
        document.getElementById("tabs").classList.remove("tabs_show");
    }
}

function focus_tab(li: HTMLElement) {
    var l = document.querySelectorAll("li");
    for (let i of l) {
        if (i === li) {
            i.classList.add("tab_focus");
        } else {
            i.classList.remove("tab_focus");
        }
    }
    for (let j in li_list) {
        if (li_list[j] === li) {
            li_list.splice(Number(j), 1);
            li_list.push(li);
        }
    }

    if (li) {
        ipcRenderer.send("tab_view", li.id.replace("id", ""), "top");
        document.title = `eSearch - ${li.querySelector("span").title}`;
        document.body.classList.add("fill_t_s");
    } else {
        document.body.classList.remove("fill_t_s");
    }
}

function title(id: number, arg: string) {
    document.querySelector(`#id${id} > span`).innerHTML =
        document.getElementById(`id${id}`).querySelector(`span`).title =
        document.getElementById(`id${id}`).querySelector(`img`).title =
            arg;
    if (document.getElementById(`id${id}`).className.split(" ").includes("tab_focus"))
        document.title = `eSearch - ${arg}`;
}
function url(id: number, url: string) {
    document.querySelector(`#id${id}`).setAttribute("data-url", url);
}

function load(id: number, loading: boolean) {
    if (loading) {
        document.getElementById("reload").style.display = "none";
        document.getElementById("stop").style.display = "block";
    } else {
        document.getElementById("reload").style.display = "block";
        document.getElementById("stop").style.display = "none";
    }
}

document.getElementById("buttons").onclick = (e) => {
    main_event(e);
};
function main_event(e: MouseEvent | any) {
    var id = li_list[li_list.length - 1].id.replace("id", "");
    let el = <HTMLElement>e.target;
    if (el.id) ipcRenderer.send("tab_view", id, el.id);
}

ipcRenderer.on("view_events", (event, arg) => {
    var e = { target: { id: arg } };
    main_event(e);
});

document.getElementById("tabs").onwheel = (e) => {
    e.preventDefault();
    var i = e.deltaX + e.deltaY + e.deltaZ >= 0 ? 1 : -1;
    document.getElementById("tabs").scrollLeft += i * Math.sqrt(e.deltaX ** 2 + e.deltaY ** 2 + e.deltaZ ** 2);
};

window.onbeforeunload = () => {
    document.querySelector(".tab_focus").classList.remove("tab_focus");
    let html = document.getElementById("tabs").innerHTML;
    ipcRenderer.send("tab_view", null, "save_html", html);
};
