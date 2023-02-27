# wtwn - myanimelist

what to watch now, chrome extension for myanimelist

Using

-   webpack
-   typescript
-   tailwindcss
-   jikan api - https://docs.api.jikan.moe/

# TODO:

-   logo
-   search function
-   paginate top anime to watch in popup
-   manually add/delete anime from list
-   cache data (description, picture, name) for the top 10 anime to watch
-   invalidate cache button
-   make slider input available on all pages where edit anime is possible
-   edit score in popup
-   settings page (delete all data, save/load data to/from json, )

# Bugs

-   open up popup after editing code, getList will return undefined. Maybe background script still refreshing while opening popup?

# Notes

-   if u give a chrome function a callback, it will become synchronous (no need to wrap in promise)
-   IF YOU ADD A NEW TS FILE, ADD IT TO THE WEBPACK CONFIG FILE (might be way to select all files in folder?)
-   not possible to make background script pop open popup.html bc of chrome security reasons
-   using reserve index data structure to search data
