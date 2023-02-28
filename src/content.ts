import { ListData, RequestType } from "./background";

async function main() {
    // empty username = not signed in
    let username = "";

    // check for link to register if on animelist url
    // check for Sign Up text if on any other page

    // anime list and manga list will have the username in the url
    const url = window.location.href;
    const stuffAfterDotNet = url.split(".net")[1];

    if (
        stuffAfterDotNet.includes("animelist") ||
        stuffAfterDotNet.includes("mangalist")
    ) {
        const register = "/register.php";
        const links = document.querySelectorAll<HTMLAnchorElement>(
            `a[href^="${register}"]`
        );

        // user isn't signed in
        if (links.length > 1) {
            chrome.runtime.sendMessage({
                type: RequestType.SetUsername,
                username,
            });
            return;
        }

        username = url.split("/").pop() as string;
    } else {
        // user is on the main page and isn't signed in
        const signupButton = document.getElementsByClassName("btn-signup");
        if (signupButton.length > 0) {
            chrome.runtime.sendMessage({
                type: RequestType.SetUsername,
                username,
            });
            return;
        }

        // anywhere else on the site, the username will be in the profile link
        const profileUrl = "https://myanimelist.net/profile/";
        const links = document.querySelectorAll<HTMLAnchorElement>(
            `a[href^="${profileUrl}"]`
        );

        links.forEach((link) => {
            if (link.innerHTML == "Profile") {
                username = link.href.split("/").pop() as string;
            }
        });
    }

    // send username to background script
    chrome.runtime.sendMessage(
        {
            type: RequestType.SetUsername,
            username,
        },
        function () {}
    );

    // user isn't logged, no point in doing anything
    if (username == "") return;

    // check if there's data that already exists for this anime
    const id = parseInt(window.location.href.split("/").slice(-2)[0]);
    let listData: { data: ListData } = await chrome.runtime.sendMessage({
        type: RequestType.GetData,
        username,
        id,
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    if (!listData) slider.value = "5";
    else slider.value = listData.data.score.toString();
    slider.step = "0.1";
    slider.style.width = "100%";
    slider.style.display = "none";
    // slider.style.backgroundImage =
    //     // "linear-gradient(to right, #ef4444, #22c55e)";
    //     "to left top, blue, red";
    // // background-image: linear-gradient(to right, var(--tw-gradient-stops));

    // https://myanimelist.net/anime/51535/Shingeki_no_Kyojin__The_Final_Season_-_Kanketsu-hen
    let statusInput = document.querySelector<HTMLSelectElement>(
        'select[name="myinfo_status"]'
    ) as HTMLSelectElement;
    if (statusInput == null) {
        // https://myanimelist.net/ownlist/anime/51535/edit
        statusInput = document.getElementById(
            "add_anime_status"
        ) as HTMLSelectElement;

        if (statusInput == null) {
            console.log("WTWN: couldn't find status input");
            return;
        }
    }

    // https://myanimelist.net/anime/51535/Shingeki_no_Kyojin__The_Final_Season_-_Kanketsu-hen
    let addtolist = document.getElementById("addtolist");
    if (addtolist) {
        const p = document.createElement("p");
        p.innerText = "How much do you want to watch this?";
        addtolist.appendChild(p);
        addtolist.appendChild(slider);

        // only show slider if plan to watch
        if (statusInput.value == "6") {
            slider.style.display = "block";
            p.style.display = "block";
        }

        statusInput.addEventListener("change", () => {
            if (statusInput.value == "6") {
                slider.style.display = "block";
                p.style.display = "block";
            } else {
                slider.style.display = "none";
                p.style.display = "none";
            }
        });
    } else {
        // https://myanimelist.net/ownlist/anime/51535/edit
        const tbody = document
            .querySelector("form[name='add_anime']")
            ?.querySelector("tbody");
        if (tbody == null) {
            console.log("WTWN: couldn't find anywhere to inject slider");
            return;
        }

        /*
        <tr>
            <td class="borderClass" valign="top">Episodes Watched</td>
            <td class="borderClass">
                <input type="text" id="add_anime_num_watched_episodes" name="add_anime[num_watched_episodes]" class="inputtext" size="3" onchange="StatusBooleanCheck();" value="0" data-ddg-inputtype="unknown">
                <a href="javascript:void(0);" id="increment_episode">+</a>
                / <span id="totalEpisodes">0</span>
                                    <small>
                    <a href="/ajaxtb.php?keepThis=true&amp;detailedaid=51535&amp;TB_iframe=true&amp;height=420&amp;width=390" title="Episode Details" class="thickbox">History</a>
                    </small>
            </td>
        </tr>
        */

        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.className = "borderClass";
        td1.innerHTML = "How much do you want to watch this?";
        tr.appendChild(td1);

        const td2 = document.createElement("td");
        td2.className = "borderClass";
        td2.appendChild(slider);
        tr.appendChild(td2);

        tbody.appendChild(tr);

        if (statusInput == null) return;

        if (statusInput.value == "6") {
            slider.style.display = "block";
            td1.style.display = "block";
        }

        statusInput.addEventListener("change", () => {
            if (statusInput.value == "6") {
                slider.style.display = "block";
                td1.style.display = "block";
            } else {
                slider.style.display = "none";
                td1.style.display = "none";
            }
        });
    }

    const mainForm = document.getElementById("main-form");
    if (mainForm == null) return;

    // connect to on submit
    mainForm.addEventListener("submit", (event) => {
        event.preventDefault();

        alert("wut");
    });

    // https://myanimelist.net/anime/51535/Shingeki_no_Kyojin__The_Final_Season_-_Kanketsu-hen
    let submitButton = document.querySelector('input[name="myinfo_submit"]');
    if (submitButton == null) {
        // https://myanimelist.net/ownlist/anime/51535/edit
        submitButton = document.querySelector('input[value="Submit"]');

        if (submitButton == null) {
            console.log("WTWN: couldn't find submit button");
            return;
        }
    }

    submitButton.addEventListener("click", () => {
        const score = parseInt(slider.value);

        chrome.runtime.sendMessage({
            type: RequestType.UpdateList,
            id,
            score,
            status: statusInput.value,
        });
    });
}

if (document.readyState === "loading") {
    // Loading hasn't finished yet
    document.addEventListener("DOMContentLoaded", main);
} else {
    // `DOMContentLoaded` has already fired
    main();
}
