#!/usr/bin/env node

const helpers = require('./helpers');
const chokidar = require('chokidar');
const colors = require('colors');
const argv = require('yargs').argv;

let main;
let watchParse;

/* Secure mode */

let secureMode = false;
if (argv.secure) secureMode = true;

let uninstallMode = true;
if (argv['dont-uninstall']) uninstallMode = false;

/* Watch files and repeat drill
 * Add a watcher, call main wrapper to repeat cycle
 */

let initializeWatchers = (currentModules) => {
    let watcher = chokidar.watch('**/*.js', {
        ignored: 'node_modules'
    });
    watcher
        .on('change', path => watchParse(currentModules, path))
        .on('unlink', path => watchParse(currentModules, path));

    console.log('Watchers initialized');
};

/* Main wrapper
 * Get installed modules from package.json
 * Get used modules from all files
 * Install used modules that are not installed
 * Remove installed modules that are not used
 * After setup, initialize watchers
 */

main = () => {
    let installedModules = [];
    let usedModules = [];

    if (!helpers.packageJSONExists()) {
        console.log(colors.red('package.json does not exist'));
        console.log(colors.red('You can create one by using `npm init`'));
        return;
    }


    installedModules = helpers.getInstalledModules();
    usedModules = helpers.getUsedModules();
    usedModules = helpers.filterRegistryModules(usedModules);

    // removeUnusedModules
    if (uninstallMode) {
        let unusedModules = helpers.diff(installedModules, usedModules);
        for (let module of unusedModules) helpers.uninstallModule(module);
    }

    // installModules
    let modulesNotInstalled = helpers.diff(usedModules, installedModules);
    usedModules = deduplicate(usedModules);

    for (let module of modulesNotInstalled) {
        if (secureMode) helpers.installModuleIfTrusted(module);
        else helpers.installModule(module);
    }

    //helpers.cleanup();
    initializeWatchers(usedModules);
};

watchParse = (currentModules, modifiedFilePath) => {
    let unusedModules;
    let modulesNotInstalled;

    let modulesBeforeFileChange = currentModules.filter(module => helpers.isSamePath(module.fileName, modifiedFilePath));
    let modulesAfterFileChange = helpers.getUsedModules(modifiedFilePath);
    modulesAfterFileChange = helpers.filterRegistryModules(modulesAfterFileChange);
    // removeUnusedModules
    if (uninstallMode) {
        unusedModules = helpers.diff(modulesBeforeFileChange, modulesAfterFileChange);
    }
    modulesNotInstalled = helpers.diff(modulesAfterFileChange, modulesBeforeFileChange);

    console.log(unusedModules);
    console.log(modulesNotInstalled);
}

/* Turn the key */
main();