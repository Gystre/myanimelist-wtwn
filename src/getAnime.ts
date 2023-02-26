/*
keep id as number or string? seeems ez to keep it as a string bc that's how it's stored and transferred throughout the app
but keeping it as id seems more intuitive and easier to error check
hm dunno
*/

// https://docs.api.jikan.moe/#tag/anime/operation/getAnimeById
export const getAnime = async (id: number) => {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    const data = await response.json();

    // 3 requests per second max so keep slow
    await new Promise((resolve) => setTimeout(resolve, 250));

    /*
		"mal_id": 0,
		"url": "string",
		"images": {},
		"trailer": {},
		"approved": true,
		"titles": [],
		"title": "string",
		"title_english": "string",
		"title_japanese": "string",
		"title_synonyms": [],
		"type": "TV",
		"source": "string",
		"episodes": 0,
		"status": "Finished Airing",
		"airing": true,
		"aired": {},
		"duration": "string",
		"rating": "G - All Ages",
		"score": 0,
		"scored_by": 0,
		"rank": 0,
		"popularity": 0,
		"members": 0,
		"favorites": 0,
		"synopsis": "string",
		"background": "string",
		"season": "summer",
		"year": 0,
		"broadcast": {},
		"producers": [],
		"licensors": [],
		"studios": [],
		"genres": [],
		"explicit_genres": [],
		"themes": [],
		"demographics": []
	*/

    return data.data;
};
