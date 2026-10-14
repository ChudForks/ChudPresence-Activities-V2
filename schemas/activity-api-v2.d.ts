// Generated from activity-api-v2.json. No executable Activity API is exposed.
export type ActivityV2Metadata = {
  "id": string;
  "name": string;
  "description": string;
  "version": string;
  "apiVersion": 2;
  "minExtensionVersion"?: string;
  "author"?: {
  "name": string;
  "url"?: string;
};
  "contributors"?: Array<{
  "name": string;
  "url"?: string;
}>;
  "category"?: string;
  "defaultMediaKind"?: "video" | "movie" | "episode" | "song" | "stream" | "game" | "generic";
  "aliases"?: Array<string>;
  "tags"?: Array<string>;
  "matches": Array<string>;
  "excludeMatches"?: Array<string>;
  "entry": "activity.json";
  "icon"?: "icon.png";
  "frames"?: "top";
  "settingsUi"?: {
  "statusLabels"?: {
  "app"?: string;
  "artist"?: string;
  "track"?: string;
};
};
  "repository"?: string;
  "homepage"?: string;
  "serviceUrl"?: string;
};
export type ActivityV2Configuration = {
  "schemaVersion": 1;
  "kind": "video" | "movie" | "episode" | "song" | "stream" | "game" | "generic";
  "scope": string;
  "fields": {
  "title": {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "subtitle"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "artist"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "album"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "series"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "creator"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "channel"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "category"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "game"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
  "playlist"?: {
  "source": "dom.text";
  "selectors": Array<string>;
  "removePrefix"?: string;
  "removeSuffix"?: string;
} | {
  "source": "dom.attribute";
  "selectors": Array<string>;
  "attribute": "title" | "aria-label" | "alt";
  "removePrefix"?: string;
  "removeSuffix"?: string;
};
};
  "player": {
  "adapter": "html-media" | "prime-video";
  "metadata"?: "prime-video-details";
  "selectors": Array<string>;
};
};
