# wtwn - myanimelist

what to watch now, chrome extension for myanimelist

Using

-   webpack
-   typescript
-   tailwindcss
-   jikan api - https://docs.api.jikan.moe/

# TODO

-   logo
-   paginate top anime to watch in popup
-   get all unscored PTW list from current user and have menu for them to score each, one by one in a tinder style fashion
-   settings page (delete all data or save/load data to/from json)
-   add score to reverse index

# Bugs

-   open up popup after editing code, getList will return undefined. Maybe background script still refreshing while opening popup?

# Notes

-   IF YOU ADD A NEW TS FILE, ADD IT TO THE WEBPACK CONFIG FILE (might be way to select all files in folder?)
-   not possible to make background script pop open popup.html bc of chrome security reasons
-   using reserve index data structure to search data
