// https://docs.obsidian.md/Reference/Manifest

export type ManifestType = PluginManifest | ThemeManifest;
export type ThemeManifest = Manifest;
export type PluginManifest = Manifest & {
	id: string;
	description: string;
	isDesktopOnly: boolean;
};

type Manifest = {
	author: string;
	minAppVersion: string;
	name: string;
	version: string;
	authorUrl?: string;
	fundingUrl?: fundingUrl;
};

type fundingUrl = string | Record<string, string>;
