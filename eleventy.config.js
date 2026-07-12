// Eleventy config: generates ONE static page per lecture into _site/lectures/.
// The interactive catalog (index.html) and the client-rendered subpages keep
// working untouched; the generated pages are the SEO/sharing layer on top.
// Where the output goes in production (docs/, gh-pages branch, or committed
// lectures/ folder) is a pending deployment decision — see PLAN_NEXT_PHASES.md.
module.exports = function (eleventyConfig) {
    return {
        dir: {
            input: '_templates',
            data: '../_data',
            output: '_site',
        },
    };
};
