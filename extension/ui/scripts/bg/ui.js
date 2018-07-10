/*
 * Copyright 2018 Gildas Lormeau
 * contact : gildas.lormeau <at> gmail.com
 * 
 * This file is part of SingleFile.
 *
 *   SingleFile is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU Lesser General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   SingleFile is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU Lesser General Public License for more details.
 *
 *   You should have received a copy of the GNU Lesser General Public License
 *   along with SingleFile.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global singlefile, navigator */

singlefile.ui = (() => {

	const browser = this.browser || this.chrome;

	const DEFAULT_ICON_PATH = "/extension/ui/resources/icon_19.png";
	const WAIT_ICON_PATH_PREFIX = "/extension/ui/resources/icon_19_wait";
	const DEFAULT_TITLE = "Process this page with SingleFile";
	const DEFAULT_COLOR = [2, 147, 20, 255];
	const BADGE_PROPERTIES = [{ name: "text", browserActionMethod: "setBadgeText" }, { name: "color", browserActionMethod: "setBadgeBackgroundColor" }, { name: "title", browserActionMethod: "setTitle" }, { name: "path", browserActionMethod: "setIcon" }];
	const RUNNING_IN_EDGE = navigator.userAgent.includes("Edge");

	const tabs = {};
	const badgeTabs = {};
	let badgeRefreshPending = [];

	return {
		init(tabId) {
			tabs[tabId] = {
				id: tabId,
				text: "...",
				color: DEFAULT_COLOR,
				title: "initializing...",
				path: DEFAULT_ICON_PATH,
				progress: -1,
				barProgress: -1
			};
			refreshBadge(tabId);
		},
		error(tabId) {
			const tabData = tabs[tabId];
			tabData.text = "ERR";
			tabData.color = [229, 4, 12, 255];
			tabData.title = DEFAULT_TITLE;
			tabData.path = DEFAULT_ICON_PATH;
			tabData.progress = -1;
			tabData.barProgress = -1;
			refreshBadge(tabId);
		},
		end(tabId) {
			const tabData = tabs[tabId];
			tabData.text = "OK";
			tabData.color = [4, 229, 36, 255];
			tabData.title = DEFAULT_TITLE;
			tabData.path = DEFAULT_ICON_PATH;
			tabData.progress = -1;
			tabData.barProgress = -1;
			refreshBadge(tabId);
		},
		progress(tabId, index, maxIndex) {
			const tabData = tabs[tabId];
			const progress = Math.max(Math.min(100, Math.floor((index / maxIndex) * 100)), 0);
			if (tabData.progress != progress) {
				tabData.progress = progress;
				tabData.text = "";
				tabData.title = "progress: " + Math.min(100, Math.floor((index / maxIndex) * 100)) + "%";
				tabData.color = [4, 229, 36, 255];
				const barProgress = Math.floor((index / maxIndex) * 15);
				if (tabData.barProgress != barProgress) {
					tabData.barProgress = barProgress;
					tabData.path = WAIT_ICON_PATH_PREFIX + barProgress + ".png";
				}
				refreshBadge(tabId);
			}
		},
		removed(tabId) {
			delete tabs[tabId];
		},
		active(tabId, isActive) {
			if (isActive) {
				browser.browserAction.enable(tabId);
			} else {
				browser.browserAction.disable(tabId);
			}
		}
	};

	async function refreshBadge(tabId) {
		await Promise.all(badgeRefreshPending);
		const promise = refreshBadgeAsync(tabId);
		badgeRefreshPending.push(promise);
		await promise;
		badgeRefreshPending = badgeRefreshPending.filter(pending => pending != promise);
	}

	async function refreshBadgeAsync(tabId) {
		for (let property of BADGE_PROPERTIES) {
			await refreshBadgeProperty(tabId, property.name, property.browserActionMethod);
		}
	}

	async function refreshBadgeProperty(tabId, property, browserActionMethod) {
		const tabData = tabs[tabId];
		const value = tabData[property];
		if (!badgeTabs[tabId]) {
			badgeTabs[tabId] = {};
		}
		if (JSON.stringify(badgeTabs[tabId][property]) != JSON.stringify(value)) {
			const browserActionParameter = { tabId };
			badgeTabs[tabId][property] = browserActionParameter[property] = value;
			return new Promise(resolve => {
				if (RUNNING_IN_EDGE) {
					browser.browserAction[browserActionMethod](browserActionParameter);
					resolve();
				} else {
					browser.browserAction[browserActionMethod](browserActionParameter, resolve);
				}
			});
		}
	}

})();
