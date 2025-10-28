# Forum application

## Overview

This repository describes a **decentralized Forum application** built on the Ergo blockchain, based on the **Ergo Reputation System**. The app allows users to create profiles (reputation proofs), post topics and discussions, reply to posts (forming threads), and flag boxes as spam. Every action is represented on-chain as a **box** with a fixed register layout, where replies and spam flags reference the **box_id** of the targeted box.

# Core Concepts

## Boxes and Registers

Every forum object is an Ergo box that follows a common reputation-proof contract and register layout. The contract protects a reputation token and ensures consistent on-chain structure across:

* **Token(0)**: `(Coll[Byte], Long)` -> `(repTokenId, amount)` — the reputation token that this contract protects.
* **R4**: `Coll[Byte]` -> `typeNftTokenId`

  * Purpose: identifies the object type (PROFILE, TOPIC, REPLY, SPAM_FLAG).
* **R5**: `Coll[Byte]` -> `uniqueObjectData`

  * Purpose: type-specific identifier (see *Types & semantics* below).
* **R6**: `Boolean` -> `isLocked`

  * Purpose: lock status. TOPIC, REPLY and SPAM_FLAG must be **locked** (`true`). PROFILE must be **unlocked** (`false`) so it can be updated.
* **R7**: `Coll[Byte]` -> `propositionBytes` of the owner

  * Purpose: owner proposition; used to prove control of the profile (owner must spend a box with this script to confirm ownership).
* **R8**: `Boolean` -> `customFlag`

  * Purpose: opinion flag (positive/negative) for TOPIC/REPLY; ignored for PROFILE and SPAM_FLAG.
* **R9**: `Coll[Byte]` -> `reserved_1`

  * Purpose: free/variable payload: profile data, topic message, reply content, or other application data.


## Object Types and How They Map to Registers

**R4 values** (examples): `PROFILE`, `TOPIC`, `REPLY`, `SPAM_FLAG`.

* **PROFILE**

  * `R5`: `profile_token_id` (the token id used to identify the profile within the reputation collection — often the same as the token in Token(0)).
  * `R6`: `false` (profiles are updatable).
  * `R8`: ignored.
  * `R9`: profile data (username, bio, reputation metadata, optionally an encoded stake/locked tokens metadata).
  * `Token(0)`: includes reputation token id and available amount (and optionally extra tokens/erg locked by this profile contract box).

* **TOPIC** (a discussion attached to an object in the ecosystem)

  * `R5`: `topic_identifier` (example: fundraising campaign id, game id, project id — any opaque identifier chosen by the app).
  * `R6`: `true` (locked — immutable discussion box).
  * `R8`: `Boolean` (opinion flag — true/false; semantic meaning is app-defined, e.g. positive/negative).
  * `R9`: message payload (the text or small binary data describing the topic).

* **REPLY**

  * `R5`: `parent_box_id` (the Ergo `box_id` of the comment/topic being replied to). **This is the main change**: replies reference the *box id* of the parent.
  * `R6`: `true` (locked — immutable reply box).
  * `R8`: `Boolean` (opinion flag — optional app semantics).
  * `R9`: reply content (message text, or encoded payload).

* **SPAM_FLAG**

  * `R5`: `target_box_id` (the box id of the item being flagged).
  * `R6`: `true` (locked).
  * `R8`: ignored (spam flags do not need opinion semantics).
  * `R9`: typically empty.

---

# Reputation proof (Profile) details

A **profile** is a reputation proof represented on-chain by a set of boxes that: (1) include the same reputation token id in Token(0), and (2) share the same ErgoTree (the reputation contract). This makes it easy to discover and group all boxes that represent the same profile.

Register roles important for profiles:

* **Token(0)**: `(repTokenId, amount)` — the reputation token and the amount held by that profile box. Applications can inspect amounts to compute or filter by reputation strength.
* **R7**: owner proposition bytes — proving ownership.
* **R9**: profile data (username, display name, avatar hash, metadata). This is application-defined but should be compact.

**Profiles can lock erg and tokens** in the reputation boxes. These locked funds are readable by the application and can be used as a reputation metric (e.g., the more erg or tokens locked by verified profiles, the higher their weight). The reputation contract should allow anyone to extract locked funds only under the contract conditions — the application must define how claims to locked funds work.

---

# Application behavior (Off-chain)

Although each user action produces an immutable on-chain box, **rendering, threading, filtering and ranking** are performed off-chain by the client.

## Thread reconstruction

* The client scans forum-related boxes with the forum reputation ErgoTree and groups them by type (R4).
* Topics are displayed by `topic_identifier` (R5 for TOPIC boxes).
* Replies are linked to their parent via `R5` which contains the `parent_box_id`. Recursively linking replies creates threaded conversations.
* Spam flags are boxes whose `R5` matches a targeted `box_id`. The client tallies spam flags per box.

## Spam filtering policy

* The application can hide any box (TOPIC or REPLY) that receives **N** or more `SPAM_FLAG` boxes. `N` is a configurable application parameter. The UI should always allow users to disable the filter and view all content.
* Spam flags are immutable on-chain boxes — they cannot be revoked (they can be countered by additional flags or by contextual moderation off-chain).

## Reputation-based filtering and weighting

* The client reads profile boxes and associated locked funds/tokens (Token(0) amounts) to compute a reputation score.
* Filtering options can include: only show content posted by profiles with at least X locked erg/tokens, or boost messages from high-reputation profiles.
* Because profiles are updatable (R6=false), the UI must handle profile creation, edits, and new reputation boxes gracefully.

## Moderation & UX

* The client should offer controls for sorting (newest, most-reputed authors, most-replied), collapsing low-reputation authors, showing/hiding spam, and pagination/virtualization for large threads.
* The client must not rely on on-chain spam flags as the sole moderation signal — combine on-chain signals with off-chain heuristics and human moderators where appropriate.


# Typical UX flows

1. **Create a Profile (reputation proof)**

   * User calls `createProfile(...)` and mints/acquires the reputation token.
   * The client publishes a PROFILE box with `R6=false` so future profile updates are allowed.

2. **Post a Topic**

   * Client ensures the author has a profile and acceptable reputation (optional).
   * Client publishes a TOPIC box where `R5` contains the topic identifier and `R9` contains the message.

3. **Reply to a Topic/Comment**

   * Client publishes a REPLY box where `R5` equals the parent `box_id`.
   * Thread reconstruction uses `R5` to link replies.

4. **Flag Spam**

   * Client publishes a SPAM_FLAG box whose `R5` equals the targeted `box_id`.
   * Client tallies spam boxes per target box to decide whether to hide it.

---

# Filtering and Policy

* **Spam threshold (`N`)**: a client-side, configurable number. When a box accumulates `>= N` `SPAM_FLAG` boxes, hide it by default.
* **Reputation threshold**: clients may require a minimum stake/locked funds in profile boxes to allow posting or to give greater weight in sorting.
* **Locking constraints**: TOPIC/REPLY/SPAM_FLAG must be published with `R6=true` (locked) and cannot be changed later.

---

# Security & Privacy Considerations

* All content stored in `R9` should be considered public and immutable. Avoid placing private information directly in box registers.
* The reputation token mechanics should be designed to resist Sybil attacks — requiring real economic stake (ERG or other tokens) is one mitigation, but not a full solution.
* Clients must validate box structures (presence and types of R4..R9 and Token(0)) before trusting the data.

---

# Developer Notes & Best Practices

* Keep `R9` payloads compact (on-chain storage cost). If you need larger content, store the full content off-chain (IPFS) and place a content hash or CID in `R9`.  (Check first what is the cost on Ergo, in most cases can be submited directly).
* When designing `R7` (owner proposition bytes), align with the wallet/owner control scheme used by your app so ownership proofs are easy to verify.
* Maintain backwards compatibility if you ever change the reputation contract; consider versioning R4 values or embedding a `schema_version` into `R9`.

---

# Profile-level Blocking (Individual and Trust-based Filters)

It is also possible to implement **individual blocking mechanisms** between profiles:

* For example, **Alice** posts content that **Bob** dislikes.  
  Bob can **block Alice** by publishing an on-chain proof (a small box referencing Alice’s profile).  
  This can be implemented as a new action type — a `PROFILE`-targeted block — using the same reputation contract structure.

* This block box would:
  * Have `R4 = PROFILE` (indicating it targets a profile).
  * Have `R5` = `profile_box_id` (the `box_id` of Alice’s profile).
  * Be **locked** (`R6=true`), immutable, and easily verifiable by other clients.
  * Optionally include reason or metadata in `R9`.

* Clients reconstruct blocks off-chain and simply **hide all content authored by blocked profiles**. Unlike spam flags, this is **personal** — only the blocking user’s view is affected.

* Furthermore, **trust-based propagation** is possible:  
  If **Charles** trusts **Bob**, he can adopt Bob’s blocklist automatically — meaning that if Bob blocks Alice, Charles also no longer sees Alice’s content.  

This allows the creation of **filter-profiles**, specialized accounts that curate or moderate content, which others can follow or subscribe to as decentralized, user-driven moderation layers — entirely **non-invasive**, transparent, and reversible at the user’s discretion.
