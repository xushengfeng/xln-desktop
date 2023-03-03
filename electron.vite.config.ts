import { defineConfig } from "electron-vite";
import * as path from "path";

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                external: ["@electron-toolkit/utils"],
            },
        },
    },
    renderer: {
        build: {
            rollupOptions: {
                input: {
                    setting: path.resolve(__dirname, "src/renderer/setting.html"),
                },
            },
        },
    },
});
