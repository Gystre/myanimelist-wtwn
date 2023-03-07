import { RequestType } from "./background";

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
    let { score }: { score: number } = await chrome.runtime.sendMessage({
        type: RequestType.GetScore,
        id,
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    if (!score) slider.value = "5";
    else slider.value = score.toString();
    slider.step = "0.1";
    slider.style.width = "100%";
    slider.style.display = "none";
    // slider.style.backgroundImage =
    //     // "linear-gradient(to right, #ef4444, #22c55e)";
    //     "to left top, blue, red";
    // // background-image: linear-gradient(to right, var(--tw-gradient-stops));

    let statusInput = document.querySelector<HTMLSelectElement>(
        'select[name="myinfo_status"]'
    ) as HTMLSelectElement;
    if (statusInput == null) {
        console.log("WTWN: couldn't find status input");
        return;
    }

    let addtolist = document.getElementById("addtolist");
    if (addtolist == null) {
        console.log("WTWN: couldn't find addtolist");
        return;
    }

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

    let submitButton = document.querySelector('input[name="myinfo_submit"]');
    if (submitButton == null) {
        console.log("WTWN: couldn't find submit button");
        return;
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
