import { MasterList } from "./background";
import { getAnime } from "./getAnime";
// need to import so webpack can bundle tailwind classes that are usable by the html
import "./globals.css";

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

    // update the rating as the user interacts with the slider
    const ratingInput = document.getElementById("rating") as HTMLInputElement;
    if (ratingInput) {
        ratingInput.addEventListener("input", () => {
            const rating = document.getElementById("ratingValue");
            if (rating) {
                rating.innerText = ratingInput.value;
            }
        });
    }

    // add event listener for submit button
    const submitButton = document.getElementById("addSubmit");
    if (submitButton) {
        submitButton.addEventListener("click", () => {
            const ratingInput = document.getElementById(
                "rating"
            ) as HTMLInputElement;
            const linkInput = document.getElementById(
                "linkInput"
            ) as HTMLInputElement;

            const link = linkInput.value;
            if (link.length === 0) {
                // set error text at #errorLink
                document.getElementById("errorLink")!.innerText =
                    "Link cannot be empty";
                return;
            }

            // get id by deleting getting the 2nd to last part of the link
            const id = parseInt(link.split("/").slice(-2)[0]);
            console.log(id);
            if (!id) {
                // set error text at #errorLink
                document.getElementById("errorLink")!.innerText =
                    "Link is invalid";
                return;
            }

            console.log(ratingInput.value, link);

            getAnime(id).then((data) => {
                // send message to background script to add to list
                //     chrome.runtime.sendMessage(
                //         {
                //             type: "add",
                //             username: username.value,
                //             id: id.value,
                //             password: password.value,
                //         },
                //         function (response) {
                //             console.log(response);
                //         }
                //     );
                // });

                document.getElementById(
                    "successText"
                )!.innerText = `Added ${data.title_english} to your list`;
            });
        });
    }
};

const injectHomePage = async () => {
    await injectPage(Menu.Home);

    let username: string | undefined = undefined;
    let masterList: MasterList | undefined = undefined;
    try {
        const response = await getList();
        username = response.username;
        masterList = response.masterList;
    } catch (e) {
        // set error text or smthn here
        console.log(e);
        return;
    }

    if (!masterList || !username || !masterList[username]) {
        console.log(masterList);

        console.log(
            "WTWN: alot of things could be wrong here but probably trying to access a list of a user doesn't exist"
        );

        return;
    }

    const animeDisplay = document.getElementById("animeDisplay");
    const exampleDisplay = document.getElementById("exampleDisplay");

    if (!animeDisplay || !exampleDisplay) {
        return;
    }

    // for each key in the list
    const list = masterList[username];
    for (const id in list) {
        const data = await getAnime(parseInt(id));
        const clonedDisplay = exampleDisplay.cloneNode(true) as Element;
        clonedDisplay.className = ""; // remove hidden class

        clonedDisplay.querySelector("img")!.src = data.images.jpg.image_url;

        // slice off characters after 35
        let title = data.title_english;
        if (title.length > 35) {
            title = title.slice(0, 35) + "...";
        }
        clonedDisplay.querySelector("theTitle")!.textContent = title;

        // apply the genres
        type TagEntry = {
            mal_id: number;
            type: string;
            name: string;
            url: string;
        };

        let genres = "";
        data.genres.forEach((genre: TagEntry) => {
            genres += `${genre.name}, `;
        });
        genres = genres.slice(0, -2);
        clonedDisplay.querySelector("genre")!.textContent += genres;

        // apply themes
        let themes = "";
        data.themes.forEach((theme: TagEntry) => {
            themes += `${theme.name}, `;
        });
        themes = themes.slice(0, -2);
        clonedDisplay.querySelector("theme")!.textContent += themes;

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

        // TODO: add edit function later, still need to figure out how i want the slider to look like
        // clonedDisplay.querySelector("button")!.addEventListener("click", () => {
        //     console.log("edit", id);
        // });

        animeDisplay.appendChild(clonedDisplay);

        const spacer = document.createElement("div");
        spacer.className = "mb-4";
        animeDisplay.appendChild(spacer);
    }
};

// get list from background script
const getList = async () => {
    return await new Promise<{
        username: string;
        masterList: MasterList;
    }>((resolve, reject) => {
        chrome.runtime.sendMessage("getList", function (response) {
            const username = response.username;
            const masterList: MasterList = response.masterList;

            if (username === "") {
                reject("User is not logged in");
                return;
            }

            document.getElementById("username")!.innerText = username;

            resolve({ username, masterList });
        });
    });
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
            // injectPage(Menu.Settings);
        });
    }

    await injectHomePage();
});
