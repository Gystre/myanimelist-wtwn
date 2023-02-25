enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6,
}

// empty username = not signed in
let username = "saist";

export type MasterList = {
    [username: string]: {
        [id: number]: {
            // 0-10
            score: number;

            // timestamp for when was added, created via Date.now()
            createdAt: number;
        };
    };
};

// local data that will be occasionally synced with chrome.sync
// contains all data for all users
let masterList: MasterList = {
    saist: {
        "48417": {
            score: 10,
            createdAt: 1677271036214,
        },
        "39071": {
            score: 10,
            createdAt: 1677271036214,
        },
        "12189": {
            score: 10,
            createdAt: 1677271036214,
        },
    },
};

const updateList = (id: number, score: number, status: Status) => {
    if (username == "") {
        console.log("WTWN: user is not signed in");
        return;
    }

    // user doesn't exist, make a new entry
    if (!masterList[username]) masterList[username] = {};

    if (status == Status.PlanToWatch) {
        masterList[username][id] = {
            score: score,
            createdAt: Date.now(),
        };
    } else {
        delete masterList[username][id];
    }

    // send data to chrome.sync
    // chrome.storage.sync.set({ masterList: masterList }, function () {
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
        sendResponse({ username, masterList });
    }
});
