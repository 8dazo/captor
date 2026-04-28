import { createRequire } from "module";
const require = createRequire(import.meta.url);
const nextVitals = require("eslint-config-next/core-web-vitals");
export default nextVitals;
