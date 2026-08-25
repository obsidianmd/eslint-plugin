import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noElectronIpc.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-electron-ipc", rule, {
	valid: [
		{
			name: "normal obsidian import is allowed",
			code: "import { app } from 'obsidian';",
		},
		{
			name: "unrelated identifier is allowed",
			code: "const renderer = new Renderer();",
		},
		{
			name: "different package with electron in name is allowed",
			code: "import electron from 'some-electron-utils';",
		},
		{
			name: "importing non-IPC APIs from electron is allowed",
			code: "import { app, BrowserWindow } from 'electron';",
		},
	],
	invalid: [
		{
			name: "importing ipcRenderer from electron is forbidden",
			code: "import { ipcRenderer } from 'electron';",
			errors: [{ messageId: "electronIpc", data: { api: "ipcRenderer" } }],
		},
		{
			name: "importing ipcMain from electron is forbidden",
			code: "import { ipcMain } from 'electron';",
			errors: [{ messageId: "electronIpc", data: { api: "ipcMain" } }],
		},
		{
			name: "accessing electron.ipcRenderer is forbidden",
			code: "electron.ipcRenderer.send('test');",
			errors: [{ messageId: "electronIpc", data: { api: "ipcRenderer" } }],
		},
		{
			name: "accessing electron.ipcMain is forbidden",
			code: "electron.ipcMain.on('test', () => {});",
			errors: [{ messageId: "electronIpc", data: { api: "ipcMain" } }],
		},
		{
			name: "importing both ipcRenderer and ipcMain from electron reports two errors",
			code: "import { ipcRenderer, ipcMain } from 'electron';",
			errors: [
				{ messageId: "electronIpc", data: { api: "ipcRenderer" } },
				{ messageId: "electronIpc", data: { api: "ipcMain" } },
			],
		},
	],
});
