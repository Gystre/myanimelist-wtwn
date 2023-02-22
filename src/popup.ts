chrome.runtime.sendMessage("getList", function (response) {
    const username = response.username;
    const list: {
        [username: string]: {
            [id: number]: number;
        };
    } = response.list;
    console.log(username);

    // create a h1 in span with the username
    const h1 = document.createElement("h1");
    h1.innerText = username;
    document.body.appendChild(h1);

    const main = document.getElementById("main");
    if (!main) return;

    for (let id in list) {
        const div = document.createElement("div");
        div.innerText = id;
        main.appendChild(div);
    }
});
