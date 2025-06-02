// @ts-nocheck
const config = ".config";
const config2 = ".obsidian";
Object.assign({}, {foo: 1}, {bar: 2});
Object.assign(defaultConfig, config);
import {promises as fsPromises} from "fs";
import path from "path";
const re = /foo/;
const re2 = /(?<=foo)bar/;
class NotSample {}
class MyPlugin {}
app.commands.addCommand({ id: "foo", name: "bar" });
app.commands.addCommand({ id: "command-foo", name: "bar" });
class MyTab extends PluginSettingTab {}
class SampleSettingTab extends PluginSettingTab { constructor() { new Setting(this.containerEl).setName("settings").setHeading(); } }
vault.getFiles().find(f => f.size > 100);
vault.getFiles().find(f => f.path === "foo");
class MyPlugin2 { onunload() { /* nothing */ } }
class MyPlugin3 { onunload() { this.detachLeavesOfType("foo"); } }
import { PluginSettingTab, Setting, Vault } from 'obsidian';
const vault = new Vault();
