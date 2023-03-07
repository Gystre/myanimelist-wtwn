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
let username = "";

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

const loadFromCloud = () => {
    chrome.storage.sync.get("username", (result) => {
        if (result.username) {
            username = result.username;
        }
    });

    chrome.storage.sync.get("data", (result) => {
        if (result.data) {
            masterList = result.data.masterList;
            searchIndex = decodeSearchIndex(result.data.searchIndexJSON);

            // print size of masterList and searchIndex in bytes
            console.log(
                "WTWN: loaded data from cloud, masterList size: " +
                    JSON.stringify(masterList).length +
                    " bytes, searchIndex size: " +
                    JSON.stringify(searchIndex).length +
                    " bytes"
            );
        } else {
            console.log("WTWN: no list data found in cloud");
        }
    });

    chrome.storage.sync.get("unscoredPTWList", (result) => {
        if (result.unscoredPTWList) {
            unscoredPTWList = result.unscoredPTWList;
        }
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

        keywords.push(score.toString());

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

type MALData = {
    id: number;
    title: string;
    url: string;
    imageUrl: string;
    genres: string[];
    notes: string;

    // fetch these from jikan api and cache if user wants them
    description?: string;
    themes?: string[];
};

let unscoredPTWList: MALData[] = [];

const getUnscoredPTWList = async () => {
    if (username == "") {
        console.log("WTWN: user is not signed in");
        return;
    }

    if (unscoredPTWList.length > 0) return;

    let maxListLength = await new Promise<number>(function (resolve) {
        chrome.storage.sync.get("maxListLength", (result) => {
            if (result.maxListLength) {
                resolve(result.maxListLength);
            } else {
                resolve(-1);
            }
        });
    });

    // keep requesting the list to find maximum list length
    let ptwList = [];
    if (maxListLength == -1) {
        let offset = 0;
        while (true) {
            // order by last updated, descending (newest first)
            const response = await fetch(
                `https://myanimelist.net/animelist/${username}/load.json?status=6&offset=${offset}&order=5`
            );

            const data = await response.json();
            if (data.length === 0) {
                console.log("WTWN: no more unscored PTW entries");
                break;
            }

            ptwList.push(data);
        }

        chrome.storage.sync.set({
            maxListLength: ptwList.length,
        });
    } else {
        // we have fetched the list before, so just start at the last offset

        // can only get 300 entries at a time so will be in increments of 300
        // 0, 300, 600, 900, ...
        let lastOffset = await new Promise<number>(function (resolve) {
            chrome.storage.sync.get("lastOffset", (result) => {
                if (result.lastOffset) {
                    resolve(result.lastOffset);
                } else {
                    resolve(0);
                }
            });
        });

        const response = await fetch(
            `https://myanimelist.net/animelist/${username}/load.json?status=6&offset=${lastOffset}&order=5`
        );

        const data = await response.json();
        if (data.length === 0) {
            console.log("WTWN: no more unscored PTW entries");
        }

        ptwList.push(data);
    }

    console.log(ptwList);

    /*
        {
            "status": 6,
            "score": 0,
            "tags": "",
            "is_rewatching": 0,
            "num_watched_episodes": 0,
            "created_at": 1622785759,
            "updated_at": 1622785854,
            "anime_title": "Shuumatsu Nani Shitemasu ka? Isogashii desu ka? Sukutte Moratte Ii desu ka?",
            "anime_title_eng": "WorldEnd: What do you do at the end of the world? Are you busy? Will you save us?",
            "anime_num_episodes": 12,
            "anime_airing_status": 2,
            "anime_id": 33502,
            "anime_studios": null,
            "anime_licensors": null,
            "anime_season": null,
            "anime_total_members": 373785,
            "anime_total_scores": 179240,
            "anime_score_val": 7.68,
            "has_episode_video": true,
            "has_promotion_video": true,
            "has_video": true,
            "video_url": "/anime/33502/Shuumatsu_Nani_Shitemasu_ka_Isogashii_desu_ka_Sukutte_Moratte_Ii_desu_ka/video",
            "genres": [
                {
                    "id": 8,
                    "name": "Drama"
                },
                {
                    "id": 10,
                    "name": "Fantasy"
                },
                {
                    "id": 22,
                    "name": "Romance"
                },
                {
                    "id": 24,
                    "name": "Sci-Fi"
                }
            ],
            "demographics": [],
            "title_localized": null,
            "anime_url": "/anime/33502/Shuumatsu_Nani_Shitemasu_ka_Isogashii_desu_ka_Sukutte_Moratte_Ii_desu_ka",
            "anime_image_path": "https://cdn.myanimelist.net/r/192x272/images/anime/4/85260.jpg?s=730a42ad6d970601fee8329d87df03fe",
            "is_added_to_list": true,
            "anime_media_type_string": "TV",
            "anime_mpaa_rating_string": "PG-13",
            "start_date_string": null,
            "finish_date_string": null,
            "anime_start_date_string": "04-11-17",
            "anime_end_date_string": "06-27-17",
            "days_string": null,
            "storage_string": "",
            "priority_string": "Low",
            "notes": "",
            "editable_notes": ""
        }
    */

    for (let i = 0; i < ptwList.length; i++) {
        const anime = ptwList[i];
        const id = anime.anime_id;
        if (masterList[username][id]) continue;

        const data: MALData = {
            id,
            title: anime.anime_title,
            url: "https://myanimelist.net" + anime.anime_url,
            imageUrl: anime.anime_image_path,
            genres: anime.genres.map((genre: any) => genre.name),
            notes: anime.notes,
        };

        unscoredPTWList.push(data);
    }
};

// can take this one step further by creating custom types for each request but that's too much work for now
export enum RequestType {
    // writes
    SetUsername = "setUsername",
    UpdateList = "updateList",
    SetScore = "setScore",

    // reads
    GetUsername = "getUsername",
    GetList = "getList",
    GetListLength = "getListLength",
    GetScore = "getScore", // need username and id of data we want to get
    GetSearchIndexJSON = "getSearchIndexJSON",
}

// background msg handler
// msgs can come from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // user isn't logged in
    if (username === "") {
        loadFromCloud();
    }

    if (request.type == RequestType.SetUsername) {
        username = request.username;
        chrome.storage.sync.set({ username }, function () {});
    } else if (request.type == RequestType.GetUsername) {
        sendResponse({ username });
    } else if (request.type == RequestType.UpdateList) {
        const id = request.id as number;
        const score = request.score as number;
        const status = request.status as Status;

        updateList(id, score, status);
    } else if (request.type == RequestType.GetList) {
        sendResponse({ username, masterList });
    } else if (request.type == RequestType.GetListLength) {
        sendResponse({ listLength: Object.keys(masterList[username]).length });
    } else if (request.type == RequestType.GetScore) {
        if (!masterList[username]) {
            sendResponse({ score: undefined });
            return;
        }

        // anime not in the list
        if (!masterList[username][request.id]) {
            sendResponse({ score: undefined });
            return;
        }

        sendResponse({ score: masterList[request.username][request.id].score });
    } else if (request.type == RequestType.GetSearchIndexJSON) {
        sendResponse({ searchIndexJSON: encodeSearchIndex(searchIndex) });
    } else if (request.type == RequestType.SetScore) {
        const id = request.id as number;
        const score = request.score as number;
        masterList[username][id].score = score;
    }
});
