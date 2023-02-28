import { getAnime } from "./getAnime";
import {
    decodeSearchIndex,
    encodeSearchIndex,
} from "./searchIndexSerialization";

enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6,
}

// empty username = not signed in
let username = "saist";

export type ListData = {
    // 0-10
    score: number;

    // timestamp for when was added, created via Date.now()
    createdAt: number;

    title: string;
    url: string;
    genres: string[];
    themes: string[];
    imageUrl: string;
};

export type PTWList = {
    [id: number]: ListData;
};

export type MasterList = {
    [username: string]: PTWList;
};

// contains all data for all users
// local data that will be occasionally synced with chrome.sync
let masterList: MasterList = {};

export type SearchIndex = {
    [index: string]: Set<number>;
};
let searchIndex: SearchIndex = {}; // reverse index data structure

const loadFromCloud = async () => {
    return await new Promise<void>((resolve) => {
        chrome.storage.sync.get("data", (result) => {
            if (result.data) {
                masterList = result.data.masterList;
                searchIndex = decodeSearchIndex(result.data.searchIndexJSON);
                resolve();
            } else {
                console.log("WTWN: no data found in cloud");
            }
        });
    });
};

const updateList = async (id: number, score: number, status: Status) => {
    if (username == "") {
        console.log("WTWN: user is not signed in");
        return;
    }

    // user doesn't exist, make a new entry
    if (!masterList[username]) masterList[username] = {};

    if (status == Status.PlanToWatch) {
        const data = await getAnime(id);
        /*
            "titles": [
                {
                    "type": "Default",
                    "title": "Machikado Mazoku"
                },
                {
                    "type": "Synonym",
                    "title": "Street Corner Demon"
                },
                {
                    "type": "Japanese",
                    "title": "まちカドまぞく"
                },
                {
                    "type": "English",
                    "title": "The Demon Girl Next Door"
                }
            ],
        */
        let keywords: string[] = [];
        let title = "";
        for (let i = 0; i < data.titles.length; i++) {
            // not going to search by japanese so no need to index
            if (data.titles[i].type == "Japanese") continue;

            if (data.titles[i].type == "English") {
                title = data.titles[i].title;
            }

            data.titles[i].title.split(" ").forEach((word: string) => {
                keywords.push(word.toLowerCase());
            });
        }
        if (title.length == 0) title = data.title;

        /*
        "themes": [
            {
                "mal_id": 52,
                "type": "anime",
                "name": "CGDCT",
                "url": "https://myanimelist.net/anime/genre/52/CGDCT"
            },
            {
                "mal_id": 66,
                "type": "anime",
                "name": "Mahou Shoujo",
                "url": "https://myanimelist.net/anime/genre/66/Mahou_Shoujo"
            },
            {
                "mal_id": 23,
                "type": "anime",
                "name": "School",
                "url": "https://myanimelist.net/anime/genre/23/School"
            }
        ],
        */
        let themes: string[] = [];
        for (let i = 0; i < data.themes.length; i++) {
            keywords.push(data.themes[i].name.toLowerCase());
            themes.push(data.themes[i].name);
        }

        /*
        "genres": [
        {
            "mal_id": 4,
            "type": "anime",
            "name": "Comedy",
            "url": "https://myanimelist.net/anime/genre/4/Comedy"
        },
        {
            "mal_id": 10,
            "type": "anime",
            "name": "Fantasy",
            "url": "https://myanimelist.net/anime/genre/10/Fantasy"
        }
        ],
        */
        let genres: string[] = [];
        for (let i = 0; i < data.genres.length; i++) {
            keywords.push(data.genres[i].name.toLowerCase());
            genres.push(data.genres[i].name);
        }

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];

            if (!searchIndex[keyword]) searchIndex[keyword] = new Set<number>();

            searchIndex[keyword].add(id);
        }

        masterList[username][id] = {
            score: score,
            createdAt: Date.now(),

            title,
            url: data.url,
            genres,
            themes,
            imageUrl: data.images.jpg.image_url,
        };
    } else {
        delete masterList[username][id];
    }

    // save to cloud
    chrome.storage.sync.set({
        data: {
            masterList,
            searchIndexJSON: encodeSearchIndex(searchIndex),
        },
    });
};

// can take this one step further by creating custom types for each request but that's too much work for now
export enum RequestType {
    // writes
    SetUsername = "setUsername",
    UpdateList = "updateList",
    SetScore = "setScore",

    // reads
    GetList = "getList",
    GetData = "getData", // need username and id of data we want to get
    GetSearchIndexJSON = "getSearchIndexJSON",
}

// background msg handler
// msgs can come from popup or content scripts
chrome.runtime.onMessage.addListener(async function (
    request,
    sender,
    sendResponse
) {
    // user is logged in but list is empty
    if (Object.keys(masterList).length == 0 && username != "") {
        await loadFromCloud();

        // doesn't always load the data here?
        console.log("loaded data", masterList, searchIndex);
    }

    if (request.type == RequestType.SetUsername) {
        username = request.username;
    } else if (request.type == RequestType.UpdateList) {
        const id = request.id as number;
        const score = request.score as number;
        const status = request.status as Status;

        updateList(id, score, status);
    } else if (request.type == RequestType.GetList) {
        sendResponse({ username, masterList });
    } else if (request.type == RequestType.GetData) {
        // sending whole list instead of just the data we want?
        sendResponse({ data: masterList[request.username][request.id] });
    } else if (request.type == RequestType.GetSearchIndexJSON) {
        sendResponse({ searchIndexJSON: encodeSearchIndex(searchIndex) });
    } else if (request.type == RequestType.SetScore) {
        const id = request.id as number;
        const score = request.score as number;
        masterList[username][id].score = score;
    }
});
