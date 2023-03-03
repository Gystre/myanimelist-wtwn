import { MasterList, PTWList, RequestType, SearchIndex } from "./background";
// need to import so webpack can bundle tailwind classes that are usable by the html
import "./globals.css";
import { decodeSearchIndex } from "./searchIndexSerialization";

enum Menu {
    Home,
    Add,
    Settings,
}

const injectPage = async (page: Menu) => {
    const main = document.getElementById("main");
    if (!main) {
        console.log("WTWN: main element didn't load in time?");
        return;
    }

    // delete all children in main
    // TODO: keep track of event listenrs and remove them
    while (main.firstChild) {
        main.removeChild(main.firstChild);
    }

    let pageName = "";
    switch (page) {
        case Menu.Home:
            pageName = "home";
            break;
        case Menu.Add:
            pageName = "add";
            break;
        case Menu.Settings:
            pageName = "settings";
            break;
    }

    // inject
    await new Promise((resolve) => {
        fetch(chrome.runtime.getURL(`${pageName}.html`))
            .then((response) => response.text())
            .then((html) => {
                main.innerHTML = html;
                resolve(true);
            });
    });
};

const injectAddPage = async () => {
    await injectPage(Menu.Add);

    const username = await new Promise<string>(function (resolve) {
        chrome.runtime.sendMessage(
            { type: RequestType.GetUsername },
            function (response) {
                document.getElementById("username")!.innerText =
                    response.username;
                resolve(response.username);
            }
        );
    });

    const infoText = document.getElementById(
        "infoText"
    ) as HTMLParagraphElement;

    if (username == "") {
        infoText.innerText = "You aren't logged in!";
        return;
    }

    let offset = 0;
    chrome.runtime.sendMessage(
        { type: RequestType.getUnscoredPTWList, offset },
        function (response) {}
    );

    // ask background script for user's PTW list, if doesn't exist fetch it
    // also username scrape doesn't work on https://myanimelist.net/animelist/saist?status=6
};

// local copy of master list to make search as fast as possible
let cachedList: MasterList = {};
let cachedSearchIndex: SearchIndex = {};

// get list from background script
const getList = (): Promise<{
    masterList: MasterList | undefined;
    username: string | undefined;
}> => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: RequestType.GetList },
            function (response) {
                const username = response.username;
                const masterList: MasterList = response.masterList;

                // undefined if not logged in
                if (username === "") {
                    reject(new Error("User not logged in"));
                }

                cachedList = masterList;
                document.getElementById("username")!.innerText = username;
                resolve({ masterList, username });
            }
        );
    });
};

const populateHomeList = (list: PTWList) => {
    const animeDisplay = document.getElementById("animeDisplay");
    const exampleDisplay = document.getElementById("exampleDisplay");

    if (!animeDisplay || !exampleDisplay) {
        return;
    }

    // remove all nodes in in the list
    while (animeDisplay.firstChild) {
        animeDisplay.removeChild(animeDisplay.firstChild);
    }

    for (const id in list) {
        const data = list[id];
        const clonedDisplay = exampleDisplay.cloneNode(true) as Element;
        clonedDisplay.className = ""; // remove hidden class
        clonedDisplay.id = id;

        clonedDisplay.querySelector("img")!.src = data.imageUrl;

        // slice off characters after 35
        let title = data.title;
        if (title.length > 35) {
            title = title.slice(0, 35) + "...";
        }
        clonedDisplay.querySelector("theTitle")!.textContent = title;

        let genres = "";
        if (data.genres.length != 0) {
            data.genres.forEach((genre) => {
                genres += `${genre}, `;
            });
            genres = genres.slice(0, -2);
            clonedDisplay.querySelector("genre")!.textContent += genres;
        } else {
            clonedDisplay.querySelector("genre")!.remove();
        }

        let themes = "";
        if (data.themes.length != 0) {
            data.themes.forEach((theme) => {
                themes += `${theme}, `;
            });
            themes = themes.slice(0, -2);
            clonedDisplay.querySelector("theme")!.textContent += themes;
        } else {
            clonedDisplay.querySelector("theme")!.remove();
        }

        // open in new tab
        clonedDisplay
            .querySelector("#linkButton")!
            .addEventListener("click", () => {
                chrome.tabs.create({ url: data.url });
            });

        // calculate most significant time ago
        const time = new Date().getTime() - list[id].createdAt;

        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / 1000 / 60) % 60);
        const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
        const days = Math.floor((time / (1000 * 60 * 60 * 24)) % 7);
        const weeks = Math.floor((time / (1000 * 60 * 60 * 24 * 7)) % 52);
        const years = Math.floor(time / (1000 * 60 * 60 * 24 * 7 * 52));

        function formatTimeValue(value: number, unit: string) {
            if (value === 1) {
                return `${value} ${unit} ago`;
            } else {
                return `${value} ${unit}s ago`;
            }
        }

        let timeString = "";
        if (years > 0) {
            timeString = formatTimeValue(years, "year");
        } else if (weeks > 0) {
            timeString = formatTimeValue(weeks, "week");
        } else if (days > 0) {
            timeString = formatTimeValue(days, "day");
        } else if (hours > 0) {
            timeString = formatTimeValue(hours, "hour");
        } else if (minutes > 0) {
            timeString = formatTimeValue(minutes, "minute");
        } else {
            timeString = formatTimeValue(seconds, "second");
        }

        clonedDisplay.querySelector("timestamp")!.textContent =
            `Added ` + timeString;

        const scoreInput = clonedDisplay.querySelector(
            "#scoreInput"
        ) as HTMLInputElement;
        scoreInput.value = list[id].score.toString();

        let oldScore = list[id].score;
        const saveButton = clonedDisplay.querySelector(
            "#saveButton"
        ) as Element;

        saveButton.addEventListener("click", () => {
            const score = scoreInput.value;
            const id = clonedDisplay.id;

            if (score === oldScore.toString()) {
                saveButton.classList.add("text-red-500");
                saveButton.classList.add("animate-shakeSideToSide");
                setTimeout(() => {
                    saveButton.classList.remove("text-red-500");
                    saveButton.classList.remove("animate-shakeSideToSide");
                }, 500);

                return;
            }

            chrome.runtime.sendMessage(
                {
                    type: RequestType.SetScore,
                    id: id,
                    score: score,
                },
                function () {
                    // in case user wants to set it back to their original score
                    oldScore = parseInt(score);

                    saveButton.classList.add("text-green-500");
                    saveButton.classList.add("animate-shakeUpAndDown");
                    setTimeout(() => {
                        saveButton.classList.remove("text-green-500");
                        saveButton.classList.remove("animate-shakeUpAndDown");
                    }, 500);
                }
            );
        });

        animeDisplay.appendChild(clonedDisplay);

        const spacer = document.createElement("div");
        spacer.className = "mb-4";
        animeDisplay.appendChild(spacer);
    }
};

const injectHomePage = async () => {
    await injectPage(Menu.Home);

    const { masterList, username } = await getList();

    if (!username) {
        console.log("WTWN: user isn't logged in");
        return;
    }

    if (
        !masterList ||
        (Object.keys(masterList).length === 0 &&
            masterList.constructor === Object)
    ) {
        console.log("WTWN: current user has no anime in list");

        return;
    }

    if (!masterList[username]) {
        console.log(username, masterList);
        console.log(
            "WTWN: trying to access a list of a user that doesn't exist"
        );
        return;
    }

    // get the search index
    cachedSearchIndex = await new Promise<SearchIndex>((resolve) => {
        chrome.runtime.sendMessage(
            { type: RequestType.GetSearchIndexJSON },
            function (response) {
                resolve(decodeSearchIndex(response.searchIndexJSON));
            }
        );
    });

    const list = masterList[username];
    const searchInput = document.getElementById(
        "searchInput"
    ) as HTMLInputElement;

    searchInput.addEventListener("input", () => {
        if (searchInput.value.length === 0) {
            populateHomeList(list);
            return;
        }

        const keywords = searchInput.value.toLowerCase().split(" ");
        const intersection = keywords.reduce((acc, keyword) => {
            const matchingKeywords = Object.keys(cachedSearchIndex).filter(
                (k) => k.startsWith(keyword)
            );

            // no matches
            if (matchingKeywords.length === 0) return new Set<number>();

            // get the indices of each matching keyword
            const sets = matchingKeywords.map(
                (k) => cachedSearchIndex[k] || new Set()
            );

            // get the intersection of all the sets
            const intersection = sets.reduce(
                (a, b) => new Set([...a].filter((i) => b.has(i)))
            );

            // add to the accumulator
            return new Set(
                [...acc].length === 0
                    ? [...intersection]
                    : [...acc].filter((i) => intersection.has(i))
            );
        }, new Set<number>());

        let results: PTWList = {};
        for (const i of intersection) {
            results[i] = cachedList[username][i];
        }

        populateHomeList(results);
    });

    populateHomeList(list);
};

const injectSettingsPage = () => {
    injectPage(Menu.Settings);
};

document.addEventListener("DOMContentLoaded", async () => {
    // attach on click for navbar buttons
    const homeButton = document.getElementById("homeButton");
    if (homeButton) {
        homeButton.addEventListener("click", async () => {
            await injectHomePage();
        });
    }

    const addButton = document.getElementById("addButton");
    if (addButton) {
        addButton.addEventListener("click", async () => {
            await injectAddPage();
        });
    }

    const settingsButton = document.getElementById("settingsButton");
    if (settingsButton) {
        settingsButton.addEventListener("click", () => {
            injectSettingsPage();
        });
    }

    // await injectHomePage();
    await injectAddPage();
});
