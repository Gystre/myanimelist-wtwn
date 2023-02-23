# wtwn - myanimelist

what to watch now, chrome extension for myanimelist

Using

-   webpack
-   typescript
-   tailwindcss

# TODO:

-   if add anime from myanimelist that isn't in wtwn list, pop up popup.html asking to add it to wtwn
-   sync json file with chrome browser: https://developer.chrome.com/docs/extensions/reference/storage/#overview
-   save anime ids and rating to json file under current user

## popup:

-   ui
-   logo
-   search function
-   paginate top anime to watch in popup
-   manually add/delete anime from list
-   cache data (description, picture, name) for the top 10 anime to watch

# Notes

-   IF YOU ADD A NEW TS FILE, ADD IT TO THE WEBPACK CONFIG FILE (might be way to select all files in folder?)
-   not possible to make background script pop open popup.html
