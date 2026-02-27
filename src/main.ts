import { Devvit } from "@devvit/public-api";
import { registerSettings } from "./settings.js";
import { onPostCreate, onCommentCreate } from "./triggers.js";

Devvit.configure({
  redditAPI: true,
  redis: true,
});

registerSettings();

Devvit.addTrigger({
  event: "PostCreate",
  onEvent: onPostCreate,
});

Devvit.addTrigger({
  event: "CommentCreate",
  onEvent: onCommentCreate,
});

export default Devvit;
