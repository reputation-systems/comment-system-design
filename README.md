### **Comment System Design**

#### **Overview**

This document describes a decentralized comment system on the Ergo blockchain. It allows users to post immutable comments, reply to other comments to create discussion threads, and flag content as spam.

#### **Interaction Mechanism**

Each action (commenting, replying, flagging as spam) creates a box on the blockchain with a specific structure. Once published, comments cannot be edited.

**1. Commenting on a Main Object (e.g., a Project)**
A box is created pointing to the object being commented on.

* **Object Type:** `"bene-ergo.project"`
* **Object Pointer:** Project ID (e.g., `"fe68...98a7"`)
* **Author:** User’s public key.
* **Opinion:** `true` (Positive).
* **Content:** `"It has been a fantastic contribution, thanks to everyone."`

**2. Replying to a Comment**
To create a thread, a reply is made to an existing comment by referencing its token ID.

* **Object Type:** `"comment"`
* **Object Pointer:** Token ID of the parent comment (e.g., `"abcdefg"`)
* **Author:** Public key of the new user.
* **Opinion:** `true` (Agreement).
* **Content:** `"Yes, you're right, but..."`

**3. Flagging a Comment as Spam**
An alert is created pointing to the comment considered as spam.

* **Object Type:** `"spam-alert"`
* **Object Pointer:** Token ID of the flagged comment (e.g., `"bb22bb11"`)
* **Author:** Public key of the user who raised the alert.
* **Opinion:** `false` (Negative).
* **Content:** (Empty).

#### **Application Logic (Off-Chain)**

Rendering and filtering are handled by the client application (the web interface).

* **Discussion Threads:** The application reconstructs threads by linking replies to their parent comments.
* **Spam Filtering:** A comment is hidden by default if it receives **N** spam alerts. The value of **N** is decided by the application, and end users will always have the option to disable the filter to view all content.


### TypeScript implementation


```typescript
// TypeScript SDK function declarations (implementations omitted)
export async function postComment(
  projectId: string,
  authorKey: string,
  text: string
): Promise<string>;

export async function replyToComment(
  parentTokenId: string,
  authorKey: string,
  text: string
): Promise<string>;

export async function flagSpam(
  targetTokenId: string,
  authorKey: string
): Promise<string>;

export async function fetchThreads(
  projectId: string
): Promise<any[]>;
```
