/* Sample usage of @app/feed APIs
   Demonstrates: create/get feed, getChat, participants, create/find/update/delete messages, pin/delete feed.
   This file is purely illustrative and uses a mocked `ctx` for examples.
*/
import {
  createFeed,
  getFeedById,
  getChat,
  getOrCreateParticipant,
  findFeedParticipants,
  createFeedMessage,
  findFeedMessages,
  updateFeedMessage,
  deleteFeedMessage,
  setFeedPinnedMessage,
  deleteFeed,
  createOrUpdateFeedParticipant,
  
} from '@app/feed';

async function runExamples() {
  let feedOperationResult: any = '';

  try {
    // 1) Create a feed
    const feed = await createFeed(ctx, {
      title: 'Demo feed',
      inboxSubjectId: 'demo-subject',
      inboxUrl: 'https://example.com/inbox',
    } as any);
    feedOperationResult += `Created feed: ${JSON.stringify(feed)}\n\n`;

    // 2) Get feed by id (uid)
    const fetched = await getFeedById(ctx, feed.id);
    feedOperationResult += `Fetched feed: ${JSON.stringify(fetched)}\n\n`;

    // 3) Open chat view for feed
    const chat = await getChat(ctx, fetched);
    feedOperationResult += `Chat: ${JSON.stringify(chat)}\n\n`;

    // 4) Ensure a participant exists
    const participant = await createOrUpdateFeedParticipant(
      ctx,
      fetched,
      ctx.user,
    );
    feedOperationResult += `Participant: ${JSON.stringify(participant)}\n\n`;
    // 5) List participants
    const participants = await findFeedParticipants(ctx, fetched);
    feedOperationResult += `Participants: ${JSON.stringify(participants)}\n\n`;
    // 6) Post a message
    const message = await createFeedMessage(ctx, fetched, participant.userId, {
      text: 'Hello from sample-usage',
      type: 'Message',
    } as any);
    feedOperationResult += `Posted message: ${JSON.stringify(message)}\n\n`;
    // 7) Fetch recent messages (tail/head/around examples)
    const recent = await findFeedMessages(ctx, feed.id, {
      mode: 'tail',
      limit: 20,
    });
    ctx.account.log('Recent messages count:', recent.length);
    feedOperationResult += `Recent messages: ${JSON.stringify(recent)}\n\n`;

    // 8) Update the posted message
    const updated = await updateFeedMessage(ctx, fetched, message.id, {
      text: 'Edited text',
    });
    feedOperationResult += `Updated message text: ${updated.text}\n\n`;

    // 9) Pin the message
    await setFeedPinnedMessage(ctx, fetched, message.id);
    feedOperationResult += `Pinned message ${message.id}\n\n`;
    // 10) Delete the message
    await deleteFeedMessage(ctx, fetched, message.id);
    ctx.account.log('Deleted message', message.id);
    feedOperationResult += `Deleted message ${message.id}\n\n`;

    // 11) Cleanup: delete feed (if supported)
    const deletedFeed = await deleteFeed(ctx, fetched);
    feedOperationResult += `Deleted feed result: ${deletedFeed ? 'deleted' : 'not found'}\n\n`;
  } catch (error: any) {
    feedOperationResult += `Error during feed operations: ${JSON.stringify(error.message)}\n\n`;
    //throw error; // rethrow after logging
    return feedOperationResult;
  }
  return feedOperationResult;
}

app.get('/', async (ctx, req) => {
  return await runExamples();
});
