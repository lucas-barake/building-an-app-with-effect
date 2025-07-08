import { HttpApi } from "@effect/platform";
import { StylesGroup } from "./api/styles-rpc.js";

export class DomainApi extends HttpApi.make("DomainApi").add(StylesGroup) {}
