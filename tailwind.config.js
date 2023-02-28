/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{html,ts}"],
    theme: {
        extend: {
            colors: {
                primary: "#2E51A2",
                black: "#1F2124",
                black10: "#cececf",
                black5: "#d7d7d7",
            },
            animation: {
                shakeSideToSide: "shakeSideToSide 0.2s infinite",
                shakeUpAndDown: "shakeUpAndDown 0.5s infinite",
            },
        },
    },
    plugins: [],
};
