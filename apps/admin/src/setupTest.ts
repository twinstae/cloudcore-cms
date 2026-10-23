import { cleanupReactRoots } from "@siheom/react";
import { configure } from "@testing-library/dom";
import { afterEach } from "vitest";
import "./index.css";

declare global {
  // React 19 browser tests need an explicit act environment flag.
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

configure({ asyncUtilTimeout: 3000 });

afterEach(async () => {
  await cleanupReactRoots();
});
