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
        [id: number]: ListData;
    };
};

export type ListData = {
    // 0-10
    score: number;

    // timestamp for when was added, created via Date.now()
    createdAt: number;
};

// local data that will be occasionally synced with chrome.sync
// contains all data for all users
let masterList: MasterList = {};

// NEEDS MORE TESTING
// might need to wrap this in promise to ensure sequential code execution
const loadFromCloud = async () => {
    chrome.storage.sync.get(["masterList"], function (result) {
        if (result.masterList) {
            masterList = result.masterList;
        } else {
            console.log(
                "WTWN: no list found for this user in the cloud, loading an empty one"
            );
        }
    });
};
loadFromCloud();

const updateList = (id: number, score: number, status: Status) => {
    if (username == "") {
        console.log("WTWN: user is not signed in");
        return;
    }

    if (!masterList) loadFromCloud();

    // user doesn't exist, make a new entry
    if (!masterList[username]) masterList[username] = {};

    if (status == Status.PlanToWatch) {
        masterList[username][id] = {
            score: score,
            createdAt: Date.now(),
        };
        console.log("adding", masterList[username][id]);
    } else {
        delete masterList[username][id];
    }

    // save to cloud
    chrome.storage.sync.set({ masterList });
};

// can take this one step further by creating custom types for each request but that's too much work for now
export enum RequestType {
    // writes
    SetUsername = "setUsername",
    UpdateList = "updateList",

    // reads
    GetList = "getList",
    GetData = "getData", // need username and id of data we want to get
}

// background msg handler
// msgs can come from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == RequestType.SetUsername) {
        username = request.username;
    } else if (request.type == RequestType.UpdateList) {
        const id = request.id as number;
        const score = request.score as number;
        const status = request.status as Status;

        updateList(id, score, status);
    } else if (request.type == RequestType.GetList) {
        // possible that a message is received before list is loaded from cloud
        if (!masterList) loadFromCloud();
        sendResponse({ username, masterList });
    } else if (request.type == RequestType.GetData) {
        if (!masterList) loadFromCloud();

        // sending whole list instead of just the data we want?
        sendResponse({ data: masterList[request.username][request.id] });
    }
});
