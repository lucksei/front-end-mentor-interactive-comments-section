// Globals
let $ = {
    commentSection: document.querySelector(".comment-section"),
    body: document.querySelector("body"),

}
let jsonFilepath = "./data.json";
let data = {};
let maxId = 0;

// Add a global to keep track of the last add reply so it can be deleted
// when the user tries to reply another comment
let lastAddReply = {
    lastAddReplyElem: null, // So the element can be deleted
    lastReplyButton: null, // So the button can be enabled again
};

async function main() {
    // Loads the data
    await loadState();
    console.log(data); // TODO: Remove this (debugging)
    maxId = findMaxId();

    // Create comment elements
    for (const commentData of data.comments) {
        const commentElem = await createCommentElem(commentData, data.currentUser);
        $.commentSection.appendChild(commentElem);

        // TODO: Check if this logic could go inside the createCommentElem function
        // Create reply elements
        if (commentData.replies && commentData.replies.length > 0) {
            const repliesContainerElem = createRepliesContainerElem(commentData);
            commentElem.insertAdjacentElement("afterend", repliesContainerElem);

            for (const replayData of commentData.replies) {
                const replyElem = await createReplyElem(replayData, data.currentUser);
                repliesContainerElem.appendChild(replyElem);
            }
        }
    }

    // Create add comment element
    createAddCommentElem(data.currentUser, data.currentUser).then((addCommentElem) => {
        $.commentSection.insertAdjacentElement("beforeend", addCommentElem);
    });
}

// Run the main function
main()

// * * *
// State functions
// * * *

async function loadState() {
    const jsonFilepath = "./data.json";
    const storedData = localStorage.getItem("appState");
    if (storedData) {
        data = JSON.parse(storedData); // Parse the JSON string into an object
    } else {
        console.log("Data not found in localStorage"); // debugging if the data was loaded from json or not
        data = await loadJsonData(jsonFilepath);
        saveState();
    }
}

function saveState() {
    localStorage.setItem("appState", JSON.stringify(data));
}

// * * *
// Helper functions
// * * *

function findComment(commentId) {
    let foundComment = null;
    let foundReply = null;
    for (const comment of data.comments) {
        if (comment.id === commentId) {
            return comment;
        }
        if (comment.replies) {
            for (const reply of comment.replies) {
                if (reply.id === commentId) {
                    return reply;
                }
            }
        }
    }

    return null;
}

function deleteComment(commentId) {
    // try to find the comment and delete it
    const found = data.comments.findIndex((comment) => {
        if (comment.id === commentId) {
            return true;
        }

        // if the comment has replies try to find the reply and delete it
        const foundReply = comment.replies?.findIndex((reply) => {
            if (reply.id === commentId) {
                return true;
            }
        });
        if (foundReply && foundReply !== -1) {
            comment.replies.splice(foundReply, 1);
            return false
        }
        return false
    });
    if (found !== -1) {
        data.comments.splice(found, 1);
        return false
    }
}

function findMaxId() {
    let maxId = 0;
    for (const comment of data.comments) {
        if (comment.id > maxId) {
            maxId = comment.id;
        }
        if (comment.replies) {
            for (const reply of comment.replies) {
                if (reply.id > maxId) {
                    maxId = reply.id;
                }
            }
        }
    }
    return maxId;
}

function loadJsonData(jsonFilepath) {
    /**
     * Fetch JSON data from file and return it
     * @param {string} jsonFilepath - Path to JSON file
     */
    return fetch(jsonFilepath)
        .then((response) => response.json())
        .catch((error) => {
            console.log(`Error fetching data: ${error}`);
        });
}

function elementFromHTML(html) {
    /**
     * Convert HTML string to HTML element
     * @param {string} html - HTML string
     */
    const template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstElementChild;
}

function fetchTemplate(filepath) {
    /**
     * Fetch HTML template from file and transform it to an HTML element
     * @param {string} filepath - Path to HTML file
     */
    return fetch(filepath)
        .then((response) => response.text())
        .then((html) => {
            return elementFromHTML(html);
        }).catch((error) => {
            console.log(`Error fetching template: ${error}`);
        });
}

function createCommentElem(commentData, currentUserData) {
    /**
     * Create a comment element
     * @param {object} commentData - Comment data JSON
     * @param {object} currentUserData - Current user data JSON
     */
    const filepath = "./elements/comment.html";
    return fetchTemplate(filepath).then((commentElem) => {
        // Set comment data
        const userIconElem = commentElem.querySelector('[data-id="user-icon"]')
        const usernameElem = commentElem.querySelector('[data-id="username"]')
        const createdAtElem = commentElem.querySelector('[data-id="created-at"]')
        const textContentElem = commentElem.querySelector('[data-id="text-content"]')
        const scoreCountElem = commentElem.querySelector('[data-id="score-count"]')

        const editButtonElem = commentElem.querySelector('[data-id="edit-button"]');
        const deleteButtonElem = commentElem.querySelector('[data-id="delete-button"]');
        const replyButtonElem = commentElem.querySelector('[data-id="reply-button"]');
        const upvoteButtonElem = commentElem.querySelector('[data-id="upvote-button"]')
        const downvoteButtonElem = commentElem.querySelector('[data-id="downvote-button"]')

        // Edit the comment element content
        commentElem.dataset.commentid = commentData.id;
        userIconElem.src = commentData.user.image.png;
        usernameElem.textContent = commentData.user.username;
        createdAtElem.textContent = commentData.createdAt;
        textContentElem.textContent = commentData.content;
        scoreCountElem.textContent = commentData.score;
        if (commentData.vote === "upvote") {
            upvoteButtonElem.dataset.voted = true;
            upvoteButtonElem.classList.add("voted");
        }
        if (commentData.vote == "downvote") {
            downvoteButtonElem.dataset.voted = true;
            downvoteButtonElem.classList.add("voted");
        }

        // Add event listeners
        replyButtonElem.addEventListener("click", () => replyCommentCallback(commentData, currentUserData, commentElem, replyButtonElem));
        editButtonElem.addEventListener("click", () => editCommentCallback(commentData, currentUserData, commentElem, editButtonElem));
        deleteButtonElem.addEventListener("click", () => deleteCommentCallback(commentData, currentUserData, commentElem, deleteButtonElem));
        upvoteButtonElem.addEventListener("click", () => voteCommentCallback(commentData, currentUserData, commentElem, upvoteButtonElem));
        downvoteButtonElem.addEventListener("click", () => voteCommentCallback(commentData, currentUserData, commentElem, downvoteButtonElem));

        if (currentUserData.username === commentData.user.username) {
            const youBadgeElem = document.createElement("div");
            youBadgeElem.classList.add("badge");
            youBadgeElem.textContent = "you";
            usernameElem.insertAdjacentElement("afterend", youBadgeElem);

            editButtonElem.classList.remove("hidden");
            deleteButtonElem.classList.remove("hidden");
            replyButtonElem.classList.add("hidden");
        }

        return commentElem
    });
}

function createRepliesContainerElem(commentData) {
    const repliesContainerElem = document.createElement("div")
    repliesContainerElem.classList.add("replies");
    repliesContainerElem.dataset.repliesid = commentData.id;
    return repliesContainerElem
}

function createReplyElem(replayData, currentUserData) {
    /**
     * Create a reply element
     * @param {object} replayData - Reply data JSON
     * @param {object} currentUserData - Current user data JSON
     */
    return createCommentElem(replayData, currentUserData).then((replyElem) => {
        replyElem.querySelector('[data-id="reply-to"]').textContent = `@${replayData.replyingTo}`
        return replyElem
    })
}

function createAddCommentElem(currentUserData) {
    /**
     * Create the add comment element
     * @param {object} currentUserData - Current user data JSON 
     */
    const filepath = "./elements/add_comment.html";
    return fetchTemplate(filepath).then((addCommentElem) => {
        const userIconElem = addCommentElem.querySelector('[data-id="user-icon"]')
        const textContentElem = addCommentElem.querySelector('[data-id="add-comment"]')
        const textAreaElem = addCommentElem.querySelector('[data-id="add-comment"]')
        const sendButtonElem = addCommentElem.querySelector('[data-id="send-button"]')

        // Set content
        userIconElem.src = currentUserData.image.png;
        sendButtonElem.dataset.active = false;
        sendButtonElem.classList.add("greyed-out");

        // Add event listener
        sendButtonElem.addEventListener("click", () => sendButtonSubmitCallback(currentUserData, textContentElem, textAreaElem, sendButtonElem, addCommentElem));

        // check there is text in the area for subitting
        textAreaElem.addEventListener("input", () => {
            if (textContentElem.value.length <= 0) {
                sendButtonElem.dataset.active = false;
                sendButtonElem.classList.add("greyed-out");
            } else {
                sendButtonElem.dataset.active = true;
                sendButtonElem.classList.remove("greyed-out");
            }
        });

        return addCommentElem
    })
}

function createAddReplyElem(commentData, currentUserData) {
    /**
     * Create an add reply element (when the user clicks on the reply button)
     * @param {object} commentData - Comment data JSON
     * @param {object} currentUserData - Current user data JSON
     */
    const filepath = "./elements/add_reply.html";
    return fetchTemplate(filepath).then((addReplyElem) => {
        // Set globals
        lastAddReply.lastAddReplyElem = addReplyElem;

        const userIconElem = addReplyElem.querySelector('[data-id="user-icon"]');
        const replyToElem = addReplyElem.querySelector('[data-id="reply-to"]');
        const textContentElem = addReplyElem.querySelector('[data-id="add-reply"] .text-content')
        const textAreaElem = addReplyElem.querySelector('[data-id="add-reply"]');
        const replyButtonElem = addReplyElem.querySelector('[data-id="reply-button"]');

        // Set content
        userIconElem.src = currentUserData.image.png;
        replyToElem.textContent = `@${commentData.user.username}`;
        replyButtonElem.dataset.active = false;
        replyButtonElem.classList.add("greyed-out");

        // Event listener for the reply button
        replyButtonElem.addEventListener('click', () => replyButtonSubmitCallback(commentData, currentUserData, textContentElem, textAreaElem, replyButtonElem));

        // Add custom behaviour for the fake textarea
        textContentElem.addEventListener('focus', () => {
            textAreaElem.classList.add("focused");
        });
        textContentElem.addEventListener('focusout', () => {
            textAreaElem.classList.remove("focused");
        });
        textAreaElem.addEventListener('click', () => {
            textContentElem.focus();
        });
        document.addEventListener('mouseup', () => {
            const selection = window.getSelection();
            if (selection && textAreaElem.contains(selection.anchorNode)) {
                textContentElem.focus();
            }
        });
        // Start focused
        setTimeout(() => textContentElem.focus(), 100);

        // check there is text in the area for submitting
        textAreaElem.addEventListener("input", () => {
            if (textContentElem.textContent.length <= 0) {
                replyButtonElem.dataset.active = false;
                replyButtonElem.classList.add("greyed-out");
            } else {
                replyButtonElem.dataset.active = true;
                replyButtonElem.classList.remove("greyed-out");
            }
        });

        return addReplyElem
    })
}

function createDeleteCommentModal(commentData, commentElem) {
    const filepath = "./elements/delete_comment_modal.html";
    return fetchTemplate(filepath).then((deleteCommentModalElem) => {
        const deleteButtonElem = deleteCommentModalElem.querySelector('[data-id="delete-button"]');
        deleteButtonElem.addEventListener('click', () => {
            deleteCommentModalElem.remove();
            deleteComment(commentData.id);
            saveState();
            commentElem.remove();

        });
        const cancelButtonElem = deleteCommentModalElem.querySelector('[data-id="cancel-button"]');
        cancelButtonElem.addEventListener('click', () => {
            deleteCommentModalElem.remove();
        });

        return deleteCommentModalElem
    })
}

// * * *
// Callbacks
// * * *

function replyCommentCallback(commentData, currentUserData, commentElem, buttonElem) {
    /** 
     * Callback when the user clicks on the reply button
     * @param {object} commentData - Comment data JSON
     * @param {object} currentUserData - Current user data JSON
     * @param {object} commentElem - Comment element
     * @param {object} buttonElem - Button element
     */
    if (buttonElem.dataset.active === "true") {
        buttonElem.dataset.active = false
        buttonElem.classList.add("greyed-out")
        if (lastAddReply.lastReplyButton) {
            lastAddReply.lastReplyButton.dataset.active = true;
            lastAddReply.lastReplyButton.classList.remove("greyed-out");
        }
        if (lastAddReply.lastAddReplyElem) {
            lastAddReply.lastAddReplyElem.remove();
            lastAddReply.lastAddReplyElem = null;
        }
        lastAddReply.lastReplyButton = buttonElem

        createAddReplyElem(commentData, currentUserData).then((addReplyElem) => {
            commentElem.insertAdjacentElement("afterend", addReplyElem);
        });
    }
}

function editCommentCallback(commentData, currentUserData, commentElem, buttonElem) {
    if (buttonElem.dataset.active === "false") {
        return
    }

    buttonElem.dataset.active = false
    buttonElem.classList.add("greyed-out")

    const replyToElem = commentElem.querySelector('[data-id="reply-to"]');
    const textContentElem = commentElem.querySelector('[data-id="text-content"]');
    const editCommentFormElem = commentElem.querySelector('[data-id="edit-comment"]');
    const editCommentTextareaElem = editCommentFormElem.querySelector('[data-id="edit-comment-textarea"]');
    const editCommentReplyToElem = editCommentFormElem.querySelector('[data-id="reply-to"]');
    const editCommentTextContentElem = editCommentFormElem.querySelector('[data-id="text-content"]');
    const editCommentUpdateButtonElem = editCommentFormElem.querySelector('[data-id="update-button"]');

    const currentReplyToTextContent = replyToElem.textContent;
    const currentCommentTextContent = textContentElem.textContent;

    // Set the comment to be edited
    replyToElem.classList.add("hidden");
    textContentElem.classList.add("hidden");
    editCommentFormElem.classList.remove("hidden");
    editCommentReplyToElem.textContent = currentReplyToTextContent;
    editCommentTextContentElem.textContent = currentCommentTextContent;

    // Event listener for the update button
    editCommentUpdateButtonElem.addEventListener('click', () => {
        findComment(commentData.id).content = editCommentTextContentElem.textContent
        if (editCommentReplyToElem.textContent.length > 0) {
            findComment(commentData.id).replyTo = editCommentReplyToElem.textContent
        }
        saveState()

        editCommentFormElem.classList.add("hidden");
        textContentElem.classList.remove("hidden");
        replyToElem.classList.remove("hidden");
        replyToElem.textContent = editCommentReplyToElem.textContent
        textContentElem.textContent = editCommentTextContentElem.textContent

        buttonElem.dataset.active = true
        buttonElem.classList.remove("greyed-out")
    });

    // Add custom behaviour for the fake textarea
    editCommentTextContentElem.addEventListener('focus', () => {
        editCommentTextareaElem.classList.add("focused");
    });
    editCommentTextContentElem.addEventListener('focusout', () => {
        editCommentTextareaElem.classList.remove("focused");
    });
    editCommentTextareaElem.addEventListener('click', () => {
        editCommentTextContentElem.focus();
    });
    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (selection && editCommentTextareaElem.contains(selection.anchorNode)) {
            editCommentTextContentElem.focus();
        }
    });
    // Start focused
    setTimeout(() => editCommentTextContentElem.focus(), 100);

    // check there is text in the area for submitting
    editCommentTextareaElem.addEventListener("input", () => {
        if (editCommentTextContentElem.textContent.length <= 0) {
            editCommentUpdateButtonElem.dataset.active = false;
            editCommentUpdateButtonElem.classList.add("greyed-out");
        } else {
            editCommentUpdateButtonElem.dataset.active = true;
            editCommentUpdateButtonElem.classList.remove("greyed-out");
        }
    });
}

function deleteCommentCallback(commentData, currentUserData, commentElem, buttonElem) {
    createDeleteCommentModal(commentData, commentElem).then((deleteCommentModalElem) => {
        $.body.appendChild(deleteCommentModalElem);
    });
}
function voteCommentCallback(commentData, currentUserData, commentElem, buttonElem) {
    const commentId = parseInt(commentElem.dataset.commentid)
    const vote = buttonElem.dataset.id === "upvote-button" ? "upvote" : "downvote";

    const upvoteButtonElem = commentElem.querySelector('[data-id="upvote-button"]');
    const downvoteButtonElem = commentElem.querySelector('[data-id="downvote-button"]');

    if (vote === "upvote") {
        if (upvoteButtonElem.dataset.voted === "false" && downvoteButtonElem.dataset.voted === "false") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) + 1
            console.log(commentId)
            let comment = findComment(commentId);
            comment.score += 1;
            comment.vote = "upvote";
            saveState();

            upvoteButtonElem.dataset.voted = "true";
            downvoteButtonElem.dataset.voted = "false";

            upvoteButtonElem.classList.add("voted")
            downvoteButtonElem.classList.remove("voted")
        } else if (upvoteButtonElem.dataset.voted === "false" && downvoteButtonElem.dataset.voted === "true") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) + 2
            let comment = findComment(commentId);
            comment.score += 2;
            comment.vote = "upvote";
            saveState();

            upvoteButtonElem.dataset.voted = "true";
            downvoteButtonElem.dataset.voted = "false";

            upvoteButtonElem.classList.add("voted")
            downvoteButtonElem.classList.remove("voted")
        } else if (upvoteButtonElem.dataset.voted === "true" && downvoteButtonElem.dataset.voted === "false") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) - 1
            let comment = findComment(commentId);
            comment.score -= 1;
            comment.vote = "none";
            saveState();

            upvoteButtonElem.dataset.voted = "false";
            downvoteButtonElem.dataset.voted = "false";

            upvoteButtonElem.classList.remove("voted");
            downvoteButtonElem.classList.remove("voted");
        }
    } else if (vote === "downvote") {
        if (downvoteButtonElem.dataset.voted === "false" && upvoteButtonElem.dataset.voted === "false") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) - 1
            let comment = findComment(commentId);
            comment.score -= 1;
            comment.vote = "downvote";
            saveState();

            downvoteButtonElem.dataset.voted = "true";
            upvoteButtonElem.dataset.voted = "false";

            downvoteButtonElem.classList.add("voted");
            upvoteButtonElem.classList.remove("voted");
        } else if (downvoteButtonElem.dataset.voted === "false" && upvoteButtonElem.dataset.voted === "true") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) - 2
            let comment = findComment(commentId);
            comment.score -= 2;
            comment.vote = "downvote";
            saveState();

            downvoteButtonElem.dataset.voted = "true";
            upvoteButtonElem.dataset.voted = "false";

            downvoteButtonElem.classList.add("voted");
            upvoteButtonElem.classList.remove("voted");
        } else if (downvoteButtonElem.dataset.voted === "true" && upvoteButtonElem.dataset.voted === "false") {
            commentElem.querySelector('[data-id="score-count"]').textContent = parseInt(commentElem.querySelector('[data-id="score-count"]').textContent) + 1
            let comment = findComment(commentId);
            comment.score += 1;
            comment.vote = "none";
            saveState();

            downvoteButtonElem.dataset.voted = "false";
            upvoteButtonElem.dataset.voted = "false";

            downvoteButtonElem.classList.remove("voted");
            upvoteButtonElem.classList.remove("voted");
        }
    }
}

async function replyButtonSubmitCallback(commentData, currentUserData, textContentElem, textAreaElem, replyButtonElem) {

    if (replyButtonElem.dataset.active === "false") {
        return
    }
    // if its a comment, add reply to the end of the replies array
    // if its a reply, search for the parent comment and add reply 
    // to the end of the replies array
    const parentComment = data.comments.find((comment) => {
        if (comment.id === commentData.id) {
            return comment
        } else {
            return comment.replies.find((reply) => {
                if (reply.id === commentData.id) {
                    return comment
                }
            });
        }
    })

    const newCommentData = {
        "id": maxId + 1,
        "content": textContentElem.textContent,
        "createdAt": "Now",
        "score": 0,
        "replyingTo": commentData.user.username,
        "user": {
            "image": {
                "png": currentUserData.image.png,
                "webp": currentUserData.image.webp,
            },
            "username": currentUserData.username,
        }
    }
    maxId++;

    parentComment.replies.push(newCommentData);
    saveState();

    // create new comment in the DOM
    let repliesElem = document.querySelector(`[data-repliesid="${parentComment.id}"]`);
    if (!repliesElem) {
        const repliesContainerElem = createRepliesContainerElem(commentData);
        const parentCommentElem = document.querySelector(`[data-commentid="${commentData.id}"]`);
        parentCommentElem.insertAdjacentElement("afterend", repliesContainerElem);
        repliesElem = repliesContainerElem;
    }
    const newCommentElem = await createReplyElem(newCommentData, currentUserData);
    repliesElem.insertAdjacentElement("beforeend", newCommentElem);

    // finally delete the reply form
    lastAddReply.lastAddReplyElem.remove();
    lastAddReply.lastAddReplyElem = null;
    lastAddReply.lastReplyButton.dataset.active = true;
    lastAddReply.lastReplyButton.classList.remove("greyed-out");
    lastAddReply.lastReplyButton = null;
}

async function sendButtonSubmitCallback(currentUserData, textContentElem, textAreaElem, sendButtonElem, addCommentElem) {

    if (sendButtonElem.dataset.active === "false") {
        return;
    }
    const newCommentData = {
        "id": maxId + 1,
        "content": textContentElem.value,
        "createdAt": "Now",
        "score": 0,
        "user": {
            "image": {
                "png": currentUserData.image.png,
                "webp": currentUserData.image.webp,
            },
            "username": currentUserData.username,
        }
    }
    maxId++;

    data.comments.push(newCommentData);
    saveState();

    const newCommentElem = await createCommentElem(newCommentData, currentUserData);
    addCommentElem.insertAdjacentElement("beforebegin", newCommentElem);
}