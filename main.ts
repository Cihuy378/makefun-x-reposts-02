// Entry program for makefun-x-reposts-02 (Node 22, standard library only).
//
// The entry itself is the X posts named in POSTS.json. This program has one
// job: hand POSTS.json to the gate by copying it, byte for byte, from the
// repository root into the output directory. It also sanity-checks the file
// first so a malformed list fails loudly here instead of at the gate.
//
// The grader runs this in a container where the repository sits at /bot and
// results go to /output. Outside the container, MAKEFUN_BOT_DIR and
// MAKEFUN_OUTPUT_DIR point at stand-ins:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// No network, no clock, no randomness: two runs write identical bytes.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_POSTS = 15;
const STATUS_URL = /^https?:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/[^/]+\/status\/\d+/;

const repoDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const sourcePath = join(repoDir, 'POSTS.json');

function fail(message: string): never {
  console.error(`POSTS.json: ${message}`);
  process.exit(1);
}

let raw: Buffer;
try {
  raw = readFileSync(sourcePath);
} catch (err) {
  fail(`cannot read ${sourcePath}: ${(err as Error).message}`);
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw.toString('utf8'));
} catch (err) {
  fail(`not valid JSON: ${(err as Error).message}`);
}

if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  fail('must be a JSON object of the form {"posts": [...]}');
}

const posts = (parsed as { posts?: unknown }).posts;
if (!Array.isArray(posts)) {
  fail('"posts" must be an array of post addresses');
}
if (posts.length > MAX_POSTS) {
  fail(`"posts" names ${posts.length} posts; at most ${MAX_POSTS} are allowed`);
}
const seenPosts = new Set<string>();
for (const post of posts) {
  if (typeof post !== 'string' || !STATUS_URL.test(post)) {
    fail(`"${String(post)}" is not an X status address`);
  }
  if (seenPosts.has(post)) {
    fail(`"${post}" is listed twice; each post may appear only once`);
  }
  seenPosts.add(post);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'POSTS.json'), raw);
