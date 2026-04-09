#!/usr/bin/env node

/**
 * Auto-Merge Process - GitHub PR Auto-Merger
 * Uses GitHub GraphQL API to merge PRs when:
 * - All status checks pass (or are successful)
 * - No merge conflicts exist
 * - PR is in mergeable state
 */

import https from 'https';

const REPO_OWNER = 'executiveusa';
const REPO_NAME = 'optio';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable not set');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'Auto-Merge-bot/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.errors) {
            reject(new Error(`GraphQL error: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed.data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function findPRsReadyForMerge() {
  const query = `
    query($owner:String!, $name:String!) {
      repository(owner:$owner, name:$name) {
        pullRequests(first: 10, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            state
            mergeable
            mergeStateStatus
            commits(last: 1) {
              nodes {
                commit {
                  oid
                  status {
                    state
                    contexts {
                      state
                      context
                      description
                    }
                  }
                }
              }
            }
            reviewDecision
            author {
              login
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner: REPO_OWNER,
    name: REPO_NAME,
  };

  return graphql(query, variables);
}

async function mergePR(prNumber, commitHeadline) {
  const query = `
    mutation($input: MergePullRequestInput!) {
      mergePullRequest(input: $input) {
        pullRequest {
          number
          merged
          mergedAt
        }
      }
    }
  `;

  const variables = {
    input: {
      pullRequestId: prNumber,
      commitHeadline: commitHeadline,
      mergeMethod: 'SQUASH',
    },
  };

  return graphql(query, variables);
}

async function deleteBranch(refName) {
  const query = `
    mutation($input: DeleteRefInput!) {
      deleteRef(input: $input) {
        clientMutationId
      }
    }
  `;

  const variables = {
    input: {
      refId: refName,
    },
  };

  return graphql(query, variables);
}

async function main() {
  console.log('🚀 Auto-Merge Process Started');
  console.log(`📦 Repository: ${REPO_OWNER}/${REPO_NAME}`);

  try {
    const data = await findPRsReadyForMerge();
    const prs = data.repository.pullRequests.nodes;

    console.log(`\n📊 Found ${prs.length} open PRs`);

    if (prs.length === 0) {
      console.log('✅ No PRs to process');
      return;
    }

    for (const pr of prs) {
      console.log(`\n🔍 Checking PR #${pr.number}: "${pr.title}"`);

      // Check mergeable status
      if (pr.mergeable !== 'MERGEABLE') {
        console.log(`  ⏭️  PR not mergeable (status: ${pr.mergeable})`);
        continue;
      }

      // Check merge state
      if (pr.mergeStateStatus !== 'CLEAN' && pr.mergeStateStatus !== 'BEHIND') {
        console.log(`  ⏭️  PR merge state not ready (status: ${pr.mergeStateStatus})`);
        continue;
      }

      // Check if last commit's checks all passed
      const commit = pr.commits.nodes[0]?.commit;
      if (!commit) {
        console.log(`  ⏭️  No commits found`);
        continue;
      }

      const status = commit.status;
      if (!status) {
        console.log(`  ⏭️  No status checks found`);
        continue;
      }

      if (status.state !== 'SUCCESS') {
        console.log(`  ⏭️  Checks not all passing (state: ${status.state})`);
        const failedChecks = status.contexts.filter(c => c.state !== 'SUCCESS');
        failedChecks.forEach(c => {
          console.log(`     - ${c.context}: ${c.state}`);
        });
        continue;
      }

      // All checks passed!
      console.log(`  ✅ All checks passed`);
      console.log(`  ✅ No merge conflicts`);
      console.log(`  ✅ PR is mergeable`);

      // Merge the PR
      console.log(`  🔄 Merging PR #${pr.number}...`);
      
      try {
        const mergeResult = await mergePR(pr.id, `${pr.author.login}: ${pr.title}`);
        if (mergeResult.mergePullRequest.merged) {
          console.log(`  ✨ PR #${pr.number} successfully merged!`);
        } else {
          console.log(`  ⚠️  PR merge returned but status unclear`);
        }
      } catch (e) {
        console.log(`  ❌ Failed to merge: ${e.message}`);
      }
    }

    console.log('\n✅ Auto-Merge Process Complete');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

await main();
