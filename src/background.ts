enum Status {
    Watching = 1,
    Completed = 2,
    OnHold = 3,
    Dropped = 4,
    PlanToWatch = 6,
}

// using web requests, intercept all requests and print the headers and the payload
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        const url = details.url;

        // https://myanimelist.net/ownlist/anime/49387/delete
        if (url.includes("delete")) {
            // get the id from the url by slicing last 2 elements
            const id = parseInt(url.split("/").slice(-2)[0]);
            console.log("anime was deleted: ", id);

            return;
        }

        if (details.requestBody == undefined) return;

        /*
			https://myanimelist.net/ownlist/anime/add.json
			https://myanimelist.net/ownlist/anime/edit.json
		*/
        if (!url.includes("add") && !url.includes("edit")) return;

        // request made from anime page
        if (details.requestBody.raw) {
            /*
				"anime_id": 36793,
				"csrf_token": "5edf1e9a03bdd43518b98c32d148d94f2865dc05",
				"num_watched_episodes": 0,
				"score": 0,
				"status": 3
			*/
            const payload = JSON.parse(
                new TextDecoder().decode(details.requestBody.raw[0].bytes)
            );
            const id = payload.anime_id;
            const status = payload.status;
            console.log("anime was updated: ", id, status);

            return;
        }

        // request made from ownlist page
        if (details.requestBody.formData) {
            /*
				formData: {
					add_anime[comments]: ['']
					add_anime[is_asked_to_discuss]: ['0']
					add_anime[num_watched_episodes]: ['0']
					add_anime[num_watched_times]: ['0']
					add_anime[priority]: ['0']
					add_anime[rewatch_value]: ['']
					add_anime[score]: ['']
					add_anime[sns_post_type]: ['0']
					add_anime[status]: ['6']
					add_anime[storage_type]: ['']
					add_anime[storage_value]: ['0']
					add_anime[tags]: ['']
					aeps: ['12']
					anime_id: ['36793']
					astatus: ['2']
					csrf_token: ['5edf1e9a03bdd43518b98c32d148d94f2865dc05']
					public_notes: ['1']
					submitIt: ['0']
				}
			*/
            const id = parseInt(details.requestBody.formData.anime_id[0]);
            const status = parseInt(
                details.requestBody.formData["add_anime[status]"][0]
            );

            console.log("anime was updated: ", id, status);
        }
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);
