import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceText as text, referenceProblems } from '../../lib/messages/fixtures/referenceMessages.js';

// Every expected string is the wording of the pinboard feature and the router at 11f4e9e.

test('the reference file is valid for the pinboard and channel messages', () => {
  const ours = ({ message }) => message.startsWith('pinboard.') || message.startsWith('denied.');
  assert.deepEqual(referenceProblems.filter(ours), []);
});

test('the admin denial is the shared one', () => {
  assert.equal(text('denied.admin'), '❌ You do not have permission to use this command.');
});

test('the channel denial', () => {
  assert.equal(text('denied.channel'), '❌ This bot can only be used in specific channels.');
});

test('subcommand errors', () => {
  assert.equal(text('pinboard.missingSubcommand'), '❌ Missing pinboard subcommand.');
  assert.equal(text('pinboard.unknownSubcommand'), '❌ Unknown pinboard subcommand.');
});

test('setchannel', () => {
  assert.equal(text('pinboard.setChannel.missing'), '❌ Missing channel for pinboard target.');
  assert.equal(text('pinboard.setChannel.done', { channelId: '5' }), '📌 Pinboard channel set to <#5>.');
});

test('whitelist_add', () => {
  assert.equal(text('pinboard.whitelistAdd.missing'), '❌ Missing channel to whitelist.');
  assert.equal(text('pinboard.whitelistAdd.done', { channelId: '5' }), '✅ Added <#5> to the pinboard whitelist.');
});

test('whitelist_remove', () => {
  assert.equal(text('pinboard.whitelistRemove.missing'), '❌ Missing channel to remove.');
  assert.equal(text('pinboard.whitelistRemove.done', { channelId: '5' }), '✅ Removed <#5> from the pinboard whitelist.');
});

test('whitelist_list pieces', () => {
  assert.equal(text('pinboard.whitelist.target', { target: 'T' }), '📌 Pinboard channel: T\n');
  assert.equal(text('pinboard.whitelist.targetChannel', { channelId: '5' }), '<#5>');
  assert.equal(text('pinboard.whitelist.targetNotSet'), 'not set');
  assert.equal(text('pinboard.whitelist.channels', { items: [{ channelId: '1' }, { channelId: '2' }] }), 'Whitelisted channels:\n<#1>\n<#2>');
  assert.equal(text('pinboard.whitelist.channels', { items: [] }), 'Whitelist is empty.');
});

test('forcepin replies', () => {
  assert.equal(text('pinboard.forcepin.missingUrl'), '❌ Message URL is required.');
  assert.equal(
    text('pinboard.forcepin.invalidUrl'),
    '❌ Invalid message URL format. Right-click a message and select "Copy Message Link".'
  );
  assert.equal(text('pinboard.forcepin.noTarget'), '❌ Pinboard target channel not set.');
  assert.equal(text('pinboard.forcepin.done', { pinUrl: 'https://x' }), '✅ Force pinned message: https://x');
});

test('the forcepin failure takes no values, so it cannot show the error', () => {
  assert.equal(text('pinboard.forcepin.failed'), '❌ Failed to force pin.');
  assert.equal(text('pinboard.forcepin.failed', { error: 'secret' }), '❌ Failed to force pin.');
});
