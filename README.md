# Comment System Design  

## Overview  
First, I'm going to explain how we could define comments based on [this repository](https://github.com/reputation-systems/sigma-reputation-panel/tree/master).  

Basically, we should reuse this code: [generate_reputation_proof.ts](https://github.com/reputation-systems/sigma-reputation-panel/blob/master/src/lib/generate_reputation_proof.ts).  

## Mechanism  
As you can see, the mechanism is simple (and if not, I'll explain it here):  

- A token is minted.
- Spending script: [Smart Contract Logic](https://github.com/reputation-systems/sigma-reputation-panel/tree/master?tab=readme-ov-file#-smart-contract-logic).  
- **R4** is used to indicate a tag—the type of object.  
- **R5** specifies the type of the referenced value, for example, `plain/text-utf8`.  
- **R6** specifies the referenced value, in our case, a "bene" project.  
- **R7** is used to specify the user's address.  
- **R8** indicates whether the comment is positive or negative.  
- **R9** allows adding a JSON, in our case.  

### Example  
To comment on the **Gluon Security Audit** project:  

- token minted with an amount of 1; for the comment use-case an amount of one is sufficient.
- **R4**: comment  
- **R5**: bene-ergo.project  
- **R6**: fe68b9c73c341f14f531eed94a582386b0592db5e254e68576199e79e4d698a7  
- **R7**: wallet-pk  
- **R8**: true  (positive)
- **R9**: "This has been a fantastic contribution, thanks all."  

## Responses to Comments  
Then, we can have responses to those comments. For example, considering that our previous comment ID (minted token ID) is `abcdefg`, a response would be:  

- **R4**: comment  
- **R5**: comment  
- **R6**: abcdefg  
- **R7**: pk-1kzjflj13j4l  
- **R8**: true   (positive)
- **R9**: "Yeah, you're right, but this other token is going to the moon..."  

Now, consider that this response has the token ID `bb22bb11`. If a user identifies it as spam, they will add another transaction like this:  

- **R4**: spam-alert  
- **R5**: comment  
- **R6**: bb22bb11  
- **R7**: pk-1j4lkjfljda  
- **R8**: false (negative)  
- **R9**: ""  

## Spam Detection Mechanism  
At this point, if there are **N** boxes identifying a comment as spam, we will mark it as spam. As developers, we can consider **N** as a constant in the application, but users will still have the option to see spam comments if they disable the spam filter.  

## Additional Contract Changes

It is necessary to make some changes to the contract. A new field will be added to indicate whether the contract cannot be spent again, ensuring that comments cannot be edited.To achieve this, R5 and R6 will be merged into a single record.



