import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  // Simpler status enums
  QueueStatus: a.enum(["WAITING", "DRAFTING", "IN_PROGRESS"]),
  MatchStatus: a.enum(["IN_PROGRESS", "COMPLETED"]),

  UserProfile: a
    .model({
      // owner is the user's cognito sub. Using it as the primary key.
      owner: a.string().required(),
      username: a.string().required(),
      elo: a.integer().default(1000),
    })
    // Defining owner as the primary key for this model.
    .identifier(["owner"])
    .authorization((allow) => [
      // The owner of the profile can do anything to it.
      allow.owner(),
      // Any authenticated user can read other user profiles.
      allow.authenticated("userPools").to(["read"]),
    ]),

  Queue: a
    .model({
      // Using a more flexible, non-relational approach by storing arrays of IDs.
      name: a.string().required(),
      players: a.string().array(), // Array of UserProfile 'owner' IDs
      status: a.ref("QueueStatus"),
      
      // Draft fields storing 'owner' IDs
      teamACaptain: a.string(),
      teamBCaptain: a.string(),
      draftPool: a.string().array(),
      teamA: a.string().array(),
      teamB: a.string().array(),
      currentDrafter: a.string(),
    })
    .authorization((allow) => [
      // Any authenticated user can perform any action on Queues.
      allow.authenticated("userPools"),
    ]),

  Match: a
    .model({
      // Storing player IDs in string arrays.
      name: a.string(),
      teamA: a.string().array(),
      teamB: a.string().array(),
      status: a.ref("MatchStatus"),
      winningTeam: a.string(), // "A" or "B"
    })
    .authorization((allow) => [
      // Any authenticated user can perform any action on Matches.
      allow.authenticated("userPools"),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
