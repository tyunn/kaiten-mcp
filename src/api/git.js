import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

function execGit(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function getCurrentBranch() {
  const result = await execGit('git rev-parse --abbrev-ref HEAD');
  return result.stdout.trim();
}

export async function createBranch(cardId, title) {
  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').substring(0, 50);
  const branchName = `feature/${cardId}-${sanitizedTitle}`;
  await execGit(`git checkout -b ${branchName}`);
  return branchName;
}

export async function checkoutBranch(cardId, title) {
  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').substring(0, 50);
  const branchName = `feature/${cardId}-${sanitizedTitle}`;
  await execGit(`git checkout ${branchName}`);
  return branchName;
}

export async function commitChanges(cardId, message) {
  const commitMessage = `[${cardId}] ${message}`;
  await execGit(`git commit -m "${commitMessage}"`);
}

export async function getCurrentChanges() {
  const result = await execGit('git status --short');
  return result.stdout.trim();
}

export async function getChangedFiles() {
  const result = await execGit('git diff --name-only');
  return result.stdout.trim().split('\n').filter(f => f);
}

export async function getUntrackedFiles() {
  const result = await execGit('git ls-files --others --exclude-standard');
  return result.stdout.trim().split('\n').filter(f => f);
}

export async function addAllFiles() {
  await execGit('git add .');
}

export async function pushBranch(branchName) {
  await execGit(`git push -u origin ${branchName}`);
}

export async function createPR(cardId, title) {
  console.error('PR creation requires GitHub CLI or manual creation');
  console.error(`Branch: feature/${cardId}-${title}`);
  console.error(`Card: ${cardId}`);
  console.error(`Title: ${title}`);
}

export async function isGitRepo() {
  try {
    await execGit('git rev-parse --git-dir');
    return true;
  } catch (error) {
    return false;
  }
}

export async function getRemoteUrl() {
  try {
    const result = await execGit('git config --get remote.origin.url');
    return result.stdout.trim();
  } catch (error) {
    return null;
  }
}
