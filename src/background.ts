enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6,
}

// empty username = not signed in
let username = "saist";

// local data that will be occasionally synced with chrome.sync
// ptwList[username][id] = score;
let ptwList: {
    [username: string]: {
        [id: number]: number;
    };
} = {
    saist: {
        1: 10,
        2: 10,
        3: 10,
        4: 10,
    },
};

const updateList = (id: number, score: number, status: Status) => {
    if (username == "") {
        console.log("WTWN: user is not signed in");
        return;
    }

    // user doesn't exist then make new entry
    if (!ptwList[username]) ptwList[username] = {};

    // if the user is signed in, update the list
    if (status == Status.PlanToWatch) {
        ptwList[username][id] = score;
    } else {
        delete ptwList[username][id];
    }

    console.log(ptwList);

    // send data to chrome.sync
    // chrome.storage.sync.set({ ptwList: ptwList }, function () {
    //     console.log("WTWN: data saved");
    // });
};

// everytime the user navgates to a new page, update the username in case they are logged out or switch accounts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.username) {
        username = request.username;
    } else if (request.id) {
        const id = request.id as number;
        const score = request.score as number;
        const status = request.status as Status;

        updateList(id, score, status);
    } else if (request == "getList") {
        sendResponse({ username, list: ptwList[username] });
    }
});
