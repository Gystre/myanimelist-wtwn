function main() {
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
            chrome.runtime.sendMessage({ username });
            return;
        }

        username = url.split("/").pop() as string;
    } else {
        // user is on the main page and isn't signed in
        const signupButton = document.getElementsByClassName("btn-signup");
        if (signupButton.length > 0) {
            chrome.runtime.sendMessage({ username });
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
    chrome.runtime.sendMessage({ username });

    // TODO: move slider to above Update button
    const addToList = document.getElementById("addtolist");

    if (addToList == null) return;

    // add some text
    const text = document.createElement("p");
    text.innerHTML = "How much do you want to watch this?";
    text.style.marginTop = "10px";
    text.style.marginTop = "5px";
    addToList.appendChild(text);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "10";
    slider.value = "0";
    slider.step = "0.1";
    slider.style.width = "100%";

    addToList.appendChild(slider);

    // send message once button with name myinfo_submit is clicked
    const submitButton = document.querySelector('input[name="myinfo_submit"]');

    if (submitButton == null) return;

    submitButton.addEventListener("click", () => {
        const id = parseInt(window.location.href.split("/").slice(-2)[0]);
        const score = parseInt(slider.value);

        const status = parseInt(
            document.querySelector<HTMLSelectElement>(
                'select[name="myinfo_status"]'
            )?.value as string
        );

        chrome.runtime.sendMessage({ id, score, status });
    });
}

if (document.readyState === "loading") {
    // Loading hasn't finished yet
    document.addEventListener("DOMContentLoaded", main);
} else {
    // `DOMContentLoaded` has already fired
    main();
}
