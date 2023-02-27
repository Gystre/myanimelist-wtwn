import { SearchIndex } from "./background";

export type SearchIndexJSON = {
    [index: string]: number[];
};

export const encodeSearchIndex = (searchIndex: SearchIndex) => {
    let searchIndexJSON: SearchIndexJSON = {};
    for (let keyword in searchIndex) {
        searchIndexJSON[keyword] = Array.from(searchIndex[keyword]);
    }

    return searchIndexJSON;
};

export const decodeSearchIndex = (searchIndexJSON: SearchIndexJSON) => {
    let searchIndex: SearchIndex = {};
    for (let keyword in searchIndexJSON) {
        searchIndex[keyword] = new Set<number>(searchIndexJSON[keyword]);
    }

    return searchIndex;
};
