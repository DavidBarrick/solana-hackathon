const basePath = process.cwd();
const { startCreating, buildSetup } = require(`${basePath}/src/main.js`);

(() => {
  const pathName = process.argv[2];

  buildSetup(pathName);
  startCreating(pathName);
})();
