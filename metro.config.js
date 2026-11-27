// Configuration de l'outil qui assemble l'app : on lui fait ignorer le dossier de l'app PC.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const desktopDir = path.join(__dirname, 'desktop').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${desktopDir}[/\\\\].*`)];

module.exports = config;
