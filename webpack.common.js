const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: {
        popup: "./src/popup.ts",
        content: "./src/content.ts",
        background: "./src/background.ts",
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                use: ["ts-loader"],
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader", "postcss-loader"],
            },
        ],
    },

    plugins: [
        // copy over the manifest.json
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "manifest.json",
                    to: path.join(__dirname, "dist/manifest.json"),

                    // force overwrite
                    force: true,
                },
            ],
        }),

        // uncomment later if want custom css
        // new CopyWebpackPlugin({
        //     patterns: [
        //         {
        //             from: "./src/globals.css",
        //             to: path.join(__dirname, "dist/globals.css"),
        //             force: true,
        //         },
        //     ],
        // }),

        // copy over popup.html and inject popup.bundle.js
        new HtmlWebpackPlugin({
            template: "./src/popup.html",
            filename: "popup.html",
            chunks: ["popup"],
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: "./src/home.html",
            filename: "home.html",
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: "./src/add.html",
            filename: "add.html",
            cache: false,
        }),
        new HtmlWebpackPlugin({
            template: "./src/settings.html",
            filename: "settings.html",
            cache: false,
        }),
    ],

    resolve: {
        extensions: [".ts", ".js", ".html", ".css"],
    },

    output: {
        path: path.resolve(__dirname, "dist"),
        clean: true,
        filename: "[name].bundle.js",
    },
};
