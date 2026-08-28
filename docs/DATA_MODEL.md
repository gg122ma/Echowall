# Data Model

## Note schema version 2

```js
{
  id: Number,
  schemaVersion: 2,
  contextType: "community" | "building",

  // Community only
  orgId: Number | null,
  batchId: Number | null,
  majorId: Number | null,

  // Building only
  placeId: String,

  category: "academic" | "koko" | "campus_life" | "emotional",
  content: String,
  isAnonymous: Boolean,
  authorNickname: String | null,
  authorUserId: String,

  shape: String,
  color: String,
  rotation: Number,
  positionX: Number,
  positionY: Number,

  imageDataUrl: String,       // local fallback only
  imageUrl: String,           // Cloudinary secure URL
  imagePublicId: String,
  imageName: String,
  imageCropScale: Number,     // 1.0 to 1.8
  imageFit: "cover" | "contain",

  upvotes: Number,
  downvotes: Number,
  score: Number,
  userVote: "up" | "down" | null,
  isHidden: Boolean,
  createdAt: ISODateString
}
```

Existing community notes are normalized into `contextType: "community"`. Building notes use `placeId` and do not require `orgId`, `batchId` or `majorId`.

## Prototype auth storage

```text
echo-wall-users:v1
echo-wall-user-session:v1
```

Passwords are hashed in the browser only to avoid plain-text storage, but this is still not production security. Replace the whole provider before public deployment.

## Other storage

```text
echo-wall-notes
echowall_map_notes
echo-wall-language:v1
echo-wall-theme:v1
echo-wall-translation-cache:v1
```
