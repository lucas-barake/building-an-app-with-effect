import { HttpApi } from "@effect/platform";
import { StylesGroup } from "./styles-rpc.js";

export class DomainApi extends HttpApi.make("DomainApi").add(StylesGroup) {}
